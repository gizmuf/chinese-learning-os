"""Fill exact missing Shuoshuo study audio; never alters the supplied transcript.
Run using edge-tts==7.3.1. No keys, Azure billing, Qwen or runtime synthesis.
Verified files are checkpointed; a failed synthesis stops without automatic retry.
"""
import asyncio,hashlib,json,os,ssl,subprocess
from pathlib import Path
import edge_tts
import edge_tts.communicate
VOICE='zh-CN-XiaoxiaoNeural';RATE='-10%';PROVIDER='Microsoft Edge Read Aloud via edge-tts'
manifest_path=Path('data/shuoshuo-morning-audio.json');target=Path('public/audio/shuoshuo')
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def duration(path):return float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(path)],text=True).strip())
async def main():
 if os.environ.get('SSL_CERT_FILE'):edge_tts.communicate._SSL_CTX=ssl.create_default_context(cafile=os.environ['SSL_CERT_FILE'])
 target.mkdir(parents=True,exist_ok=True);lesson=json.loads(Path('data/shuoshuo-morning.json').read_text());data=json.loads(manifest_path.read_text())
 rows=[('sentences',r['id'],r['hanzi']) for r in lesson['sentences']]+[('words',r['text'],r['text']) for r in lesson['practiceTargets']]
 cached={}
 for kind in ['words','sentences']:
  for clip in data[kind].values():
   path=Path('public'+clip['source'])
   if not path.is_file() or digest(path)!=clip['sha256']:raise ValueError('Existing recording failed validation; refusing to overwrite it')
   cached[clip['text']]=clip
 def save():
  data['generation']={'provider':PROVIDER,'voice':VOICE,'generationRate':RATE,'edgeTtsVersion':edge_tts.__version__,'sourceSha256':digest(Path('data/shuoshuo-morning.json')),'note':'Synthetic readings of supplied text, not verified original-video audio.'}
  scratch=manifest_path.with_suffix('.tmp');scratch.write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n');scratch.replace(manifest_path)
 generated=0
 for kind,key,text in rows:
  if key in data[kind]:
   assert data[kind][key]['text']==text
   continue
  if text in cached:clip=dict(cached[text])
  else:
   name=hashlib.sha256((VOICE+'|'+RATE+'|'+text).encode()).hexdigest();dest=target/(name+'.mp3')
   # Reconcile a completed uncheckpointed result before making a new request.
   if not dest.exists():
    scratch=dest.with_suffix('.part');await asyncio.wait_for(edge_tts.Communicate(text,VOICE,rate=RATE,proxy=os.environ.get('HTTPS_PROXY') or os.environ.get('HTTP_PROXY')).save(str(scratch)),timeout=75)
    assert scratch.stat().st_size>1000;scratch.replace(dest);generated+=1
   length=duration(dest);assert length>0
   subprocess.run(['ffmpeg','-v','error','-i',str(dest),'-f','null','-'],check=True,capture_output=True)
   clip={'source':'/'+str(dest.relative_to('public')),'text':text,'sha256':digest(dest),'provider':PROVIDER,'voice':VOICE,'generationRate':RATE,'durationSeconds':length,'synthetic':True,'validated':True}
   cached[text]=clip
  data[kind][key]=clip;save();print(f"Validated {len(data['sentences'])}/42 sentence references, {len(data['words'])}/40 words; new requests {generated}",flush=True)
 assert len(data['sentences'])==42 and len(data['words'])==40
 print('Complete; new synthesis requests:',generated,flush=True)
asyncio.run(main())
