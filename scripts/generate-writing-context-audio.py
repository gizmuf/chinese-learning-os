import asyncio,json,shutil,hashlib,subprocess
from pathlib import Path
import edge_tts
out=Path('public/writing-context/audio');out.mkdir(parents=True,exist_ok=True);voice='zh-CN-XiaoxiaoNeural';rate='-10%'
data=json.load(open('data/writing-character-context.json'));cache={}
for p in Path('public').rglob('manifest.json'):
 try:m=json.loads(p.read_text())
 except Exception:continue
 if m.get('voice')==voice and m.get('generationRate')==rate:
  for r in m.get('recordings',[]):
   src=p.parent/r['file']
   if src.exists() and hashlib.sha256(src.read_bytes()).hexdigest()==r.get('sha256'):cache[r['text']]=src
rows=[]
async def main():
 for c in data['characters']:
  dest=out/Path(c['audio']).name
  if c['text'] in cache:shutil.copyfile(cache[c['text']],dest)
  else:await edge_tts.Communicate(c['text'],voice,rate=rate).save(str(dest))
  result=subprocess.run(['ffmpeg','-v','error','-i',str(dest),'-f','null','-'],capture_output=True);assert result.returncode==0
  rows.append({'text':c['text'],'file':dest.name,'sha256':hashlib.sha256(dest.read_bytes()).hexdigest()})
 (out/'manifest.json').write_text(json.dumps({'voice':voice,'generationRate':rate,'recordings':rows},ensure_ascii=False,indent=2)+'\n');print('Verified',len(rows),'writing context clips')
asyncio.run(main())
