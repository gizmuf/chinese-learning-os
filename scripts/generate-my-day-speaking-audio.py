"""Complete only missing My Day full sentences using the established Edge voice.
Run with edge-tts==7.3.1 in an authoring venv. No credentials or paid API used.
Verified files are checkpointed; a failed request stops without automatic retries.
"""
import asyncio,hashlib,json,os,ssl,subprocess
from pathlib import Path
import edge_tts
import edge_tts.communicate
VOICE='zh-CN-XiaoxiaoNeural';RATE='-10%'
manifest_path=Path('data/my-day-speaking-audio.json')
target=Path('public/audio/my-day-speaking')
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def duration(path):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)],text=True).strip())
async def main():
 if os.environ.get('SSL_CERT_FILE'):
  edge_tts.communicate._SSL_CTX=ssl.create_default_context(cafile=os.environ['SSL_CERT_FILE'])
 target.mkdir(parents=True,exist_ok=True)
 wanted=json.loads(Path('data/my-day-speaking-audio-pending.json').read_text())['texts']
 records=json.loads(manifest_path.read_text()).get('recordings',[]) if manifest_path.exists() else []
 def save():
  data={'status':'validated','provider':'Microsoft Edge Read Aloud via edge-tts','voice':VOICE,'generationRate':RATE,'edgeTtsVersion':edge_tts.__version__,'recordings':records}
  tmp=manifest_path.with_suffix('.tmp');tmp.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');tmp.replace(manifest_path)
 for row in wanted:
  text=row['hanzi'];key=hashlib.sha256((VOICE+'|'+RATE+'|'+text).encode()).hexdigest();dest=target/(key+'.mp3')
  existing=next((r for r in records if r['text']==text),None)
  if existing:
   assert dest.is_file() and existing['sha256']==sha(dest) and existing['validated']
   continue
  # Explicit optional single-text probe prepared by this same authoring session.
  probe=Path('/tmp/myday-xiaoxiao-probe.mp3')
  if text=='我也喜欢水果。' and probe.exists():dest.write_bytes(probe.read_bytes())
  else:
   scratch=dest.with_suffix('.part')
   await asyncio.wait_for(edge_tts.Communicate(text,VOICE,rate=RATE,proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')).save(str(scratch)),timeout=60)
   assert scratch.stat().st_size>1000
   scratch.replace(dest)
  length=duration(dest);assert length>0
  subprocess.run(['ffmpeg','-v','error','-i',str(dest),'-f','null','-'],check=True,capture_output=True)
  records.append({'text':text,'source':'/'+str(dest.relative_to('public')),'voice':VOICE,'generationRate':RATE,'sha256':sha(dest),'durationSeconds':length,'validated':True})
  save();print(f'Validated {len(records)}/{len(wanted)}',flush=True)
 assert len(records)==len(wanted)
asyncio.run(main())
