import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const read=path=>JSON.parse(readFileSync(path,'utf8'));
const lessons=['time-dates','movement-directions','shang'].map(id=>read('data/reference-lessons/'+id+'.json'));
const teaching=read('data/reference-lessons/teaching.json'),audio=read('data/reference-lessons/audio-reuse.json');
test('teaching comparisons cover all existing topics without changing referenced text or readings',()=>{
 assert.deepEqual(Object.keys(teaching).sort(),lessons.flatMap(l=>l.topics.map(t=>t.id)).sort());
 const entries=new Map(lessons.flatMap(l=>[...l.terms,...l.examples]).map(e=>[e.id,e]));
 for(const topic of Object.values(teaching)){
  assert.ok(topic.title&&topic.rule&&topic.focus.length);
  for(const entry of topic.focus){const original=entries.get(entry.id);assert.ok(original,entry.id);for(const key of ['hanzi','pinyin','en'])assert.equal(entry[key],original[key],entry.id+':'+key);}
 }
 // Clock teaching must not accidentally select the weekday question.
 assert.ok(teaching['ref-time-p01'].focus.every(e=>!e.hanzi.includes('星期')));
});
test('each reused recording has exact visible text, a preserved byte hash and an existing manifested source',()=>{
 const texts=new Set(lessons.flatMap(l=>[...l.terms,...l.examples]).map(e=>e.hanzi));
 assert.ok(Object.keys(audio).length>0);
 for(const [text,clip] of Object.entries(audio)){
  assert.equal(text,clip.text);assert.ok(texts.has(text));assert.ok(clip.source.startsWith('/')&&!clip.source.includes('..'));
  assert.equal(createHash('sha256').update(readFileSync('public'+clip.source)).digest('hex'),clip.sha256,text);
 }
});
