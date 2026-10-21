"""Build the checked-in vocabulary from original teaching examples and HSK facts.
Authoring tool only: pip install pypinyin==0.55.0. No runtime dependency or network.
Do not change a starter ID or repurpose an HSK entry ID; saved reviews depend on them.
"""
import json,re
from pathlib import Path
from pypinyin import lazy_pinyin,Style,load_phrases_dict
# Common unstressed syllables are written without a tone mark.
load_phrases_dict({"教我们":[["jiāo"],["wǒ"],["men"]],"去过":[["qù"],["guo"]],"吃过":[["chī"],["guo"]],"不客气":[["bù"],["kè"],["qi"]],"不好意思":[["bù"],["hǎo"],["yì"],["si"]],"多少":[["duō"],["shao"]],"时候":[["shí"],["hou"]]})
ROOT=Path(__file__).resolve().parents[1]
def load(name):return json.loads((ROOT/'data'/name).read_text())
def rows(name):
    result={}
    for line in (ROOT/'data'/name).read_text().splitlines():
        if not line.strip():continue
        hanzi,lesson,english,sentence,translation=line.split('|')
        assert hanzi not in result,hanzi
        assert hanzi in sentence,(hanzi,sentence)
        result[hanzi]=(lesson,english,sentence,translation)
    return result
def pinyin(text):
    syllables=lazy_pinyin(text,style=Style.TONE,tone_sandhi=False)
    # Keep citation third tones; apply only the standard 一 / 不 changes.
    for i,syllable in enumerate(syllables[:-1]):
        following=syllables[i+1]
        fourth=any(c in following for c in "àèìòùǜ")
        if syllable=="bù" and fourth:syllables[i]="bú"
        if syllable=="yī" and (i==0 or syllables[i-1] not in ["dì","líng","shí","bǎi","qiān"]):
            if fourth:syllables[i]="yí"
            elif any(c in following for c in "āáǎēéěīíǐōóǒūúǔǖǘǚ"):syllables[i]="yì"
    value=' '.join(syllables)
    # Neutral suffix 儿 is rhotacization here, not the standalone noun ér.
    for syllable in ['diǎn','nǎ','nà','zhè','wán','tiáo','hái','huì']:
        value=value.replace(syllable+' ér',syllable+'r')
    value=re.sub(r'\s+([，。？！、：；])',r'\1',value)
    return value[0].upper()+value[1:]
reference=load('hsk1-reference.json')['entries'];lessons=rows('hsk1-lessons.tsv');bonus=rows('bonus-lessons.tsv')
assert len(reference)==300 and set(lessons)=={x['hanzi'] for x in reference}
items=load('starter-vocabulary.json');known={x['hanzi'] for x in items};entry_by_hanzi={x['hanzi']:x for x in reference}
for entry in reference:
    if entry['hanzi'] in known:continue
    h=entry['hanzi'];lesson,english,sentence,translation=lessons[h]
    items.append(dict(id=f"hsk1-{entry['id']:03d}",lesson=lesson,hanzi=h,pinyin=entry['pinyin'],english=english,sentence=sentence,sentencePinyin=pinyin(sentence),translation=translation));known.add(h)
for index,(h,(lesson,english,sentence,translation)) in enumerate(bonus.items(),1):
    assert h not in known,h
    items.append(dict(id=f'bonus-{index:02d}',lesson=lesson,hanzi=h,pinyin=pinyin(h).lower(),english=english,sentence=sentence,sentencePinyin=pinyin(sentence),translation=translation));known.add(h)
for item in items:
    if item['hanzi'] in entry_by_hanzi:item['hskEntry']=entry_by_hanzi[item['hanzi']]['id']
assert len(items)==320 and len({x['id'] for x in items})==320
for item in items:
    if item.get('hskEntry') is not None:item['hskLevel']=1
reference2=load('hsk2-reference.json')['entries']
study2={}
for line in (ROOT/'data/hsk2-lessons.tsv').read_text().splitlines():
    if not line.strip():continue
    number,lesson,english,sentence,translation=line.split('|')
    assert int(number) not in study2
    study2[int(number)]=(lesson,english,sentence,translation)
assert len(reference2)==200 and set(study2)=={e['id'] for e in reference2}
for entry in reference2:
    lesson,english,sentence,translation=study2[entry['id']]
    assert entry['hanzi'] in sentence,entry
    items.append(dict(id=f"hsk2-{entry['id']:03d}",lesson=lesson,hanzi=entry['hanzi'],pinyin=entry['pinyin'],english=english,sentence=sentence,sentencePinyin=pinyin(sentence),translation=translation,hskEntry=entry['id'],hskLevel=2))
assert len(items)==520 and len({x['id'] for x in items})==520
lesson_rows=[
 ('first','First conversations','Meet someone. Make a connection.','sage'),
 ('daily','Your everyday toolkit','Small words that open big conversations.','peach'),
 ('food','At the table','Order what you actually want.','yellow'),
 ('time','Time & plans','From today to next week.','blue'),
 ('family','Family & friends','Talk about the people in your life.','sage'),
 ('numbers','Numbers & money','Count, compare and ask the price.','yellow'),
 ('study','School & Chinese','Words for learning together.','blue'),
 ('places','Places & directions','Find your way and say where things are.','peach'),
 ('travel','Coming & going','Get around town and travel further.','sage'),
 ('home','Home & belongings','Make yourself at home.','yellow'),
 ('describe','How things are','Describe what you see and how you feel.','peach'),
 ('questions','Ask a question','Who, what, where and how.','blue'),
 ('weather','Weather & health','Talk about the weather and how you feel.','sage'),
 ('grammar','Little words, big meaning','Use particles and connect your thoughts.','yellow')]
lesson_data=[dict(id=i,title=t,subtitle=s,icon=f'{n:02d}',color=c) for n,(i,t,s,c) in enumerate(lesson_rows,1)]
assert all(x['lesson'] in {l['id'] for l in lesson_data} for x in items)
head='''// Generated by scripts/build-hsk-content.py; edit the authoring files in data/.
// Existing item IDs stay stable so historical learning events remain valid.
export type Item = {
  id: string; lesson: string; hanzi: string; pinyin: string; english: string;
  sentence: string; sentencePinyin: string; translation: string; hskEntry?: number; hskLevel?: 1 | 2;
};
'''
text=head+'export const lessons = '+json.dumps(lesson_data,ensure_ascii=False,indent=2)+';\n'
text+='export const curriculum = { total: 520, hsk1: 300, hsk2: 200, extras: 20, edition: "HSK 2025 syllabus" };\n'
text+='export const items: Item[] = '+json.dumps(items,ensure_ascii=False,indent=2)+';\n'
text+='''export type Skill = "meaning" | "listening" | "writing";
export type Mode = "watch" | "trace" | "copy" | "recall";
export const skillNames = { meaning: "Recognition", listening: "Listening", writing: "Writing" };
function searchKey(value: string) {
  return value.normalize("NFD").replace(/\\p{M}/gu, "").toLowerCase().replace(/[\\s'’]/g, "");
}
export type StudyLevel = "hsk1" | "hsk2" | "bonus";
export const levelNames = { hsk1: "HSK1", hsk2: "HSK2", bonus: "Everyday extras" };
export function isInLevel(item: Item, level: StudyLevel) {
  return level === "bonus" ? item.hskLevel === undefined : item.hskLevel === (level === "hsk1" ? 1 : 2);
}
export function matchesItem(item: Item, query: string, lesson: string) {
  const group = lesson === "all" || (lesson === "hsk1" || lesson === "hsk2" || lesson === "bonus" ? isInLevel(item, lesson) : item.lesson === lesson);
  const needle = searchKey(query);
  return group && [item.hanzi, item.pinyin, item.english].some(value => searchKey(value).includes(needle));
}
'''
(ROOT/'app/content.ts').write_text(text)
print(f'Generated {len(items)} items, 300 HSK1 + 200 HSK2 + 20 extras, in {len(lesson_data)} lessons. Preserved all 32 starter IDs.')
