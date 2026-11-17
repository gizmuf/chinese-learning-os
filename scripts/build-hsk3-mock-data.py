"""Package the authored task banks; audio is rendered separately."""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'resources/hsk3-mock'

def rows(name, directory=source):
    with (directory / f'{name}.tsv').open(encoding='utf-8') as handle:
        return list(csv.reader(handle, delimiter='|'))

def save(name, data):
    (root / 'data' / f'{name}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

counts = {'listening': 30, 'reading': 30, 'writing': 10}
for form in ('hsk3-mock', 'hsk3-mock-b'):
    bank = {name: rows(name, root / 'resources' / form) for name in counts}
    for name, count in counts.items():
        assert len(bank[name]) == count, (form, name)
    save(form, bank)
grammar = []
for level, group, rule, example, pinyin, meaning, prompt, *options in rows('grammar'):
    assert len(options) == 3 and len(set(options)) == 3 and prompt.count('___') == 1
    grammar.append([int(level), int(group), rule, example, pinyin, meaning, prompt, options])
assert len(grammar) == 46
save('hsk-grammar-supplements', grammar)
