"""Small authored comparison pilot. No student content is sent to the voice provider."""
import asyncio, hashlib, importlib.util, json, shutil, subprocess
from pathlib import Path
import edge_tts

VOICE='zh-CN-XiaoxiaoNeural'; RATE='-10%'
OUT=Path('public/often-confused/audio')
CONTEXTS={'all':'我们都去。','fall':'杯子倒了。'}
spec=importlib.util.spec_from_file_location('existing_audio',Path(__file__).with_name('generate-audio.py'))
existing_audio=importlib.util.module_from_spec(spec);spec.loader.exec_module(existing_audio)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def valid(p):return p.exists() and p.stat().st_size>1000 and subprocess.run(['ffmpeg','-v','error','-i',str(p),'-f','null','-'],capture_output=True).returncode==0
async def main():
 OUT.mkdir(parents=True,exist_ok=True);manifest=OUT/'manifest.json';rows={};cache={}
 if manifest.exists():rows={r['file']:r for r in json.loads(manifest.read_text())['recordings']}
 for path in Path('public').rglob('manifest.json'):
  try:m=json.loads(path.read_text())
  except Exception:continue
  if m.get('voice')!=VOICE or m.get('generationRate')!=RATE:continue
  for r in m.get('recordings',[]):
   p=path.parent/r['file']
   if p.exists() and sha(p)==r.get('sha256') and not r.get('pronunciationContext'):cache[r['text']]=p
 def save():
  payload={'voice':VOICE,'generationRate':RATE,'provider':'Microsoft Edge Read Aloud via edge-tts','recordings':sorted(rows.values(),key=lambda r:r['file'])}
  pending=manifest.with_suffix('.pending.json');pending.write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n');pending.replace(manifest)
 sem=asyncio.Semaphore(3)
 async def one(item,kind):
  text=item['hanzi' if kind=='word' else 'sentence'];name=item['id']+'-'+kind+'.mp3';dest=OUT/name;context=CONTEXTS.get(item['id']) if kind=='word' else None
  old=rows.get(name)
  if old and old['text']==text and old.get('pronunciationContext')==context and valid(dest) and sha(dest)==old['sha256']:return
  async with sem:
   cached=cache.get(text)
   if not context and cached and valid(cached):
    if cached!=dest:shutil.copyfile(cached,dest)
   else:
    pending=dest.with_suffix('.pending.mp3')
    for attempt in range(3):
     try:
      if context:await asyncio.wait_for(existing_audio.contextual_audio(text,context,VOICE,RATE,pending),timeout=90)
      else:await asyncio.wait_for(edge_tts.Communicate(text,VOICE,rate=RATE).save(str(pending)),timeout=60)
      if not valid(pending):raise ValueError('Invalid clip '+name)
      pending.replace(dest);break
     except Exception:
      if attempt==2:raise
      await asyncio.sleep(2*(attempt+1))
   rows[name]={'id':item['id']+'-'+kind,'text':text,'file':name,'sha256':sha(dest)}
   if context:rows[name]['pronunciationContext']=context
   save()
 data=json.loads(Path('data/often-confused.json').read_text());items=data['items'];lookup=data.get('lookup',[])
 tasks=[(item,kind) for item in items for kind in ['word','sentence']]+[(item,'word') for item in lookup]
 results=await asyncio.gather(*(one(item,kind) for item,kind in tasks),return_exceptions=True)
 failures=[str(r) for r in results if isinstance(r,BaseException)];save()
 invalid=[r['file'] for r in rows.values() if not valid(OUT/r['file']) or sha(OUT/r['file'])!=r['sha256']]
 print(json.dumps({'recordings':len(rows),'failures':failures,'invalid':invalid},ensure_ascii=False),flush=True)
 if failures or invalid or len(rows)!=len(tasks):raise SystemExit(1)
if __name__=='__main__':asyncio.run(main())
