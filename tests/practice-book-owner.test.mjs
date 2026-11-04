import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.addEventListener=()=>{};globalThis.removeEventListener=()=>{};
const b=await build({stdin:{contents:`export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';export {usePracticeBook} from './app/use-practice-book';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-test-renderer'],plugins:[{name:'delayed-owner-storage',setup(build){build.onResolve({filter:/^\.\/(local-store|practice-book)$/},a=>({path:a.path,namespace:'storage'}));build.onLoad({filter:/.*/,namespace:'storage'},a=>({contents:a.path.includes('local-store')?`export const readDraft=db=>Promise.resolve([{text:db.name}]);`:`export const practiceBookKey='book';export const readPracticeChoices=x=>x;export const togglePracticeChoice=(db,e)=>globalThis.bookWrite(db,e);`,loader:'js'}));}}]});
const out={exports:{}};new Function('require','module','exports',b.outputFiles[0].text)(require,out,out.exports);const m=out.exports;
test('a pending save cannot expose old-owner choices or keep the next owner locked',async()=>{
 const a={name:'chinese-os-v1-a'},b={name:'chinese-os-v1-b'},pending=new Map();let book;
 globalThis.bookWrite=(db,entry)=>new Promise(resolve=>pending.set(db.name,()=>resolve([entry])));
 function Probe({db,owner}){book=m.usePracticeBook(db,owner,()=>{});return null;}
 let r;await m.act(async()=>{r=m.renderer.create(m.createElement(Probe,{db:a,owner:'a'}));});assert.equal(book.ready,true);
 let saveA;await m.act(()=>{saveA=book.toggle({text:'甲'});});assert.equal(book.busy,true);
 await m.act(async()=>{r.update(m.createElement(Probe,{db:null,owner:'b'}));});assert.deepEqual(book.entries,[]);assert.equal(book.ready,false);
 await m.act(async()=>{r.update(m.createElement(Probe,{db:b,owner:'b'}));});assert.equal(book.ready,true);assert.equal(book.busy,false);assert.equal(book.entries[0].text,b.name);
 let saveB;await m.act(()=>{saveB=book.toggle({text:'乙'});});assert.equal(book.busy,true);
 await m.act(async()=>{pending.get(a.name)();await saveA;});assert.equal(book.busy,true);assert.equal(book.entries[0].text,b.name);
 await m.act(async()=>{pending.get(b.name)();await saveB;});assert.deepEqual(book.entries,[{text:'乙'}]);assert.equal(book.busy,false);await m.act(()=>r.unmount());
});
