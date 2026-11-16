import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import test from 'node:test';
import {build} from 'esbuild';

const {outputFiles:[bundle]}=await build({
 stdin:{contents:"export * from './app/practical-lesson-data';",resolveDir:process.cwd()},
 platform:'node',format:'esm',bundle:true,write:false,
});
const {practicalLesson,practicalLessonAudio,buildPracticalSentence,activePracticalScene}=
 await import('data:text/javascript;base64,'+Buffer.from(bundle.text).toString('base64'));

test('classroom scenes preserve full sentences and recordings',()=>{
 assert.equal(practicalLesson.scenes.length,7);
 assert.equal(new Set(practicalLesson.scenes.map(scene=>scene.id)).size,7);
 for (const scene of practicalLesson.scenes){
  assert.equal(activePracticalScene('?scene='+scene.id),scene);
  for(const line of scene.lines){
   assert.equal(line.chunks.join(''),line.hanzi);
   for(const item of [line,...(line.variants??[])]){
    for(const locale of ['en','fr','ru','tr'])assert.ok(item.meaning[locale],item.hanzi+' '+locale);
    const source=practicalLessonAudio[item.hanzi];
    assert.match(source,/^\/audio\/practical-2026-11-16\/[a-f0-9]{20}\.mp3$/);
    assert.ok(readFileSync('public'+source).length>1000);
    for(const glyph of new Set(item.hanzi.match(/\p{Script=Han}/gu))) {
     assert.ok(existsSync('public/characters/'+glyph+'.json')||
      existsSync('node_modules/hanzi-writer-data/'+glyph+'.json'),glyph);
    }
   }
  }
 }
});

test('combining drink and temperature keeps the exact sentence and matching audio',()=>{
 const expected={'tea/hot':'我想喝热的茶。','tea/iced':'我想喝冰的茶。','coffee/hot':'我想喝热的咖啡。','coffee/iced':'我想喝冰的咖啡。'};
 for(const drink of ['tea','coffee'])for(const heat of ['hot','iced']){
  const result=buildPracticalSentence(drink,heat);
  assert.equal(result.hanzi,expected[drink+'/'+heat]);
  assert.equal(result.chunks.join(''),result.hanzi);
  assert.ok(existsSync('public'+practicalLessonAudio[result.hanzi]));
 }
});
