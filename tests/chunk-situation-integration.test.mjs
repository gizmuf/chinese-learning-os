import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const mocks={
 i18n:`export const useI18n=()=>({locale:'en',t:x=>x});`,
 audio:`export const stopAudio=()=>{};export const playRecording=()=>{};`,
 'course-store':`const events=[];const sync=()=>{};export const useCourseProgress=()=>({events,ready:true,sync,status:'Ready',record(){throw Error('Lab must not write progress')}});`,
 'study-lookup':`export const StudyText=({text})=>text;export const useDictionaryAssistance=()=>false;`,
 'use-swipe-navigation':`export const useSwipeNavigation=()=>({});`,
 'chunk-library':`import {createElement,useState,useEffect} from 'react';export const mounts={count:0};export function ChunkLibrary(){const [filter,setFilter]=useState('all');useEffect(()=>{mounts.count++},[]);return createElement('input',{'data-library-filter':true,value:filter,onChange:e=>setFilter(e.target.value)})}export const ClozeSession=()=>null;`,
};
const bundle=await build({stdin:{contents:`export {default as Chunks} from './app/speaking-chunks';export {mounts} from './chunk-library';export {createElement} from 'react';export {create,act} from 'react-test-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,loader:{'.css':'empty'},plugins:[{name:'contexts',setup(build){build.onResolve({filter:/^\.\/(i18n|audio|course-store|study-lookup|use-swipe-navigation|chunk-library)$/},args=>({path:args.path.slice(2),namespace:'mock'}));build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:mocks[args.path],loader:'js',resolveDir:process.cwd()}));}}]});
const file=join(mkdtempSync(join(tmpdir(),'situation-integration-')),'bundle.mjs');writeFileSync(file,bundle.outputFiles[0].text);const m=await import(pathToFileURL(file));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.requestAnimationFrame=fn=>fn();
test.after(()=>{for(const h of process._getActiveHandles())if(h.constructor.name==='MessagePort')h.unref()});
const text=n=>typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):n?text(n.children):'';
test('Situation Lab retains the mounted original collection and its unsaved filters without progress writes',async()=>{
 const originalWindow=globalThis.window,originalDocument=globalThis.document;
 let url=new URL('http://localhost/?course=intensive&material=speaking-chunks&chunks=words&q=school#context');
 globalThis.window={get location(){return url},history:{replaceState(_s,_t,href){url=new URL(href,url)}},addEventListener(){},removeEventListener(){}};
 globalThis.document={addEventListener(){},removeEventListener(){}};
 let root;
 try{
  await m.act(()=>{root=m.create(m.createElement(m.Chunks,{owner:null,notify(){},onBack(){}}))});
  const library=()=>root.root.find(x=>x.props['data-library-filter']);
  await m.act(()=>library().props.onChange({target:{value:'HSK2 / 学'}}));
  const click=async(label)=>m.act(()=>root.root.findAllByType('button').find(b=>text(b.props.children)===label).props.onClick());
  await click('Situation Lab ↗');assert.equal(url.searchParams.get('chunklab'),'1');
  assert.equal(m.mounts.count,1);assert.equal(library().props.value,'HSK2 / 学');
  await click('Back to chunks');assert.equal(m.mounts.count,1);assert.equal(library().props.value,'HSK2 / 学');
  assert.equal(url.pathname+url.search+url.hash,'/?course=intensive&material=speaking-chunks&chunks=words&q=school#context');
 }finally{if(root)await m.act(()=>root.unmount());globalThis.window=originalWindow;globalThis.document=originalDocument;}
});
