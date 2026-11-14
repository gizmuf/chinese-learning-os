import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const b=await build({stdin:{contents:`export {ClozeSession} from './app/chunk-library';export {ChunkRecall} from './app/speaking-chunks';export {chunkExamples} from './app/speaking-chunks-data';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,loader:{'.css':'empty'},platform:'node',format:'esm',write:false,logLevel:'silent',alias:{react:require.resolve('react').replace(/\/index\.js$/,'')},plugins:[{name:'context',setup(build){build.onResolve({filter:/^\.\/(i18n|study-lookup|audio)$/},args=>({path:args.path,namespace:'mock'}));build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path.endsWith('i18n')?`export const useI18n=()=>({locale:'en',t:s=>s});`:args.path.endsWith('audio')?`export const stopAudio=()=>{};export const playRecording=()=>{};export const speak=()=>{};`:`import {createElement,useRef} from 'react';export const StudyText=({text})=>createElement('span',null,text);export const useDictionaryAssistance=callback=>{globalThis.chunkHelp=callback;return useRef(null);};`,loader:'js'}));}}]});
const dir=mkdtempSync(join(tmpdir(),'chunks-ui-')),file=join(dir,'test.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?text(node.children):'';
const button=(root,label)=>root.root.findAllByType('button').find(b=>text(b.props.children)===label);
const inputs=root=>root.root.findAllByType('input');
const props={ids:['chunk-frame-attitude-interest-1','chunk-frame-attitude-interest-2'],ready:true,notify:()=>{},onBusy:()=>{},onFinish:()=>{}};
async function mount(record){let root;await m.act(async()=>{root=m.renderer.create(m.createElement(m.ClozeSession,{...props,record}));});return root;}
async function fill(root,values){await m.act(async()=>values.forEach((value,i)=>inputs(root)[i].props.onChange({target:{value}})));}
test('Two separated holes hide their targets and pinyin until checking, then save one independent event',async()=>{const events=[],root=await mount(async e=>events.push(e));assert.equal(inputs(root).length,2);assert.ok(!text(root.toJSON()).includes('感兴趣'));assert.ok(!text(root.toJSON()).includes('gǎn'));await fill(root,['对','感兴趣']);await m.act(async()=>button(root,'Check & save').props.onClick());assert.equal(events.length,1);assert.equal(events[0].correct,true);assert.equal(events[0].assisted,false);assert.ok(text(root.toJSON()).includes('感兴趣'));await m.act(async()=>root.unmount());});
test('Audio and shared dictionary assistance are captured before scoring and cannot award independent recall',async()=>{for(const help of ['audio','dictionary']){const events=[],root=await mount(async e=>events.push(e));await m.act(async()=>{if(help==='audio')button(root,'Listen with help').props.onClick();else globalThis.chunkHelp();});await fill(root,['对','感兴趣']);await m.act(async()=>button(root,'Check & save').props.onClick());assert.equal(events[0].assisted,true);await m.act(async()=>root.unmount());}});
test('Retry after a storage failure preserves the exact submission UUID and answer',async()=>{const events=[],root=await mount(async e=>{events.push(e);if(events.length===1)throw Error('disk unavailable');});await fill(root,['对','喜欢']);await m.act(async()=>button(root,'Check & save').props.onClick());assert.equal(events[0].correct,false);await m.act(async()=>button(root,'Retry saving').props.onClick());assert.deepEqual(events[1],events[0]);assert.ok(text(root.toJSON()).includes('Saved to your notebook.'));await m.act(async()=>root.unmount());});
test('Next and Previous work before answering and do not create records',async()=>{const events=[],root=await mount(async e=>events.push(e));await m.act(async()=>root.root.findAllByType('button').find(b=>b.props['aria-label']==='Next').props.onClick());assert.ok(text(root.toJSON()).includes('2 / 2'));assert.equal(events.length,0);await m.act(async()=>root.root.findAllByType('button').find(b=>b.props['aria-label']==='Previous').props.onClick());assert.ok(text(root.toJSON()).includes('1 / 2'));await m.act(async()=>root.unmount());});
test('Returning to a cloze card retains draft and help, without crediting the intervening navigation',async()=>{
 const events=[],root=await mount(async e=>events.push(e));
 await fill(root,['对','感兴趣']);
 await m.act(async()=>button(root,'Listen with help').props.onClick());
 const go=async label=>m.act(async()=>root.root.findAllByType('button').find(b=>b.props['aria-label']===label).props.onClick());
 await go('Next');assert.equal(events.length,0);assert.deepEqual(inputs(root).map(input=>input.props.value),['','']);
 await go('Previous');assert.deepEqual(inputs(root).map(input=>input.props.value),['对','感兴趣']);
 await m.act(async()=>button(root,'Check & save').props.onClick());
 assert.deepEqual(events.map(({correct,assisted})=>({correct,assisted})),[{correct:true,assisted:true}]);
 await m.act(async()=>root.unmount());
});
test('Full-sentence recall keeps an exposed model answer assisted after changing cards',async()=>{
 const events=[];let root;
 const ids=m.chunkExamples.slice(0,2).map(example=>example.id);
 await m.act(async()=>{root=m.renderer.create(m.createElement(m.ChunkRecall,{...props,ids,record:async e=>events.push(e)}));});
 const go=async label=>m.act(async()=>root.root.findAllByType('button').find(b=>b.props['aria-label']===label).props.onClick());
 await m.act(async()=>button(root,'Show a model answer').props.onClick());
 await go('Next');assert.equal(events.length,0);await go('Previous');
 await m.act(async()=>root.root.findByType('textarea').props.onChange({target:{value:m.chunkExamples[0].hanzi}}));
 await m.act(async()=>button(root,'Check & save').props.onClick());
 assert.deepEqual(events.map(({correct,assisted})=>({correct,assisted})),[{correct:true,assisted:true}]);
 await m.act(async()=>root.unmount());
});
test.after(()=>{for(const handle of process._getActiveHandles())if(handle.constructor.name==='MessagePort')handle.unref();});
