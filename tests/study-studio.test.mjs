import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {indexedDB} from 'fake-indexeddb';
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.indexedDB=indexedDB;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const b=await build({stdin:{contents:`export * from './app/study-studio-model';export * from './app/local-store';export {default as Studio} from './app/study-studio';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{name:'ui',setup(b){
 b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));
 b.onResolve({filter:/\.css$/},a=>({path:a.path,namespace:'css'}));b.onLoad({filter:/.*/,namespace:'css'},()=>({contents:''}));
 b.onResolve({filter:/^\.\/(i18n|study-lookup|audio|atlas-store|atlas-cloud|shared-writing|recognition-review)$/},a=>({path:a.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:({
 './i18n':`export const useI18n=()=>({locale:'en',t:s=>s});`,
 './study-lookup':`export const StudyText=({text})=>text;`,
 './audio':`export const speak=()=>{};export const stopAudio=()=>{};`,
 './atlas-store':`export const useAtlasProgress=()=>({});`,
 './atlas-cloud':`import {createElement} from 'react';export default props=>createElement('atlas-stub',props);`,
 './shared-writing':`import {createElement,useState} from 'react';export default function Writing(props){const [ink,setInk]=useState('');return createElement('writing-stub',{...props,ink,setInk});}`,
 './recognition-review':`import {createElement} from 'react';export default props=>createElement('review-stub',props);`,
 })[a.path],loader:'js'}));
 }}]});
const file=join(mkdtempSync(join(tmpdir(),'study-studio-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const tick=()=>new Promise(r=>setTimeout(r,10));async function settle(){await m.act(async()=>{await tick();await tick();});}
function text(n){return typeof n==='string'?n:(n.children??[]).map(text).join('');}
const button=(r,label)=>r.root.findAllByType('button').find(b=>text(b)===label);
async function click(r,label){const b=button(r,label);assert.ok(b,label);assert.ok(!b.props.disabled,label+' enabled');await m.act(async()=>{b.props.onClick();await tick();});await settle();}
test('allowlisted commands reject invented tools, IDs and modes; exact fixtures do not parse arbitrary requests',()=>{
 const s=m.initialStudio();assert.equal(m.fixtureCommand('fetch secrets','x'),null);
 assert.deepEqual(m.fixtureCommand('My day','legacy'),m.fixtureCommand('Movement examples','legacy'));
 for(const c of [{tool:'eval',actionId:'x'},{tool:'writing.open',itemId:'unknown',mode:'recall',actionId:'x'},{tool:'writing.open',itemId:'hsk1-081',mode:'execute',actionId:'x'},{tool:'vocabulary.select',itemIds:['unknown'],actionId:'x'}])assert.throws(()=>m.applyStudioCommand(s,c,'run'));
 assert.equal(m.validStudio({...s,itemId:'unknown'}),false);
});
test('commands are idempotent, Back preserves selection and review identity without emitting grades',()=>{
 const c=m.fixtureCommand('Practise writing 回','write-1');
 const w=m.applyStudioCommand(m.initialStudio(),c,'run');assert.equal(w.pane,'writing');assert.strictEqual(m.applyStudioCommand(w,c,'run-2'),w);
 const cards=m.applyStudioCommand(w,m.fixtureCommand('Practise flashcards','cards-1'),'pinned-run');
 assert.equal(cards.review.id,'pinned-run');const previous=m.backStudio(cards);assert.equal(previous.pane,'writing');assert.deepEqual(previous.selected,w.selected);assert.equal(previous.review.id,'pinned-run');
 assert.throws(()=>m.applyStudioCommand({...w,selected:[]},m.fixtureCommand('Practise flashcards','empty'),'run'));
});
test('checkpoint restores pane/mode/selection and rejects stale tab writes; owners have separate storage',async()=>{
 const db=await m.openStore('studio-model-a'),other=await m.openStore('studio-model-b');
 const original=await m.claimStudio(db,'tab-1');
 const saved=await m.writeStudio(db,original,{...original,pane:'writing',mode:'recall',selected:['hsk1-081']});
 const restored=await m.claimStudio(db,'tab-2');assert.equal(restored.mode,'recall');assert.deepEqual(restored.selected,['hsk1-081']);
 await assert.rejects(m.writeStudio(db,saved,{...saved,pane:'day'}),/another tab/);
 const separate=await m.claimStudio(other,'other-owner');assert.equal(separate.pane,'atlas');assert.equal((await m.allEvents(db)).length,0);
 db.close();other.close();
});
test('real workspace retains mounted ink on navigation, restores checkpoint, and starts supported practice after durable selection',async()=>{
 const db=await m.openStore('studio-component');const events=[],notifications=[];
 const props={owner:null,db,penOnly:true,setPenOnly(){},notify:s=>notifications.push(s),record:async e=>events.push(e),onExit(){},menuOpen:false,onMenu(){}};
 let r;await m.act(async()=>{r=m.renderer.create(m.createElement(m.Studio,props));});await settle();
 await click(r,'Study companion');await click(r,'Practise writing 回');
 await m.act(async()=>r.root.findByType('writing-stub').props.setInk('saved strokes'));await settle();
 await m.act(async()=>r.root.findByType('writing-stub').props.onModeChange('recall'));await settle();
 await click(r,'Movement examples');assert.equal(r.root.findByType('writing-stub').props.ink,'saved strokes');
 await click(r,'Back');assert.equal(r.root.findByType('writing-stub').props.initialMode,'recall');
 await click(r,'Vocabulary');await click(r,'Practice selected words');
 const review=r.root.findByType('review-stub');assert.equal(review.props.practice,true);
 const checkpoint=await m.readDraft(db,m.studioDraftKey);assert.equal(checkpoint.review.id,review.props.runId);assert.deepEqual(checkpoint.review.itemIds,review.props.queue.map(i=>i.id));
 const run=review.props.runId;await m.act(()=>r.unmount());
 await m.act(async()=>{r=m.renderer.create(m.createElement(m.Studio,props));});await settle();assert.equal(r.root.findByType('review-stub').props.runId,run);assert.equal(events.length,0);assert.deepEqual(notifications,[]);
 await m.act(()=>r.unmount());db.close();
});
test('Atlas assessment pauses external commands and Close; failed checkpoint writes retain the current pane',async()=>{
 const db=await m.openStore('studio-guards');let r;
 await m.act(async()=>{r=m.renderer.create(m.createElement(m.Studio,{owner:null,db,penOnly:false,setPenOnly(){},notify(){},record:async()=>{},onExit(){},menuOpen:false,onMenu(){}}));});await settle();
 await click(r,'Study companion');
 const atlas=r.root.findByType('atlas-stub');await m.act(()=>atlas.props.embedded.onAssessmentChange(true));
 assert.equal(button(r,'Writing').props.disabled,true);assert.equal(button(r,'Close').props.disabled,true);assert.equal(button(r,'Movement examples').props.disabled,true);
 await m.act(()=>atlas.props.embedded.onAssessmentChange(false));
 await m.claimStudio(db,'takeover');await click(r,'Movement examples');
 assert.ok(r.root.findAllByProps({role:'alert'}).length);assert.equal(r.root.findByProps({className:'ss-atlas'}).props.hidden,false);
 await m.act(()=>r.unmount());db.close();
});

test('movement examples and five preset companion actions have honest labels and a separate full lesson entry',async()=>{
 const db=await m.openStore('studio-honest-presets');let r,myDayOpens=0;
 await m.act(async()=>{r=m.renderer.create(m.createElement(m.Studio,{owner:null,db,penOnly:false,setPenOnly(){},notify(){},record:async()=>{},onExit(){},onMyDay(){myDayOpens++;},menuOpen:false,onMenu(){}}));});await settle();
 try {
  assert.ok(button(r,'Movement examples'));
  assert.equal(button(r,'My day'),undefined);
  await click(r,'My Day · Day 01 V2 · 26 sentences · Open lesson · New 3 November chapters');assert.equal(myDayOpens,1);
  await click(r,'Movement examples');
  const pane=r.root.findByProps({className:'ss-panel ss-day'});assert.equal(pane.props.hidden,false);assert.equal(pane.findAllByType('article').length,4);assert.match(text(pane),/Movement examples/);
  await click(r,'Study companion');
  const companion=r.root.findByProps({id:'ss-companion'});
  assert.match(text(companion),/Five predefined actions · no live AI connected/);
  assert.equal(companion.findAllByType('form').length,0);assert.equal(companion.findAllByType('input').length,0);
  const actions=companion.findByProps({className:'ss-suggestions'}).findAllByType('button');assert.equal(actions.length,5);
  for(const label of ['Explore the 木 character family','Practise writing 回','Add words to practice','Movement examples','Practise flashcards']) {
   const action=actions.find(b=>text(b)===label);assert.ok(action,label);
   await m.act(async()=>{action.props.onClick();await tick();});await settle();
  }
  assert.equal((await m.readDraft(db,m.studioDraftKey)).pane,'cards');assert.equal((await m.allEvents(db)).length,0);
 } finally {await m.act(()=>r.unmount());db.close();}
});

 test('Learning Lab opens fixed demos separately, preserves ink and emits no grade; assessment disables links',async()=>{
 const db=await m.openStore('studio-lab-links');const events=[];let r;await m.act(async()=>{r=m.renderer.create(m.createElement(m.Studio,{owner:null,db,penOnly:false,setPenOnly(){},notify(){},record:async e=>events.push(e),onExit(){},menuOpen:false,onMenu(){}}));});await settle();
 await click(r,'Study companion');await click(r,'Practise writing 回');await m.act(()=>r.root.findByType('writing-stub').props.setInk('retained ink'));
 const links=r.root.findAllByType('a').filter(a=>a.props.href?.startsWith('/design-references/scene-lab/'));assert.deepEqual(links.map(a=>a.props.href),['/design-references/scene-lab/journey.html','/design-references/scene-lab/world3d.html']);
 for(const link of links){assert.equal(link.props.target,'_blank');assert.equal(link.props.rel,'noopener noreferrer');let prevented=false;await m.act(()=>link.props.onClick({preventDefault(){prevented=true;}}));assert.equal(prevented,false);}assert.equal(r.root.findByType('writing-stub').props.ink,'retained ink');assert.equal(events.length,0);
 await m.act(()=>r.root.findByType('atlas-stub').props.embedded.onAssessmentChange(true));for(const link of r.root.findAllByType('a').filter(a=>a.props.href?.startsWith('/design-references/scene-lab/'))){assert.equal(link.props['aria-disabled'],true);assert.equal(link.props.tabIndex,-1);let prevented=false;link.props.onClick({preventDefault(){prevented=true;}});assert.equal(prevented,true);}assert.equal(events.length,0);await m.act(()=>r.unmount());db.close();
});
