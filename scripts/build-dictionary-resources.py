"""Build simplified lexical views from licensed sources, preserving raw records and IDS."""
import argparse,gzip,json,hashlib,re,collections
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('cedict');p.add_argument('characters',nargs='?');a=p.parse_args();root=Path(__file__).resolve().parents[1]
cedict=Path(a.cedict).read_bytes();text=gzip.decompress(cedict).decode();words=set();canonical=set();targets=collections.defaultdict(set);records=collections.defaultdict(list);raw_forms=set();definitions=collections.defaultdict(list)
for line in text.splitlines():
 m=re.match(r'^(\S+) (\S+) \[([^]]+)\] /',line)
 if not m:continue
 traditional,simplified,reading=m.groups();definitions[simplified].append(line.split('] /',1)[1]);canonical.add(simplified);targets[traditional].add(simplified);records[traditional].append((simplified,reading))
 for word in (traditional,simplified):
  if re.fullmatch(r'[\u3400-\u9fff\U00020000-\U0003134f]+',word):raw_forms.add(word)
 if re.fullmatch(r'[\u3400-\u9fff\U00020000-\U0003134f]+',simplified):words.add(simplified)
aliases={t:next(iter(v)) for t,v in targets.items() if t not in canonical and len(v)==1}
# Whole source names may retain a shared variant glyph (e.g. Acer 宏碁).
# Only an explicit, unambiguous variant-of record can override such a whole headword.
traditional_chars={t for t in aliases if len(t)==1}
variant_overrides={}
for word in words:
 if not any(c in traditional_chars for c in word):continue
 choices=[]
 for definition in definitions[word]:
  match=re.match(r'^(?:old |archaic )?variant of ([\u3400-\u9fff]+)(?:\|([\u3400-\u9fff]+))?\[',definition)
  if not match:break
  choices.append(match[2] or match[1])
 else:
  if choices and len(set(choices))==1 and choices[0]!=word and choices[0] in canonical:variant_overrides[word]=choices[0]
aliases.update(variant_overrides)
words=(words-set(variant_overrides))|set(variant_overrides.values())
ambiguous={}
for t,v in targets.items():
 if len(v)<2:continue
 readings=collections.defaultdict(set)
 for simplified,reading in records[t]:readings[reading].add(simplified)
 ambiguous[t]={'canonical':t in canonical,'readings':{k:sorted(v) for k,v in readings.items()}}
policy={'sourceSHA256':hashlib.sha256(cedict).hexdigest(),'aliases':aliases,'ambiguous':ambiguous,'maxAliasLength':max(map(len,aliases)),'sharedCharacters':sorted(traditional_chars & {c for word in words for c in word}),'canonicalWords':sorted(words),'maxWordLength':max(map(len,words))}
policy_bytes=(json.dumps(policy,ensure_ascii=False,separators=(',',':'),sort_keys=True)+'\n').encode();(root/'data/simplified-dictionary-policy.json').write_bytes(policy_bytes)
old=json.loads((root/'data/dictionary-sources.json').read_text())
if a.characters:
 chars={};raw=Path(a.characters).read_bytes()
 for line in raw.decode().splitlines():
  row=json.loads(line);chars[row['character']]={k:row[k] for k in ['definition','pinyin','radical','decomposition'] if row.get(k)}
 character_meta={**old['characters'],'sha256':hashlib.sha256(raw).hexdigest(),'characters':len(chars)}
else:
 chars=json.loads(gzip.decompress((root/'public/dictionary/characters.json.gz').read_bytes()));character_meta=old['characters']
for filename,data in [('headwords.json.gz',sorted(words)),('characters.json.gz',chars)]:
 body=gzip.compress(json.dumps(data,ensure_ascii=False,separators=(',',':')).encode(),compresslevel=9,mtime=0);(root/'public/dictionary'/filename).write_bytes(body);print(filename,len(body))
meta={**old,'cedict':{**old['cedict'],'sha256':hashlib.sha256(cedict).hexdigest(),'headwords':len(words),'rawHeadwordForms':len(raw_forms),'simplifiedOnly':True,'policySHA256':hashlib.sha256(policy_bytes).hexdigest()},'characters':character_meta,'changes':'Canonical simplified Han-only headwords; exact whole-entry aliases and reading-aware ambiguous aliases derived from pinned CC-CEDICT. Raw source and factual modern IDS remain unchanged. No curriculum identities added.'}
(root/'data/dictionary-sources.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('simplified headwords',len(words),'exact aliases',len(aliases),'ambiguous aliases',len(ambiguous))
