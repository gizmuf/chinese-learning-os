"""Same pre-generated Xiaoxiao voice as the course; exact text cache only."""
import asyncio,hashlib,json,subprocess,shutil,sys
from pathlib import Path
import edge_tts
VOICE='zh-CN-XiaoxiaoNeural';RATE='-10%';OUT=Path('public/video-self-introduction/audio')
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def valid(p):return p.exists() and p.stat().st_size>1000 and subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True).returncode==0
async def main():
 OUT.mkdir(parents=True,exist_ok=True);cache={};rows={};manifest=OUT/'manifest.json'
 for path in Path('public').rglob('manifest.json'):
  try:m=json.loads(path.read_text())
  except Exception:continue
  if m.get('voice')!=VOICE or m.get('generationRate')!=RATE:continue
  for r in m.get('recordings',[]):
   p=path.parent/r['file']
   if p.exists() and sha(p)==r.get('sha256') and not r.get('pronunciationContext'):cache[r['text']]=p
 if manifest.exists():rows={r['id']:r for r in json.loads(manifest.read_text())['recordings']}
 chars=json.loads(Path('data/video-self-introduction/characters.json').read_text())['characters']
 tasks=[('char-'+format(ord(v['text']),'x'),v['text']) for v in chars]
 if '--characters-only' not in sys.argv:
  data=json.loads(Path('data/video-self-introduction/content.json').read_text());tasks += [(v['id'],v['hanzi']) for v in data['segments']]
 sem=asyncio.Semaphore(3);counts={'cached':0,'generated':0}
 def save():
  temporary=manifest.with_suffix('.pending.json');temporary.write_text(json.dumps({'voice':VOICE,'generationRate':RATE,'recordings':list(rows.values())},ensure_ascii=False,indent=2)+'\n');temporary.replace(manifest)
 async def one(ident,text):
  async with sem:
   dest=OUT/(ident+'.mp3');old=rows.get(ident)
   if old and old['text']==text and dest.exists() and sha(dest)==old['sha256']:return
   cached=cache.get(text)
   if cached and valid(cached):
    if cached!=dest:shutil.copyfile(cached,dest)
    counts['cached']+=1
   else:
    temp=dest.with_suffix('.pending.mp3')
    for attempt in range(3):
     try:
      await asyncio.wait_for(edge_tts.Communicate(text,VOICE,rate=RATE).save(str(temp)),timeout=45)
      if not valid(temp):raise ValueError('invalid clip '+ident)
      temp.replace(dest);counts['generated']+=1;break
     except Exception:
      if attempt==2:raise
      await asyncio.sleep(2*(attempt+1))
   rows[ident]={'id':ident,'text':text,'file':dest.name,'sha256':sha(dest)};cache[text]=dest;save()
   if len(rows)%40==0:print('Audio verified',len(rows),flush=True)
 await asyncio.gather(*(one(i,t) for i,t in tasks));save();print('Complete',len(rows),counts)
asyncio.run(main())
