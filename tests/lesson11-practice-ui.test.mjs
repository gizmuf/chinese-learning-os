import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.requestAnimationFrame=fn=>{fn();return 0;};
const mocks={
 './i18n':`export const useI18n=()=>({locale:'en',t:s=>s});`,
 './study-lookup':`export const StudyText=({text})=>text;`,
 './study-dictionary':`export const DictionaryAudio=()=>null;`,
 './shared-writing':`export default ()=>null;`,
 './course-store':`export const useCourseProgress=()=>({events:[],ready:true});`,
 './audio':`export const playRecording=()=>{};export const stopAudio=()=>{};`,
 './use-swipe-navigation':`export const useSwipeNavigation=()=>({});`,
};
const b=await build({stdin:{contents:`export {Lesson11Practice} from './app/lesson11';export {lesson11Checks,lesson11ById} from './app/lesson11-data';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',loader:{'.css':'empty'},plugins:[{name:'lesson-context',setup(build){build.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));build.onResolve({filter:/^\.\//},args=>mocks[args.path]?{path:args.path,namespace:'mock'}:undefined);build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));}}]});
const file=join(mkdtempSync(join(tmpdir(),'lesson11-ui-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const ids=m.lesson11Checks.filter(q=>q.mode==='read').slice(0,2).map(q=>q.id);
const label=b=>b.children.filter(v=>typeof v==='string').join('');
const button=(r,text)=>r.root.findAllByType('button').find(b=>label(b)===text);
const options=r=>r.root.findAllByType('button').filter(b=>'aria-pressed' in b.props);

const data=new Map();globalThis.localStorage={getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};
async function mount(owner,record,events=[]){let r;await m.act(async()=>{r=m.renderer.create(m.createElement(m.Lesson11Practice,{ids,events,owner,ready:true,record,notify(){}}),{createNodeMock:()=>({focus(){}})});});return r;}
const target=m.lesson11ById.get(m.lesson11Checks.find(q=>q.id===ids[0]).targetId);
test('Lesson11 hint remains assisted across reload and owners stay isolated',async()=>{
 const rows=[],record=async e=>rows.push(e);let r=await mount('hint-owner',record);
 await m.act(async()=>button(r,'Show hint · supported attempt').props.onClick());await m.act(async()=>r.unmount());
 r=await mount('hint-owner',record);assert.ok(button(r,'Show hint · supported attempt').props.disabled);
 await m.act(async()=>button(r,target.meaning.en).props.onClick());await m.act(async()=>button(r,'Check answer').props.onClick());
 assert.equal(rows.length,1);assert.equal(rows[0].assisted,true);await m.act(async()=>r.unmount());
 r=await mount('other-owner',record);assert.equal(button(r,'Show hint · supported attempt').props.disabled,false);await m.act(async()=>r.unmount());
});
test('failed save freezes choice, hint, UUID and timestamp across reload and retry',async()=>{
 let fail=true;const attempts=[],record=async e=>{attempts.push({...e});if(fail)throw Error('disk');};let r=await mount('retry-owner',record);
 await m.act(async()=>options(r)[0].props.onClick());await m.act(async()=>button(r,'Check answer').props.onClick());
 const first=attempts[0];assert.ok(options(r).every(v=>v.props.disabled));await m.act(async()=>options(r)[1].props.onClick());
 await m.act(async()=>r.unmount());r=await mount('retry-owner',record);assert.ok(options(r).every(v=>v.props.disabled));fail=false;
 await m.act(async()=>button(r,'Check answer').props.onClick());assert.deepEqual(attempts.at(-1),first);assert.ok(button(r,'Result saved').props.disabled);await m.act(async()=>r.unmount());
 r=await mount('retry-owner',record);assert.ok(button(r,'Result saved').props.disabled);assert.equal(attempts.length,2);
 await m.act(async()=>button(r,'Start a new round').props.onClick());assert.ok(options(r).every(v=>!v.props.disabled));await m.act(async()=>r.unmount());
});
