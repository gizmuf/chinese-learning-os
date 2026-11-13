"""Generate bundled Mandarin recordings; resume verified files after interruption.
Requires edge-tts in an isolated authoring environment. Never runs in the browser.
Only checked-in lesson text is sent to the speech provider, never student data.
"""
import argparse, asyncio, hashlib, json, shutil
from pathlib import Path
import edge_tts

CONTEXTS={"hsk1-287":"一只。", "hsk1-108":"好了", "hsk2-332":"说得好", "hsk2-333":"高兴地说", "hsk2-351":"我吃过了", "hsk2-367":"老师教我们中文", "hsk2-490":"门开着", "hsk3-583":"得一分", "hsk3-587":"我得走了", "hsk3-678":"请还我书", "hsk3-875":"我为大家做饭", "hsk3-968":"孩子长高了"}

async def contextual_audio(text, context, voice, rate, dest):
    source=dest.with_suffix(".context.mp3"); boundaries=[]
    with source.open("wb") as audio:
        async for chunk in edge_tts.Communicate(context,voice,rate=rate,boundary="WordBoundary").stream():
            if chunk["type"]=="audio":audio.write(chunk["data"])
            elif chunk["type"]=="WordBoundary" and chunk["text"]==text:boundaries.append(chunk)
    if len(boundaries)!=1:raise ValueError("Ambiguous pronunciation context: "+text)
    boundary=boundaries[0]
    process=await asyncio.create_subprocess_exec("ffmpeg","-v","error","-y","-i",str(source),"-ss",str(boundary["offset"]/10_000_000),"-t",str(boundary["duration"]/10_000_000),"-codec:a","libmp3lame","-q:a","3","-f","mp3",str(dest),stdout=asyncio.subprocess.DEVNULL,stderr=asyncio.subprocess.PIPE)
    _,error=await process.communicate()
    if process.returncode:raise RuntimeError(error.decode())
    source.unlink()

def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
async def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--content',required=True)
    parser.add_argument('--output',default='public/audio')
    parser.add_argument('--voice',default='zh-CN-XiaoxiaoNeural')
    parser.add_argument('--rate',default='-10%')
    parser.add_argument('--concurrency',type=int,default=3)
    args=parser.parse_args()
    items=json.loads(Path(args.content).read_text())
    target=Path(args.output);target.mkdir(parents=True,exist_ok=True)
    manifest_path=target/'manifest.json'
    old=json.loads(manifest_path.read_text()) if manifest_path.exists() else {}
    records={};texts={}
    if old.get('voice')==args.voice and old.get('generationRate')==args.rate:
        for record in old.get('recordings',[]):
            file=target/record['file']
            if file.is_file() and file.stat().st_size>=1000 and digest(file)==record['sha256']:
                records[record['file']]=record;texts[record['text']]=file
    wanted={f"{item['id']}-{suffix}.mp3" for item in items for suffix in ['word','sentence']}
    def save():
        manifest={'voice':args.voice,'language':'zh-CN','generationRate':args.rate,'provider':'Microsoft Edge Read Aloud via edge-tts','edgeTtsVersion':edge_tts.__version__,'recordings':sorted([r for f,r in records.items() if f in wanted],key=lambda r:r['file'])}
        scratch=manifest_path.with_suffix('.tmp');scratch.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n');scratch.replace(manifest_path)
    semaphore=asyncio.Semaphore(max(1,min(args.concurrency,6)))
    async def generate(item,field,suffix):
        text=item[field];filename=f"{item['id']}-{suffix}.mp3"
        if not all(c.isascii() and (c.isalnum() or c in '-_') for c in item['id']):raise ValueError('Unsafe vocabulary ID')
        dest=target/filename
        context=CONTEXTS.get(item['id']) if field=='hanzi' else None
        if filename in records and records[filename]['text']==text and records[filename].get('pronunciationContext')==context:return
        async with semaphore:
            cached=texts.get(text)
            if cached and cached!=dest and not context:
                shutil.copyfile(cached,dest)
            else:
                scratch=dest.with_suffix('.part')
                for attempt in range(5):
                    try:
                        if context:
                            await asyncio.wait_for(contextual_audio(text,context,args.voice,args.rate,scratch),timeout=90)
                        else:
                            await asyncio.wait_for(edge_tts.Communicate(text,args.voice,rate=args.rate).save(str(scratch)),timeout=90)
                        if scratch.stat().st_size<1000:raise ValueError('Empty speech output')
                        scratch.replace(dest);break
                    except Exception:
                        if attempt==4:raise
                        await asyncio.sleep(3*(attempt+1))
            records[filename]={'itemId':item['id'],'kind':suffix,'text':text,'file':filename,'sha256':digest(dest)}
            if context:records[filename]['pronunciationContext']=context
            texts[text]=dest;save()
            print(f"Ready {len(records)}/{len(wanted)}: {filename}",flush=True)
    await asyncio.gather(*(generate(item,field,suffix) for item in items for field,suffix in [('hanzi','word'),('sentence','sentence')]))
    save();print(f"Complete: {len(wanted)} recordings",flush=True)

if __name__=='__main__':asyncio.run(main())
