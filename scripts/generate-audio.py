"""Generate bundled Mandarin recordings before deployment; never runs in the browser.
Requires edge-tts in a separate Python environment. No student data or API key is used.
"""
import argparse, asyncio, hashlib, json
from pathlib import Path
import edge_tts

async def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('--content',required=True)
    parser.add_argument('--output',default='public/audio')
    parser.add_argument('--voice',default='zh-CN-XiaoxiaoNeural')
    parser.add_argument('--rate',default='-10%')
    args=parser.parse_args()
    items=json.loads(Path(args.content).read_text())
    target=Path(args.output);target.mkdir(parents=True,exist_ok=True)
    semaphore=asyncio.Semaphore(3)
    records=[]
    async def generate(item,field,suffix):
        text=item[field]; filename=f"{item['id']}-{suffix}.mp3"
        if not all(c.isascii() and (c.isalnum() or c in '-_') for c in item['id']):
            raise ValueError('Unsafe vocabulary ID')
        dest=target/filename
        async with semaphore:
            for attempt in range(3):
                try:
                    await asyncio.wait_for(edge_tts.Communicate(text,args.voice,rate=args.rate).save(str(dest)),timeout=90)
                    if dest.stat().st_size<1000:raise ValueError('Empty speech output')
                    break
                except Exception:
                    if attempt==2:raise
                    await asyncio.sleep(2*(attempt+1))
        records.append({'itemId':item['id'],'kind':suffix,'text':text,'file':filename,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
        print(f"Generated {filename}",flush=True)
    await asyncio.gather(*(generate(item,field,suffix) for item in items for field,suffix in [('hanzi','word'),('sentence','sentence')]))
    manifest={'voice':args.voice,'language':'zh-CN','generationRate':args.rate,'provider':'Microsoft Edge Read Aloud via edge-tts','edgeTtsVersion':edge_tts.__version__,'recordings':sorted(records,key=lambda r:r['file'])}
    (target/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f"Ready: {len(records)} recordings",flush=True)

asyncio.run(main())
