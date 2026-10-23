"""Authoring only. Same Xiaoxiao voice/rate as earlier course recordings.
Only authored lesson text is sent to the speech service. No student data.
"""
import asyncio,hashlib,json,subprocess,shutil
from pathlib import Path
import edge_tts
VOICE='zh-CN-XiaoxiaoNeural';RATE='-10%';OUT=Path('public/course04/audio')
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def valid(p):return p.exists() and p.stat().st_size>1000 and subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True).returncode==0
async def main():
    data=json.loads(Path('data/lesson04/content.json').read_text());OUT.mkdir(parents=True,exist_ok=True)
    cache={}
    for manifest in Path('public').rglob('manifest.json'):
        try:m=json.loads(manifest.read_text())
        except Exception:continue
        if m.get('voice')!=VOICE or m.get('generationRate')!=RATE:continue
        for r in m.get('recordings',[]):
            p=manifest.parent/r['file']
            if p.exists() and digest(p)==r.get('sha256') and not r.get('pronunciationContext'):cache[r['text']]=p
    rows=[];sem=asyncio.Semaphore(3)
    async def one(v):
        async with sem:
            text=v['hanzi'];ident='course04-'+v['id'];dest=OUT/(ident+'-word.mp3')
            cached=cache.get(text)
            if cached and valid(cached):
                if cached!=dest:shutil.copyfile(cached,dest)
            else:
                temp=dest.with_suffix('.pending.mp3')
                for attempt in range(3):
                    try:
                        await asyncio.wait_for(edge_tts.Communicate(text,VOICE,rate=RATE).save(str(temp)),timeout=45)
                        if not valid(temp):raise ValueError('Invalid audio '+ident)
                        temp.replace(dest);break
                    except Exception:
                        if attempt==2:raise
                        await asyncio.sleep(2*(attempt+1))
            cache[text]=dest
            for kind in ['word','sentence']:
                target=OUT/(ident+'-'+kind+'.mp3')
                if target!=dest:shutil.copyfile(dest,target)
                rows.append(dict(itemId=ident,kind=kind,text=text,file=target.name,sha256=digest(target)))
            # Atomic checkpoint makes an interrupted generation resumable.
            tmp=OUT/'manifest.pending';tmp.write_text(json.dumps(dict(voice=VOICE,generationRate=RATE,provider='Microsoft Edge Read Aloud via edge-tts',recordings=sorted(rows,key=lambda r:r['file'])),ensure_ascii=False,indent=2)+'\n');tmp.replace(OUT/'manifest.json')
            print('Verified',ident,flush=True)
    await asyncio.gather(*(one(v) for v in data['terms']+data['sentences']))
asyncio.run(main())
