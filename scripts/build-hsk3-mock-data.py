"""Package the authored task banks; audio is rendered separately."""
import csv
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
source = root / 'resources/hsk3-mock'

def rows(name):
    with (source / f'{name}.tsv').open() as handle:
        return list(csv.reader(handle, delimiter='|'))

def save(name, data):
    (root / 'data' / f'{name}.json').write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')

bank = {name: rows(name) for name in ('listening', 'reading', 'writing')}
for name, count in (('listening', 30), ('reading', 30), ('writing', 10)):
    assert len(bank[name]) == count, name
save('hsk3-mock', bank)
grammar = []
for level, group, rule, example, pinyin, meaning, prompt, *options in rows('grammar'):
    assert len(options) == 3 and len(set(options)) == 3 and prompt.count('___') == 1
    grammar.append([int(level), int(group), rule, example, pinyin, meaning, prompt, options])
assert len(grammar) == 46
save('hsk-grammar-supplements', grammar)
