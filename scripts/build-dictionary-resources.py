"""Build licensed lookup resources, without adding curriculum identities."""
import argparse,gzip,json,hashlib,re
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('cedict');p.add_argument('characters');a=p.parse_args();root=Path(__file__).resolve().parents[1]
cedict=Path(a.cedict).read_bytes();text=gzip.decompress(cedict).decode();words=set()
for line in text.splitlines():
 if not line or line.startswith('#'):continue
 m=re.match(r'^(\S+) (\S+) \[',line)
 if m:
  for word in m.groups():
   if re.fullmatch(r'[\u3400-\u9fff\U00020000-\U0003134f]+',word):words.add(word)
chars={};raw=Path(a.characters).read_bytes()
for line in raw.decode().splitlines():
 row=json.loads(line);chars[row['character']]={k:row[k] for k in ['definition','pinyin','radical','decomposition'] if row.get(k)}
for filename,data in [('headwords.json.gz',sorted(words)),('characters.json.gz',chars)]:
 body=gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9,mtime=0);(root/'public/dictionary'/filename).write_bytes(body);print(filename,len(body))
meta={'cedict':{'name':'CC-CEDICT','url':'https://www.mdbg.net/chinese/dictionary?page=cedict','download':'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz','license':'CC BY-SA 4.0','licenseURL':'https://creativecommons.org/licenses/by-sa/4.0/','sha256':hashlib.sha256(cedict).hexdigest(),'headwords':len(words)},'characters':{'name':'Make Me a Hanzi','url':'https://github.com/skishore/makemeahanzi','license':'LGPL; existing notices in /licenses/','sha256':hashlib.sha256(raw).hexdigest(),'characters':len(chars)},'changes':'Han-only headword index and selected character fields, gzip-compressed. Modern structure, not historical etymology.'}
(root/'data/dictionary-sources.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
