#!/usr/bin/env python3
"""Extract HSK level facts from the pinned official 2025 syllabus; never alter study IDs."""
import argparse, gzip, hashlib, json, re
import pymupdf
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE='https://hsk.cn-bj.ufileos.com/3.0/%E6%96%B0%E7%89%88HSK%E8%80%83%E8%AF%95%E5%A4%A7%E7%BA%B21219.pdf'
SHA='ec74ce0439e837bbb15154be13e747ae798903b2fd3a331629df6c3b45504941'
LEVELS=['1','2','3','4','5','6','7-9']
def build(pdf):
 if hashlib.sha256(pdf.read_bytes()).hexdigest()!=SHA:raise ValueError('Unexpected syllabus revision')
 with pymupdf.open(pdf) as document:
  text='\f\n'.join(page.get_text() for page in document)
 words_section=text[text.index('词汇大纲\n---'):text.index('汉字大纲\n---')]
 rows=[(int(m[1]),m[2].split('（')[0],re.sub(r'\d+$','',m[3])) for m in re.finditer(r'(?m)^(\d+)\s*\n([1-6](?:（[^\n]*）)?|7-9)\s*\n([^\n]+)',words_section)]
 assert [r[0] for r in rows]==list(range(1,11001)), 'Incomplete or reordered vocabulary extraction'
 counts=[sum(r[1]==lv for r in rows) for lv in LEVELS]
 assert counts==[300,200,500,1000,1600,1800,5600],counts
 by_id={r[0]:r[2] for r in rows}
 for level in [1,2,3]:
  reference=json.loads((ROOT/f'data/hsk{level}-reference.json').read_text())
  assert all(by_id[r['id']]==r['hanzi'] for r in reference['entries']), 'Existing vocabulary references changed'
 words={lv:'|'.join(dict.fromkeys(r[2] for r in rows if r[1]==lv)) for lv in LEVELS}
 start=text.index('HSK（一级）认读字\n',text.index('汉字大纲\n---'))
 end=text.index('HSK（一级）~（二级）书写字\n',start)
 section=text[start:end];heads=list(re.finditer(r'HSK（([^）]+)）认读字\n',section));characters={}
 for i,m in enumerate(heads):
  block=section[m.end():heads[i+1].start() if i+1<len(heads) else len(section)]
  glyphs=re.findall(r'(\d+)\.\s*([\u3400-\u9fff])',block)
  assert [int(v[0]) for v in glyphs]==list(range(1,len(glyphs)+1)), 'Incomplete character table'
  characters[LEVELS[i]]=''.join(v[1] for v in glyphs)
 assert [len(characters[lv]) for lv in LEVELS]==[246,125,284,441,431,413,1148]
 assert len(set(''.join(characters.values())))==3088
 payload={'version':1,'words':words,'characters':characters}
 raw=json.dumps(payload,ensure_ascii=False,separators=(',',':')).encode()
 compressed=gzip.compress(raw,mtime=0)
 output=ROOT/'public/dictionary/hsk-levels-2025.json.gz';output.parent.mkdir(parents=True,exist_ok=True);output.write_bytes(compressed)
 meta={'edition':'HSK examination syllabus, November 2025','officialSource':SOURCE,'sourceSha256':SHA,'vocabularyEntries':11000,'recognitionCharacters':3088,'wordCounts':dict(zip(LEVELS,counts)),'recognitionCharacterCounts':{lv:len(characters[lv]) for lv in LEVELS},'asset':'/dictionary/hsk-levels-2025.json.gz','assetSha256':hashlib.sha256(compressed).hexdigest(),'wordPolicy':'Exact headword; homograph markers removed; levels refer to first introduction of each listed sense, not later part-of-speech extensions.','characterPolicy':'Official recognition-character tables, not inferred from containing words. HSK7-9 is one combined official table.'}
 (ROOT/'data/hsk-levels-source.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'vocabularyEntries':11000,'recognitionCharacters':3088,'bytes':len(compressed),'rawBytes':len(raw)}))
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('pdf',type=Path);build(parser.parse_args().pdf)
