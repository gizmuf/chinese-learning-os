import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {existsSync} from 'node:fs';
const bundled=await build({stdin:{contents:`export {appStudyDictionary} from './app/study-lookup-model';export {studyExamples,dictionaryBreakdown} from './app/study-examples';export {lesson06Terms} from './app/lesson06-data';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
test('Every Lesson 06 expression has a real translated usage sentence in all four languages',()=>{
 for(const locale of ['en','fr','ru','tr'])for(const word of m.lesson06Terms){
  const examples=m.studyExamples(word.hanzi,locale);assert.ok(examples.length,locale+': '+word.hanzi);
  assert.ok(examples.length<=2);
  for(const example of examples){assert.ok(example.text.includes(word.hanzi));assert.notEqual(example.text.replace(/[\s\p{P}]/gu,''),word.hanzi);assert.ok(example.pinyin&&example.meaning);if(example.audio)assert.ok(existsSync('public'+example.audio.source),example.audio.source);}
 }
});
test('Expression details show actual character readings and meanings, including the r-ending role',()=>{
 const d=m.appStudyDictionary('en'),word=d.get('有点儿'),parts=m.dictionaryBreakdown(word,d);
 assert.equal(parts.sentence,false);assert.deepEqual(parts.parts.map(v=>v.text),['有','点','儿']);
 assert.match(parts.parts[0].entry.meaning,/have/);assert.match(parts.parts[1].entry.meaning,/small amount/);assert.match(parts.parts[2].entry.meaning,/no separate meaning/);
 assert.match(d.get('儿').meaning,/child/);assert.match(d.get('点').meaning,/dot/);
 assert.ok(m.studyExamples('有点儿','en').every(v=>/累|难/.test(v.text)));
});
test('A sentence opens words, whose next level opens characters rather than the same sentence',()=>{
 const d=m.appStudyDictionary('en'),entry={text:'你今天看起来有点儿累。',pinyin:'',meaning:''};
 const parts=m.dictionaryBreakdown(entry,d);assert.equal(parts.sentence,true);
 assert.ok(parts.parts.some(v=>v.text==='有点儿'));assert.ok(!parts.parts.some(v=>v.text===entry.text));
 assert.deepEqual(m.dictionaryBreakdown(d.get('有点儿'),d).parts.map(v=>v.text),['有','点','儿']);
 assert.deepEqual(m.studyExamples('','en'),[]);
});

test('Lesson phrases remain inspectable but do not swallow their constituent words inside a sentence',()=>{
 const d=m.appStudyDictionary('en');
 const sentence=m.dictionaryBreakdown({text:'汉语有点儿难。',pinyin:'',meaning:''},d);
 assert.ok(sentence.parts.some(v=>v.text==='有点儿'));assert.ok(sentence.parts.some(v=>v.text==='难'));
 assert.ok(!sentence.parts.some(v=>v.text==='有点儿难'));
 const phrase=m.dictionaryBreakdown(d.get('一把钥匙'),d);assert.equal(phrase.phrase,true);
 assert.ok(phrase.parts.some(v=>v.text==='钥匙'));
 assert.deepEqual(m.dictionaryBreakdown(d.get('钥匙'),d).parts.map(v=>v.text),['钥','匙']);
});
