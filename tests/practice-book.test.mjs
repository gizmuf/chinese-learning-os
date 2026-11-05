import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {IDBFactory} from 'fake-indexeddb';
const built=await build({stdin:{contents:`export * from './app/practice-book';export {openStore,readDraft} from './app/local-store';`,loader:'ts',resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
globalThis.indexedDB=new IDBFactory();
test('two simultaneous selections merge atomically, survive reopening and leave learning events unchanged',async()=>{
 const db=await m.openStore('practice-book-test');
 await Promise.all([m.togglePracticeChoice(db,{text:'书店',pinyin:'shūdiàn',meaning:'bookshop'}),m.togglePracticeChoice(db,{text:'在',pinyin:'zài',meaning:'at'})]);
 assert.deepEqual((await m.readDraft(db,m.practiceBookKey)).map(v=>v.text),['书店','在']);
 assert.equal(await new Promise(resolve=>{const r=db.transaction('events').objectStore('events').count();r.onsuccess=()=>resolve(r.result);}),0);
 db.close();const reopened=await m.openStore('practice-book-test');assert.equal((await m.readDraft(reopened,m.practiceBookKey)).length,2);
 await m.togglePracticeChoice(reopened,{text:'在',pinyin:'zài',meaning:'at'});assert.deepEqual((await m.readDraft(reopened,m.practiceBookKey)).map(v=>v.text),['书店']);
 const another=await m.openStore('separate-owner');assert.equal(await m.readDraft(another,m.practiceBookKey),undefined);another.close();reopened.close();
});
test('sentences cannot enter the selected set, and corrupt stored rows and ink cannot render as writing',()=>{
 assert.equal(m.canChoosePractice({text:'银行在书店东边。'}),false);assert.equal(m.canChoosePractice({text:'我喜欢学习',phrase:true}),false);assert.equal(m.canChoosePractice({text:'亻'}),true);
 assert.deepEqual(m.readPracticeChoices([{text:'在',pinyin:'zài',meaning:'at',addedAt:1},{text:'在',pinyin:'zài',meaning:'at',addedAt:2},{text:'我。',pinyin:'',meaning:'',addedAt:1}]).map(v=>v.text),['在']);
 const valid={'word:你好':[[[{x:.1,y:.2,p:.5,t:1}]]]};assert.deepEqual(m.readPracticeInk(valid),valid);assert.deepEqual(m.readPracticeInk({'word:你好':'corrupt',在:[[[{x:Infinity,y:0,p:0,t:1}]]]}),{});
});
