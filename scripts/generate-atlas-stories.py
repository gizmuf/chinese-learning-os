"""Authoring only: send the checked-in teaching captions to Edge Read Aloud.
No student data or runtime voice service. Run export-atlas-stories.mjs first.
"""
import asyncio,hashlib,json
from pathlib import Path
import edge_tts
async def main():
 rows=json.loads(Path('/tmp/chinese-atlas-build/story-narration.json').read_text());target=Path('public/atlas/stories');target.mkdir(parents=True,exist_ok=True)
 sem=asyncio.Semaphore(3)
 async def one(row):
  async with sem:
   path=target/row['file']
   await edge_tts.Communicate(row['text'],row['voice'],rate='-5%').save(str(path))
   assert path.stat().st_size>1000
   return {**row,'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
 records=await asyncio.gather(*(one(row) for row in rows))
 (target/'manifest.json').write_text(json.dumps({'provider':'Microsoft Edge Read Aloud via edge-tts','edgeTtsVersion':edge_tts.__version__,'generationRate':'-5%','recordings':records},ensure_ascii=False,indent=2)+'\n')
 print('Generated',len(records),'localized narration files')
asyncio.run(main())
