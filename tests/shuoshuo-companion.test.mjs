import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {indexedDB} from 'fake-indexeddb';import {createRequire} from 'node:module';import {writeFileSync,mkdtempSync,readFileSync,existsSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.indexedDB=indexedDB;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const b=await build({stdin:{contents:`export * from './app/shuoshuo-companion-model';export * from './app/local-store';export {items} from './app/content';export {eventSchema,progressSchema} from './app/event-schema';export {getCards} from './app/learning';export {newEvent} from './app/learning-event';export {default as Review} from './app/recognition-review';export {default as Companion} from './app/shuoshuo-companion';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{name:'ui',setup(b){
 b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));b.onResolve({filter:/\.css$/},a=>({path:a.path,namespace:'css'}));b.onLoad({filter:/.*/,namespace:'css'},()=>({contents:''}));
 b.onResolve({filter:/^\.\/(i18n|study-lookup|audio|shared-writing)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:({
 './i18n':`export const useI18n=()=>({locale:'en',t:(s,a=[])=>s.replace(/\\{(\\d+)\\}/g,(_,i)=>String(a[i]))});`,
 './study-lookup':`import {useRef} from 'react';export const StudyText=({text})=>text;export const useDictionaryAssistance=()=>useRef(null);`,
 './audio':`export const speak=()=>{};export const stopAudio=()=>{};`,
 './shared-writing':`import {createElement,useState} from 'react';export default function Writer(props){const [ink,setInk]=useState('');return createElement('writing-stub',{...props,ink,setInk});}`,
 })[a.path],loader:'js'}));
 }}]});
const file=join(mkdtempSync(join(tmpdir(),'shuoshuo-companion-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const tick=()=>new Promise(r=>setTimeout(r,10));async function settle(){await m.act(async()=>{await tick();await tick();});}
function label(n){return typeof n==='string'?n:(n.children??[]).map(label).join('');}const button=(r,text)=>r.root.findAllByType('button').find(b=>label(b)===text||b.props['aria-label']===text);
async function click(r,text){const b=button(r,text);assert.ok(b,text);assert.ok(!b.props.disabled,text+' enabled');await m.act(async()=>{b.props.onClick();await tick();});await settle();}
async function mount(owner){const db=await m.openStore(owner),notifications=[];let r;await m.act(()=>{r=m.renderer.create(m.createElement(m.Companion,{owner:owner==='guest'?null:owner,db,notify:s=>notifications.push(s),onBack(){}}));});await settle();return {db,r,notifications};}

test('exact ten-word pack retains honest third-party provenance and marks every example as original, without transcript or timestamps',()=>{
 assert.deepEqual(m.companion.terms.map(t=>t.hanzi),['起床','刷牙','洗脸','烧水','泡咖啡','阳台','看书','工作','上课','休息']);
 assert.equal(m.companion.source.videoId,'V6SrjHDisDs');assert.equal(m.companion.source.verificationAgainstAudio,false);assert.equal(m.companion.source.timestampsVerified,false);
 assert.equal(m.companion.source.textEvidenceUrl,'https://baolingo.app/speaking/86a14977f3f626a7');assert.ok(m.companion.source.exampleAuthorship.includes('not quotations'));
 for(const t of m.companion.terms){assert.ok(t.pinyin&&t.english);assert.ok(t.example.hanzi.includes(t.hanzi));assert.ok(t.example.pinyin&&t.example.english);assert.equal('timestamp' in t,false);for(const h of t.hanzi)assert.ok(existsSync('public/characters/'+h+'.json'),h+' has local stroke data');}
});
test('only four exact identities map; shorter words cannot masquerade as the six lesson-only expressions',()=>{
 assert.deepEqual(m.companion.terms.flatMap(t=>m.canonicalTerm(t)?.id??[]),['hsk1-161','hsk1-063','hsk1-177','hsk1-246']);
 const coffee=m.items.find(i=>i.hanzi==='咖啡'),phrase=m.companion.terms.find(t=>t.hanzi==='泡咖啡');assert.ok(coffee);assert.equal(m.canonicalTerm({...phrase,canonicalItemId:coffee.id}),undefined);
 for(const t of m.companion.terms){for(const link of m.companionAtlasLinks(t)){assert.ok(t.hanzi.includes(link.hanzi));assert.equal(new URLSearchParams(link.href.split('?')[1]).get('hanzi'),link.hanzi);}}
});
test('ungraded exposure/mode checkpoints restore and remain isolated by owner; stale leases cannot overwrite newer state',async()=>{
 const a=await m.openStore('companion-a'),b=await m.openStore('companion-b');let s=await m.claimCompanion(a,'a1');
 s=await m.saveCompanion(a,s,m.changeCompanion(s,{index:4,writing:4,phases:s.phases.map((p,i)=>i===4?3:p),writingModes:s.writingModes.map((mode,i)=>i===4?'recall':mode)}));
 const restored=await m.claimCompanion(a,'a2');assert.equal(restored.index,4);assert.equal(restored.phases[4],3);assert.equal(restored.writingModes[4],'recall');
 await assert.rejects(m.saveCompanion(a,s,{...s,index:0}),/another tab/);assert.equal((await m.claimCompanion(b,'b')).index,0);assert.equal((await m.allEvents(a)).length,0);
 assert.equal(m.validCompanion({...restored,index:10}),false);assert.equal(m.validCompanion({...restored,phases:[1]}),false);a.close();b.close();
});
test('real companion reveals in order, preserves Back/reload state, saves full unknown phrase writing only as ungraded local practice',async()=>{
 const {r,db,notifications}=await mount('companion-ui');
 assert.equal(label(r.root).includes('qǐchuáng'),false);await click(r,'Show pinyin');assert.ok(label(r.root).includes('qǐchuáng'));assert.equal(label(r.root).includes('get out of bed'),false);
 await click(r,'Show English meaning');assert.ok(label(r.root).includes('get out of bed'));assert.ok(label(r.root).includes('ORIGINAL CHINESEOS PRACTICE EXAMPLE'));
 await click(r,'Next');await click(r,'Previous');assert.ok(label(r.root).includes('get out of bed'));
 await click(r,'5泡咖啡');await click(r,'Write 泡咖啡');const writer=r.root.findByType('writing-stub');assert.equal(writer.props.hanzi,'泡咖啡');assert.equal(writer.props.item,undefined);assert.deepEqual(writer.props.audio,{});
 await m.act(async()=>writer.props.onModeChange('recall'));await settle();await m.act(async()=>{await writer.props.onSave();});await settle();assert.equal((await m.allEvents(db)).length,0);
 const checkpoint=await m.readDraft(db,m.companionDraftKey);assert.equal(checkpoint.written[4],true);await m.act(()=>r.unmount());
 let next;await m.act(()=>{next=m.renderer.create(m.createElement(m.Companion,{owner:'companion-ui',db,notify(){},onBack(){}}));});await settle();assert.equal(next.root.findByType('writing-stub').props.hanzi,'泡咖啡');assert.equal(next.root.findByType('writing-stub').props.initialMode,'recall');await click(next,'Back to vocabulary');assert.ok(label(next.root).includes('Word 5 / 10'));assert.equal((await m.allEvents(db)).length,0);assert.deepEqual(notifications,[]);await m.act(()=>next.unmount());db.close();
});
test('failed/stale saves retain the visible ungraded exercise and do not create events',async()=>{
 const {r,db}=await mount('companion-failure');await m.claimCompanion(db,'takeover');await click(r,'Show pinyin');assert.ok(r.root.findAllByProps({role:'alert'}).length);assert.ok(button(r,'Show pinyin'));assert.equal((await m.allEvents(db)).length,0);await m.act(()=>r.unmount());db.close();
});
test('owner switch cannot expose a former owner checkpoint',async()=>{
 const {r,db}=await mount('companion-owner-one');await click(r,'Show pinyin');const other=await m.openStore('companion-owner-two');
 await m.act(()=>r.update(m.createElement(m.Companion,{owner:'companion-owner-two',db:other,notify(){},onBack(){}})));await settle();assert.ok(button(r,'Show pinyin'));assert.equal((await m.readDraft(db,m.companionDraftKey)).phases[0],2);assert.equal((await m.readDraft(other,m.companionDraftKey)).phases[0],1);await m.act(()=>r.unmount());db.close();other.close();
});
test('actual RecognitionReview producer fails the existing server validator in assisted and independent runs; writing fixture remains valid',async()=>{
 for(const practice of [true,false]){
  const db=await m.openStore('known-gate-'+practice),captured=[],queue=[m.items.find(i=>i.id==='hsk1-161')];let r;
  await m.act(()=>{r=m.renderer.create(m.createElement(m.Review,{db,runId:crypto.randomUUID(),queue,practice,notify(){},onPosition(){},record:async e=>{captured.push(e);await m.putEvents(db,[{...e,synced:false}]);}}));});await settle();
  await click(r,'Show pinyin');await click(r,'Show English meaning');await click(r,'GoodRecalled correctly');assert.equal(captured.length,1);const e=captured[0];assert.equal(e.assisted,practice);assert.equal(e.detail.input,'hanzi > pinyin > English; self-assessed');assert.equal(e.detail.input.length,39);assert.equal(m.eventSchema.safeParse(e).success,false);
  assert.equal((await m.allEvents(db))[0].id,e.id);assert.equal((await m.allEvents(db))[0].synced,false);assert.equal(Object.keys(m.getCards(captured)).length,practice?0:1);
  const writing=m.newEvent(queue[0],'writing','recall',3,true,{input:'pen'});assert.equal(m.eventSchema.safeParse(writing).success,true);assert.equal(m.progressSchema.safeParse({events:[writing,e]}).success,false);
  await m.act(()=>r.unmount());db.close();
 }
});
test('companion has catalog/Studio entry points, responsive CSS and no graded review producer or media copies',()=>{
 const ui=readFileSync('app/shuoshuo-companion.tsx','utf8');assert.ok(!ui.includes('RecognitionReview'));assert.ok(!ui.includes('newEvent'));assert.ok(ui.includes('ungraded'));assert.ok(ui.includes('not a full sentence-listening lesson'));
 assert.ok(readFileSync('app/study-app.tsx','utf8').includes('?companion=shuoshuo'));assert.ok(readFileSync('app/study-studio.tsx','utf8').includes('Full lesson · 42 groups'));assert.ok(!readFileSync('app/study-studio.tsx','utf8').includes('{onCompanion&&'));assert.ok(readFileSync('app/shuoshuo-companion.css','utf8').includes('@media(max-width:650px)'));
 assert.equal(existsSync('public/shuoshuo-companion'),false);
});
