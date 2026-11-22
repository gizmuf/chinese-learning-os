#!/usr/bin/env python3
"""Derived browsing-only HSK2025 index; never adds curriculum identities or reviewed etymology."""
import gzip,json,re,hashlib,importlib.util
from pathlib import Path
R=Path(__file__).resolve().parents[1]
h=json.loads(gzip.decompress((R/'public/dictionary/hsk-levels-2025.json.gz').read_bytes()))
chars=json.loads(gzip.decompress((R/'public/dictionary/characters.json.gz').read_bytes()))
old=json.loads((R/'data/hanzi-structure.json').read_text()); oldchars={r['hanzi'] for r in old['characters']}
spec=importlib.util.spec_from_file_location('ids',R/'scripts/build-hanzi-structure.py'); ids=importlib.util.module_from_spec(spec); spec.loader.exec_module(ids)
entries={}
def tone(m):
 s=m[1].replace('u:','ü').replace('v','ü').lower(); n=int(m[2]);
 if n in (0,5):return s
 pos=next((s.index(x) for x in ['a','e','ou'] if x in s),-1)
 if pos<0:pos=next((i for i in range(len(s)-1,-1,-1) if s[i] in 'aeiouü'),-1)
 return s if pos<0 else s[:pos]+{'a':'āáǎà','e':'ēéěè','i':'īíǐì','o':'ōóǒò','u':'ūúǔù','ü':'ǖǘǚǜ'}[s[pos]][n-1]+s[pos+1:]
for line in gzip.decompress((R/'resources/cc-cedict/cedict.txt.gz').read_bytes()).decode().splitlines():
 m=re.match(r'\S+ (\S+) \[([^]]+)\] /(.+)/$',line)
 if m:entries.setdefault(m[1],[]).append({'pinyin':re.sub(r'([a-züv:]+)([0-5])',tone,m[2],flags=re.I),'meaning':m[3].replace('/','; ')})
# HSK syllabus rows 7572 and 7793, absent from this CC-CEDICT snapshot.
# Readings follow the syllabus; the English glosses are authored for the catalogue.
supplements={
 '精彩纷呈':[{'pinyin':'jīngcǎi-fēnchéng','meaning':'full of highlights; one impressive moment after another'}],
 '口哨儿':[{'pinyin':'kǒushàor','meaning':'a whistle (a sound made with the lips)'}],
}
words=[]; missing=[]
for lv in ['4','5','6','7-9']:
 for w in h['words'][lv].split('|'):
  senses=entries.get(w) or supplements.get(w)
  if not senses:missing.append({'hanzi':w,'level':lv});continue
  words.append({'id':'hsk-browse:'+lv+':'+w,'hanzi':w,'pinyin':' / '.join(dict.fromkeys(s['pinyin'] for s in senses)),'meaning':' · '.join(dict.fromkeys(s['meaning'] for s in senses)),'level':lv})
if missing:raise ValueError(f'{len(missing)} official vocabulary entries are missing: {missing[:10]}')
parsed={}
for glyph,row in chars.items():
 try:
  _,leaves,unknown=ids.parse_ids(row.get('decomposition',''))
  parsed[glyph]=(leaves,unknown,not unknown)
 except (ids.IDSParseError,IndexError):parsed[glyph]=([],['unparsed'],False)
def expand(g,seen):
 out=[]
 for c in parsed.get(g,([],[],False))[0]:
  if c not in out:out.append(c)
  if c not in seen:
   for sub in expand(c,seen|{c}):
    if sub not in out:out.append(sub)
 return out
rows=[]
for lv in ['4','5','6','7-9']:
 for g in h['characters'][lv]:
  if g in oldchars:continue
  r=chars[g];leaves,unknown,complete=parsed[g]
  rows.append({'hanzi':g,'readings':r.get('pinyin',[]),'definition':r.get('definition',''),'decomposition':r.get('decomposition'),'radical':r.get('radical'),'leafComponents':leaves,'unresolvedComponents':unknown,'recursiveComponents':expand(g,{g}),'decompositionComplete':complete,'wordIds':[],'level':lv})
meta={'edition':'HSK examination syllabus, November 2025','hskSource':json.loads((R/'data/hsk-levels-source.json').read_text()),'dictionarySource':json.loads((R/'data/dictionary-sources.json').read_text()),'policy':'Browsing only. HSK membership is official; dictionary readings/English senses are not sense-to-level aligned. Headwords absent from CC-CEDICT use published syllabus readings and authored English glosses. 7-9 is a combined band. Modern IDS links are dataset-derived, not reviewed semantic/phonetic claims.','missingDictionaryEntries':missing}
out={'meta':meta,'words':words,'characters':rows}
(R/'data/hsk-browse-index.json').write_text(json.dumps(out,ensure_ascii=False,separators=(',',':'))+'\n')
print({'words':len(words),'characters':len(rows),'missing':missing})
