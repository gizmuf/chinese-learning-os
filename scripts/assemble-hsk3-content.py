"""Join independently authored HSK3 teaching rows and existing translations.
Run after reviewing all three batches; runtime never calls a translation service.
"""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
reference=json.loads((ROOT/'data/hsk3-reference.json').read_text())['entries']
rows=[]
for name in ['a','b','c']:
    rows.extend(json.loads((ROOT/f'data/hsk3-authoring-{name}.json').read_text()))
rows.sort(key=lambda row:row['number'])
assert [row['number'] for row in rows]==[entry['id'] for entry in reference]
fields=['english','sentence','translation','frMeaning','ruMeaning','frSentence','ruSentence']
for row,entry in zip(rows,reference):
    assert all(isinstance(row[field],str) and row[field].strip() and not any(c in row[field] for c in '\t\n|') for field in fields),entry
    assert entry['hanzi'] in row['sentence'],entry
(ROOT/'data/hsk3-authoring.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2)+'\n')
path=ROOT/'data/vocabulary-fr-ru.tsv'
existing=[line for line in path.read_text().splitlines() if not line.startswith('hsk3-')]
for row in rows:
    existing.append('\t'.join([f"hsk3-{row['number']:03d}"]+[row[field] for field in ['frMeaning','ruMeaning','frSentence','ruSentence']]))
path.write_text('\n'.join(existing)+'\n')
print('Assembled 500 HSK3 teaching entries and bilingual translations; older translation rows preserved.')
