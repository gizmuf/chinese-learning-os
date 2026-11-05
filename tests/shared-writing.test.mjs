import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {indexedDB} from 'fake-indexeddb';import {createRequire} from 'node:module';import {writeFileSync,mkdtempSync,readFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.indexedDB=indexedDB;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const b=await build({stdin:{contents:`export {default as Writing,WritingPracticeProvider as Provider} from './app/shared-writing';export {openStore,readDraft} from './app/local-store';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',loader:{'.css':'empty'},plugins:[{name:'ui',setup(b){b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));b.onResolve({filter:/^\.\/(i18n|study-lookup|study-lookup-model|guided|ink|audio)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:({'./i18n':`export const useI18n=()=>({locale:'en',t:(s,a=[])=>s.replace(/\\{(\\d+)\\}/g,(_,i)=>String(a[i]))});`,'./study-lookup':`export const StudyText=({text})=>text;`,'./study-lookup-model':`export const appStudyDictionary=()=>new Map();`,'./guided':`import {createElement} from 'react';export default props=>createElement('guided-stub',props);`,'./ink':`import {createElement} from 'react';export default props=>createElement('ink-stub',props);`,'./audio':`export const speak=()=>{};export const playRecording=()=>{};`})[a.path],loader:'js'}));}}]});
const file=join(mkdtempSync(join(tmpdir(),'shared-writing-ui-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const tick=()=>new Promise(r=>setTimeout(r,5));async function settle(){await m.act(async()=>{await tick()})}
function label(n){return n.children.map(v=>typeof v==='string'?v:label(v)).join('')};const button=(r,n)=>r.root.findAllByType('button').find(b=>label(b)===n);
async function click(r,n){assert.ok(button(r,n),n);await m.act(async()=>{button(r,n).props.onClick();await tick()});}
async function ready(){await settle();await settle();}
const ink=[{x:.1,y:.1,p:.5,t:0},{x:.8,y:.9,p:.7,t:20}];
async function mount(hanzi,options={}){const db=await m.openStore('shared-writing-'+hanzi);const events=[],pens=[];let r;await m.act(async()=>{r=m.renderer.create(m.createElement(m.Provider,{value:{db,record:async e=>{events.push(e)},penOnly:true,setPenOnly:v=>pens.push(v),notify(){}}},m.createElement(m.Writing,{hanzi,...options})))});await ready();return {r,db,events,pens};}

test('one existing studio serves animation, trace, copy and blank memory; compounds retain ordered character slots, pen mode, reset and draft',async()=>{
 const {r,db}=await mount('学习');assert.equal(r.root.findByType('guided-stub').props.mode,'watch');
 await click(r,'2Trace');await ready();assert.equal(r.root.findByType('guided-stub').props.mode,'trace');assert.equal(r.root.findByType('guided-stub').props.penOnly,true);
 await click(r,'4Recall');await ready();assert.equal(r.root.findAllByType('guided-stub').length,0);assert.equal(r.root.findByType('ink-stub').props.strokes.length,0);
 assert.ok(!JSON.stringify(r.toJSON()).includes('学习'));assert.equal(button(r,'Compare answer'),undefined);
 await m.act(async()=>r.root.findByType('ink-stub').props.onChange([ink]));await settle();
 await click(r,'Next character');assert.equal(r.root.findByType('ink-stub').props.strokes.length,0);
 await m.act(async()=>r.root.findByType('ink-stub').props.onChange([ink]));await settle();assert.equal(button(r,'Compare answer').props.disabled,false);
 await click(r,'Clear');assert.equal(r.root.findByType('ink-stub').props.strokes.length,0);assert.equal(button(r,'Compare answer').props.disabled,true);
 const drafts=await new Promise((resolve,reject)=>{const request=db.transaction('drafts').objectStore('drafts').getAll();request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)});
 const draft=drafts.find(d=>Array.isArray(d?.strokes)&&d.strokes[0]?.length===1);assert.ok(draft);assert.equal(draft.strokes[1].length,0);
 // Persistence is owned by the full studio, using the original word identity.
 assert.ok(r.root.findAllByType('input').find(n=>n.props.type==='checkbox').props.checked);
 await m.act(()=>r.unmount());db.close();
});
test('contextual memory writing records writing practice only, never recognition recall, after a model was visible',async()=>{
 const {r,db,events}=await mount('水');await click(r,'4Recall');await ready();
 await m.act(async()=>r.root.findByType('ink-stub').props.onChange([ink]));await settle();await click(r,'Compare answer');
 await click(r,'GoodRecalled correctly');await ready();assert.equal(events.length,1);assert.equal(events[0].skill,'writing');assert.equal(events[0].assisted,true);assert.equal(events[0].mode,'recall');
 await m.act(()=>r.unmount());db.close();
});
test('every former guided writing entry uses the same full studio; the stroke animation renderer has one teaching caller',()=>{
 for(const path of ['app/lesson05-writing.tsx','app/lesson06.tsx','app/lesson07.tsx','app/lesson08.tsx','app/lesson09.tsx','app/video-study.tsx','app/study-lookup.tsx','app/atlas-guided-writing.tsx']) {
  const source=readFileSync(path,'utf8');assert.ok(source.includes('SharedWriting'),path);assert.ok(!source.includes('<Guided'),path);
 }
 assert.ok(readFileSync('app/writing-practice.tsx','utf8').includes('<Guided'));
});

test('workspace can restore Recall directly without exposing the model, then change the existing mode',async()=>{
 const modes=[];const {r,db}=await mount('回',{initialMode:'recall',onModeChange:m=>modes.push(m)});
 assert.equal(r.root.findAllByType('guided-stub').length,0);assert.ok(!JSON.stringify(r.toJSON()).includes('回'));
 await click(r,'3Copy');await ready();assert.ok(r.root.findByType('ink-stub'));assert.ok(JSON.stringify(r.toJSON()).includes('回'));assert.deepEqual(modes,['copy']);
 await m.act(()=>r.unmount());db.close();
});

test('explicit silent companion audio and ungraded save adapter preserve the existing full writer without emitting a learning event',async()=>{
 let saves=0;const {r,db,events}=await mount('水',{audio:{},onSave:async()=>{saves++;}});
 const pronunciation=r.root.findAllByType('button').find(b=>label(b).trim()==='Hear pronunciation');assert.ok(pronunciation);assert.equal(pronunciation.props.disabled,true);
 await click(r,'4Recall');await ready();await m.act(async()=>r.root.findByType('ink-stub').props.onChange([ink]));await settle();await click(r,'Compare answer');await click(r,'GoodRecalled correctly');await ready();
 assert.equal(saves,1);assert.equal(events.length,0);await m.act(()=>r.unmount());db.close();
});

test('selected contextual sense keeps the exact source example and sentence audio through writing modes',async()=>{
 const contextual={sourceId:'my-day-01-v2:6',text:'早饭后，我准备出门，因为我得去学校。',pinyin:'Zǎofàn hòu, wǒ zhǔnbèi chūmén, yīnwèi wǒ děi qù xuéxiào.',meaning:'After breakfast, I get ready to leave home because I have to go to school.',audio:{text:'早饭后，我准备出门，因为我得去学校。',pinyin:'Zǎofàn hòu, wǒ zhǔnbèi chūmén, yīnwèi wǒ děi qù xuéxiào.',source:'/exact-source.mp3',context:true,kind:'sentence'}};
 const {r,db,events}=await mount('得',{pinyin:'děi',meaning:'must / have to',contextual});
 assert.ok(JSON.stringify(r.toJSON()).includes(contextual.text));assert.ok(!JSON.stringify(r.toJSON()).includes('她说得很好'));
 const examples=r.root.findAllByType('button').filter(b=>label(b).trim()==='Listen to example');assert.equal(examples.length,1);assert.equal(examples[0].props.disabled,false);
 await click(r,'3Copy');await ready();assert.ok(JSON.stringify(r.toJSON()).includes(contextual.text));
 await click(r,'4Recall');await ready();assert.ok(!JSON.stringify(r.toJSON()).includes(contextual.text));
 await m.act(async()=>r.root.findByType('ink-stub').props.onChange([ink]));await settle();await click(r,'Compare answer');await click(r,'GoodRecalled correctly');await ready();assert.equal(events.length,0,'context-specific sense must not be graded as the canonical particle');
 await m.act(async()=>r.unmount());db.close();
});

test('a supplied reviewed polyphonic word keeps its own ID instead of the first spelling match',async()=>{
 const item={id:'hsk3-678',lesson:'travel',hanzi:'还',pinyin:'huán',english:'to return; give back',sentence:'看完这本书以后，请还到图书馆。',sentencePinyin:'Kàn wán zhè běn shū yǐ hòu， qǐng huán dào tú shū guǎn。',translation:'After you finish this book, please return it to the library.'};
 const {r,db,events}=await mount('还',{item});await click(r,'4Recall');await ready();await m.act(async()=>r.root.findByType('ink-stub').props.onChange([ink]));await settle();await click(r,'Compare answer');await click(r,'GoodRecalled correctly');await ready();assert.equal(events.length,1);assert.equal(events[0].itemId,'hsk3-678');assert.equal(events[0].assisted,true);await m.act(async()=>r.unmount());db.close();
});

test('unavailable guided data disables saving and clears a stale complete caption',async()=>{
 const {r,db}=await mount('呆');const guided=()=>r.root.findByType('guided-stub');await m.act(async()=>{guided().props.onAvailabilityChange(true);guided().props.onComplete();});await ready();assert.equal(button(r,'Save practice').props.disabled,false);assert.ok(JSON.stringify(r.toJSON()).includes('Character complete'));
 await m.act(async()=>guided().props.onAvailabilityChange(false));await ready();assert.equal(button(r,'Save practice').props.disabled,true);assert.ok(!JSON.stringify(r.toJSON()).includes('Character complete'));await m.act(async()=>r.unmount());db.close();
});
