"""Pin new media to a published immutable asset commit; exclude them from Sites static package."""
import argparse,json,hashlib
from pathlib import Path
P=argparse.ArgumentParser();P.add_argument('--asset-commit',required=True);a=P.parse_args();assert len(a.asset_commit)==40 and all(c in '0123456789abcdef' for c in a.asset_commit)
files={}
for row in json.loads(Path('data/lesson12/audio.json').read_text()).values():
 if row.get('path'):
  key=row['source'].split('file=')[1];files[key]={k:row[k] for k in ['path','bytes','sha256']};files[key]['type']='audio/mpeg'
for rows,base in [('materials.json','pdf-'),('supplements.json','')]:
 for row in json.loads((Path('data/lesson12')/rows).read_text()):
  key=base+row['locale'] if base else row['id'];files[key]={k:row[k] for k in ['path','bytes','sha256','filename']};files[key]['type']='application/pdf'
for v in files.values():
 b=Path(v['path']).read_bytes();assert len(b)==v['bytes'] and hashlib.sha256(b).hexdigest()==v['sha256']
Path('data/lesson12/assets.json').write_text(json.dumps({'asset_commit':a.asset_commit,'files':files},ensure_ascii=False,indent=2)+'\n');print('verified',len(files),'files')
