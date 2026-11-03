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
const b=await build({stdin:{contents:`export {Lesson10Practice} from './app/lesson10';export {lesson10Checks,lesson10ById} from './app/lesson10-data';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',loader:{'.css':'empty'},plugins:[{name:'lesson-context',setup(build){build.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));build.onResolve({filter:/^\.\//},args=>mocks[args.path]?{path:args.path,namespace:'mock'}:undefined);build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js'}));}}]});
const file=join(mkdtempSync(join(tmpdir(),'lesson10-ui-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const ids=m.lesson10Checks.filter(q=>q.mode==='read').slice(0,2).map(q=>q.id);
const label=b=>b.children.filter(v=>typeof v==='string').join('');
const button=(r,text)=>r.root.findAllByType('button').find(b=>label(b)===text);
const options=r=>r.root.findAllByType('button').filter(b=>'aria-pressed' in b.props);
test('actual Lesson10 practice restores persisted results read-only and requires an explicit new round for another grade',async()=>{
 const rows=[];const record=async e=>{rows.push(e);};
 const mount=async events=>{let r;await m.act(async()=>{r=m.renderer.create(m.createElement(m.Lesson10Practice,{ids,events,ready:true,record,notify(){}}),{createNodeMock:()=>({focus(){}})});});return r;};
 let r=await mount([]);
 const target=m.lesson10ById.get(m.lesson10Checks.find(q=>q.id===ids[0]).targetId);
 await m.act(async()=>button(r,target.meaning.en).props.onClick());
 await m.act(async()=>{await button(r,'Check answer').props.onClick();});
 assert.equal(rows.length,1);assert.equal(rows[0].correct,true);const originalId=rows[0].id;
 await m.act(async()=>button(r,'Next').props.onClick());await m.act(async()=>button(r,'Previous').props.onClick());
 assert.ok(button(r,'Result saved').props.disabled);assert.ok(options(r).every(b=>b.props.disabled));
 await m.act(async()=>r.unmount());r=await mount([...rows]);
 assert.ok(button(r,'Result saved').props.disabled);assert.ok(options(r).every(b=>b.props.disabled));assert.equal(rows.length,1,'mount/reload must never grade');
 await m.act(async()=>button(r,'Start a new round').props.onClick());assert.ok(button(r,'Check answer').props.disabled);assert.ok(options(r).every(b=>!b.props.disabled));
 await m.act(async()=>button(r,target.meaning.en).props.onClick());await m.act(async()=>button(r,'Check answer').props.onClick());
 assert.equal(rows.length,2);assert.notEqual(rows[1].id,originalId);
 await m.act(async()=>r.unmount());r=await mount([]);assert.ok(options(r).every(b=>!b.props.disabled),'another owner with no events starts ungraded');await m.act(async()=>r.unmount());
});
