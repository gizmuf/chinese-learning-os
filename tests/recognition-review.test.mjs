import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {indexedDB} from 'fake-indexeddb';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.indexedDB=indexedDB;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const built=await build({stdin:{contents:`export {default as Review,recognitionDraftKey,writeRecognitionDraft} from './app/recognition-review';export * from './app/local-store';export {getCards,isReview} from './app/learning';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{name:'context',setup(b){b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));b.onResolve({filter:/^\.\/(i18n|study-lookup|audio)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='./i18n'?`export const useI18n=()=>({locale:'en',t:(s,a=[])=>s.replace(/\\{(\\d+)\\}/g,(_,i)=>String(a[i]))});`:a.path==='./audio'?`export const speak=()=>{};export const stopAudio=()=>{};`:`import {useRef} from 'react';export const StudyText=({text})=>text;export const useDictionaryAssistance=fn=>{globalThis.recognitionHelp=fn;return useRef(null)};`,loader:'js'}));}}]});
const file=join(mkdtempSync(join(tmpdir(),'recognition-ui-')),'bundle.mjs');writeFileSync(file,built.outputFiles[0].text);const m=await import(pathToFileURL(file));
const queue=[{id:'test-1',hanzi:'半',pinyin:'bàn',english:'half',sentence:'现在三点半。',sentencePinyin:'Xiànzài sān diǎn bàn.',translation:'It is half past three now.'},{id:'test-2',hanzi:'水',pinyin:'shuǐ',english:'water',sentence:'我喝水。',sentencePinyin:'Wǒ hē shuǐ.',translation:'I drink water.'}];
const text=r=>JSON.stringify(r.toJSON());
function label(node){return node.children.map(v=>typeof v==='string'?v:label(v)).join('');}
const button=(r,name)=>r.root.findAllByType('button').find(b=>label(b)===name);
const tick=()=>new Promise(r=>setTimeout(r,5));
async function settle(){await m.act(async()=>{await tick()});}
async function until(fn){for(let i=0;i<100;i++){if(fn())return;await settle();}assert.fail('UI did not reach expected state');}
async function click(r,name){await until(()=>!!button(r,name)&&!button(r,name).props.disabled&&!r.root.findByType('section').props['aria-busy']);assert.ok(button(r,name),name);await m.act(async()=>{await button(r,name).props.onClick();await tick()});await until(()=>!r.root.findByType('section').props['aria-busy']);}
async function mount({db,runId,record,practice=false}){let root;await m.act(async()=>{root=m.renderer.create(m.createElement(m.Review,{db,runId,queue,record,practice,notify(){},onPosition(){}}))});await until(()=>button(root,'Show pinyin')||button(root,'Previous')&&!text(root).includes('Loading your notebook'));return root;}
async function reveal(r){await click(r,'Show pinyin');await click(r,'Show English meaning');}
async function unmount(r){await m.act(()=>r.unmount());}
async function setup(name){const db=await m.openStore('recognition-test-'+name);return {db,record:async e=>m.putEvents(db,[{...e,synced:false}])};}

test('actual card stages hide pinyin, meaning and example until requested; one double-tap rating advances after commit and Back is read-only',async()=>{
 const env=await setup('stages');let release,calls=0;const gate=new Promise(r=>release=r);
 const root=await mount({...env,runId:'stages',record:async e=>{calls++;await gate;await env.record(e)}});
 assert.ok(text(root).includes('半'));assert.ok(!text(root).includes('bàn'));assert.ok(!text(root).includes('half'));assert.ok(!text(root).includes('现在三点半'));
 await click(root,'Show pinyin');assert.ok(text(root).includes('bàn'));assert.ok(!text(root).includes('half'));
 await click(root,'Show English meaning');assert.ok(text(root).includes('half'));
 const rate=button(root,'GoodRecalled correctly');await m.act(async()=>{rate.props.onClick();rate.props.onClick();await tick()});
 await until(()=>calls===1);assert.equal(calls,1);assert.ok(text(root).includes('half'));assert.equal(button(root,'Previous').props.disabled,true);
 await m.act(async()=>{release();await tick()});await until(()=>!!button(root,'Show pinyin'));
 assert.equal((await m.allEvents(env.db)).length,1);assert.ok(!text(root).includes('shuǐ'));
 await click(root,'Previous');assert.ok(text(root).includes('Already rated · viewing only'));assert.ok(!button(root,'GoodRecalled correctly'));assert.ok(text(root).includes('Next review:'));
 await click(root,'Next');assert.ok(button(root,'Show pinyin'));assert.equal((await m.allEvents(env.db)).length,1);
 await unmount(root);
});
test('failed save stays on card; reload and retry preserve identical UUID, rating and timestamp',async()=>{
 const env=await setup('retry');const attempts=[];let fail=true;
 const record=async e=>{attempts.push(structuredClone(e));if(fail)throw Error('offline storage failure');await env.record(e)};
 let root=await mount({...env,runId:'retry',record});await reveal(root);await click(root,'HardCorrect, with effort');
 assert.equal((await m.allEvents(env.db)).length,0);assert.ok(text(root).includes('half'));assert.ok(button(root,'Retry saving review'));
 await unmount(root);root=await mount({...env,runId:'retry',record});assert.ok(button(root,'Retry saving review'));fail=false;
 await click(root,'Retry saving review');await until(()=>!!button(root,'Show pinyin'));
 assert.deepEqual(attempts[0],attempts[1]);assert.equal((await m.allEvents(env.db)).length,1);await unmount(root);
});
test('event committed before a later failure is recovered on reload, without another rating or event',async()=>{
 const env=await setup('partial');let calls=0;let root=await mount({...env,runId:'partial',record:async e=>{calls++;await env.record(e);throw Error('post-commit refresh failed')}});
 await reveal(root);await click(root,'EasyQuick & confident');assert.ok(button(root,'Retry saving review'));await unmount(root);
 root=await mount({...env,runId:'partial'});assert.ok(button(root,'Show pinyin'));assert.equal(calls,1);assert.equal((await m.allEvents(env.db)).length,1);await unmount(root);
});
test('phase and Back position survive reload; extra practice and dictionary help cannot advance independent SRS',async()=>{
 const env=await setup('practice');let root=await mount({...env,runId:'extra',practice:true});
 await click(root,'Show pinyin');await unmount(root);root=await mount({...env,runId:'extra',practice:true});assert.ok(button(root,'Show English meaning'));assert.ok(!button(root,'Show pinyin'));
 await click(root,'Show English meaning');await click(root,'AgainCould not recall');await until(()=>!!button(root,'Show pinyin'));
 assert.equal((await m.allEvents(env.db))[0].assisted,true);assert.deepEqual(m.getCards(await m.allEvents(env.db)),{});await unmount(root);
 root=await mount({...env,runId:'help'});await m.act(async()=>{globalThis.recognitionHelp();await tick()});await reveal(root);await click(root,'GoodRecalled correctly');await until(()=>!!button(root,'Show pinyin'));
 assert.equal((await m.allEvents(env.db))[1].assisted,true);assert.deepEqual(m.getCards(await m.allEvents(env.db)),{});await unmount(root);
});
test('a late save from an abandoned run cannot overwrite the newer session draft',async()=>{
 const env=await setup('cas');const first={version:1,id:'first',itemIds:['test-1'],index:0,attempts:{}};const second={...first,id:'second'};
 await m.writeRecognitionDraft(env.db,first,true);await m.writeRecognitionDraft(env.db,second,true);
 await assert.rejects(m.writeRecognitionDraft(env.db,{...first,index:1}));assert.equal((await m.readDraft(env.db,m.recognitionDraftKey)).id,'second');
});
test('Again, Hard, Good and Easy all retain real future due dates; skills and assisted practice stay separate',()=>{
 for(const rating of [1,2,3,4]){const event={id:'rating-'+rating,itemId:'test-1',skill:'meaning',mode:'recall',rating,assisted:false,at:Date.now(),timezone:'Asia/Shanghai',detail:{}};const cards=m.getCards([event]);assert.ok(cards['test-1:meaning']);assert.ok(cards['test-1:meaning'].due.getTime()>=event.at);assert.equal(cards['test-1:writing'],undefined);assert.deepEqual(m.getCards([{...event,assisted:true}]),{});}
});

test('extra practice preserves an existing FSRS due date and repetition history exactly',async()=>{
 const env=await setup('existing-schedule');
 const event={id:crypto.randomUUID(),itemId:queue[0].id,skill:'meaning',mode:'recall',rating:3,assisted:false,at:Date.now(),timezone:'Asia/Shanghai',detail:{}};
 await env.record(event);const before=m.getCards(await m.allEvents(env.db));
 const root=await mount({...env,runId:'existing-extra',practice:true});await reveal(root);await click(root,'EasyQuick & confident');
 assert.deepEqual(m.getCards(await m.allEvents(env.db)),before);assert.equal((await m.allEvents(env.db)).length,2);await unmount(root);
});

test('the final rating completes a finite session and its last card remains read-only on Back',async()=>{
 const env=await setup('finish');const root=await mount({...env,runId:'finish'});
 await reveal(root);await click(root,'GoodRecalled correctly');await reveal(root);await click(root,'HardCorrect, with effort');
 assert.ok(text(root).includes('Session complete'));assert.equal((await m.allEvents(env.db)).length,2);
 await click(root,'Previous');assert.ok(text(root).includes('Already rated · viewing only'));assert.ok(!button(root,'HardCorrect, with effort'));
 await click(root,'Next');assert.ok(text(root).includes('Session complete'));assert.equal((await m.allEvents(env.db)).length,2);await unmount(root);
});
