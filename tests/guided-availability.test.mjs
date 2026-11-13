import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';import {mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.ResizeObserver=class{observe(){}disconnect(){}};
const b=await build({stdin:{contents:`export {default as Guided} from './app/guided';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{name:'ui',setup(b){b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));b.onResolve({filter:/^(hanzi-writer|\.\/i18n|\.\/writing-pointer)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='./i18n'?`export const useI18n=()=>({locale:'en',t:s=>s});`:a.path==='./writing-pointer'?`export const WritingSvgTarget={create(){return {dispose(){}}}};`:`export default {create(node,char,options){return {animateCharacter(){return options.charDataLoader(char).catch(()=>{options.onLoadCharDataError();});},quiz(){},cancelQuiz(){},updateDimensions(){}}}};`,loader:'js'}));}}]});
const file=join(mkdtempSync(join(tmpdir(),'guided-failure-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));const tick=()=>new Promise(r=>setTimeout(r,0));const act=fn=>m.act(async()=>{await fn();await tick();});
test('a failed loader with a resolved animation promise cannot complete; an actual retry can complete only after data is ready',async()=>{
 let fail=true,completions=0;const availability=[];globalThis.fetch=async()=>({ok:!fail,status:fail?503:200,json:async()=>({strokes:['M0 0'],medians:[[[0,0],[1,1]]]})});let r;
 await act(()=>{r=m.renderer.create(m.createElement(m.Guided,{character:'呆',mode:'watch',replay:0,penOnly:false,onComplete:()=>completions++,onMistake(){},onAvailabilityChange:value=>availability.push(value)}),{createNodeMock:()=>({replaceChildren(){},getBoundingClientRect(){return {width:300}}})});});
 assert.equal(completions,0,'HanziWriter can resolve after a failed loader; this is not successful completion');assert.ok(JSON.stringify(r.toJSON()).includes('Character data unavailable'));assert.equal(availability.at(-1),false);
 fail=false;const retry=r.root.findAllByType('button').find(b=>b.children.join('').includes('Retry'));assert.ok(retry,'Real retry control');await act(()=>retry.props.onClick());assert.equal(completions,1);assert.equal(availability.at(-1),true);await act(()=>r.unmount());
});
test('empty 200 static responses use one validated API fallback; invalid fallback never unlocks writing',async()=>{
 for(const valid of [true,false]){
  const urls=[];let completions=0;const availability=[];
  globalThis.fetch=async url=>{urls.push(url);return {ok:true,status:200,json:async()=>{if(url.startsWith('/characters/'))throw new SyntaxError('Unexpected end of JSON input');return valid?{strokes:['M0 0'],medians:[[[0,0],[1,1]]]}:{strokes:[],medians:[]};}};};
  let r;await act(()=>{r=m.renderer.create(m.createElement(m.Guided,{character:'脑',mode:'watch',replay:0,penOnly:false,onComplete:()=>completions++,onMistake(){},onAvailabilityChange:value=>availability.push(value)}),{createNodeMock:()=>({replaceChildren(){},getBoundingClientRect(){return {width:300}}})});});
  assert.deepEqual(urls,['/characters/%E8%84%91.json','/api/character-data?character=%E8%84%91']);
  assert.equal(completions,valid?1:0);assert.equal(availability.at(-1),valid);
  await act(()=>r.unmount());
 }
});
