"""Generate only missing fixed classroom readings with the established Xiaoxiao process."""
import asyncio,hashlib,json,os,subprocess
from pathlib import Path
import edge_tts
VOICE='zh-CN-XiaoxiaoNeural';RATE='-10%'
root=Path('resources/lesson12/audio');root.mkdir(parents=True,exist_ok=True)
d=json.loads(Path('data/lesson12/content.json').read_text());out=Path('data/lesson12/audio.json');result=json.loads(out.read_text()) if out.exists() else {}
cache={}
for p in [Path('data/practice-recordings.json')]:
 for k,r in json.loads(p.read_text()).items():cache[r['text']]={'source':'/api/practice-recording?file='+k,'sha256':r['sha256'],'bytes':r['bytes'],'text':r['text'],'reused':True}
for name in ['lesson11','lesson10','lesson09','lesson08','lesson07']:
 p=Path('data')/name/'audio-reuse.json'
 if p.exists():
  for r in json.loads(p.read_text()).values():
   if r.get('text') and r.get('source'):cache.setdefault(r['text'],r)
# Reuse exact approved local Xiaoxiao clips before any network request.
for manifest in Path('public').rglob('manifest.json'):
 try:
  m=json.loads(manifest.read_text())
  if m.get('voice')!=VOICE:continue
  for r in m.get('recordings',[]):
   p=manifest.parent/r.get('file','')
   if not r.get('text') or not p.is_file():continue
   b=p.read_bytes();sha=hashlib.sha256(b).hexdigest()
   if sha!=r.get('sha256'):continue
   cache.setdefault(r['text'],{'text':r['text'],'source':'/'+str(p.relative_to('public')),'sha256':sha,'bytes':len(b),'reused':True,'voice':VOICE})
 except (ValueError,TypeError):continue
async def main():
 for row in d['words']+d['sentences']:
  text=row['hanzi'];key=hashlib.sha256(text.encode()).hexdigest()
  if row['id'] in result:continue
  if text in cache:r=cache[text]
  else:
   p=root/(key+'.mp3')
   if not p.exists():
    temp=p.with_suffix('.part')
    for attempt in range(3):
     try:
      await asyncio.wait_for(edge_tts.Communicate(text,VOICE,rate=RATE).save(str(temp)),75);assert temp.stat().st_size>1000;temp.replace(p);break
     except Exception:
      if attempt==2:raise
      await asyncio.sleep(2*(attempt+1))
   subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],check=True,capture_output=True)
   b=p.read_bytes();r={'text':text,'source':'/api/lesson12-asset?file=audio-'+key,'path':str(p),'sha256':hashlib.sha256(b).hexdigest(),'bytes':len(b),'voice':VOICE,'rate':RATE,'synthetic':True}
   cache[text]=r
  result[row['id']]=r;temp=out.with_suffix('.tmp');temp.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');temp.replace(out);print(len(result),'/',len(d['words'])+len(d['sentences']),flush=True)
asyncio.run(main())
