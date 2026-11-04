import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const characters=new Map([
 ['晴',{text:'晴',pinyin:'qíng',meaning:'sunny',structure:{radical:'日',decomposition:'⿰日青'}}],
 ['青',{text:'青',pinyin:'qīng',meaning:'blue / green',structure:{radical:'青',decomposition:'⿱龶月'}}],
 ...['清','情','请','精','睛','静','倩','靖','蜻','菁'].map((text,i)=>[text,{text,pinyin:'reading-'+i,meaning:'meaning-'+i,structure:{radical:'氵',decomposition:'⿰氵青'}}])
]);
globalThis.__connectionsResources={headwords:new Set(['青年','青春','青山']),characters};globalThis.__readingRequests=[];
const b=await build({stdin:{contents:`export {default as Exploration} from './app/dictionary-exploration';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,loader:{'.css':'empty'},plugins:[{name:'mocks',setup(b){b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));b.onResolve({filter:/^\.\/(i18n|dictionary-client|atlas-cloud-highlight)$/},a=>({path:a.path,namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:{'./i18n':`export const useI18n=()=>({locale:'en'});`,'./dictionary-client':`export const loadDictionaryResources=async()=>globalThis.__connectionsResources;export const fetchDictionaryEntry=async text=>{globalThis.__readingRequests.push(text);if(globalThis.__deferPreviews)return new Promise(resolve=>globalThis.__pendingPreviews.push({text,resolve:()=>resolve({text,pinyin:'test',meaning:'definition'})}));return {text,pinyin:'test',meaning:'definition'};};`,'./atlas-cloud-highlight':`export default ({hanzi})=>hanzi;`}[a.path]}));}}]});
const file=join(mkdtempSync(join(tmpdir(),'connections-ui-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const text=n=>typeof n==='string'?n:(n.children??[]).map(text).join('');
const button=(r,label)=>r.root.findAllByType('button').find(n=>text(n)===label);
async function mount(entry=characters.get('青'),views=new Map()){const selected=[];let r;await m.act(async()=>{r=m.renderer.create(m.createElement(m.Exploration,{entry,dictionary:characters,onLookup:(value)=>selected.push(value),speaker:()=>null,renderSentence:(text)=>text,views}));});return {r,selected,views};}
test('family pages inspect characters through the existing lookup action and preserve exploration when returning',async()=>{
 const {r,selected,views}=await mount();const first=r.root.findAllByProps({className:'sp-connection-target'});assert.equal(first.length,8);await m.act(()=>first[0].props.onClick({currentTarget:{}}));assert.equal(selected.length,1);assert.notEqual(selected[0],'青');
 await m.act(()=>button(r,'Next').props.onClick());assert.equal(r.root.findAllByProps({className:'sp-connection-target'}).length,3);await m.act(()=>r.unmount());const again=await mount(characters.get('青'),views);assert.equal(again.r.root.findAllByProps({className:'sp-connection-target'}).length,3);await m.act(()=>again.r.unmount());
});
test('word previews fetch only the visible page and keep full definitions reachable',async()=>{
 const {r,selected}=await mount();globalThis.__readingRequests=[];await m.act(async()=>button(r,'Related words').props.onClick());const rows=r.root.findAllByProps({className:'sp-connection-target'});assert.equal(rows.length,3);assert.equal(__readingRequests.length,3);await m.act(()=>rows[0].props.onClick({currentTarget:{}}));assert.ok(['青年','青春','青山'].includes(selected[0]));await m.act(()=>r.unmount());
});
test('lesson occurrences paginate the actual matching material without navigation or losing the current entry',async()=>{
 const {r}=await mount({text:'我',pinyin:'wǒ',meaning:'I'});await m.act(()=>button(r,'In lessons').props.onClick());const articles=r.root.findAllByType('article'),firstSource=articles[0].props['data-study-source-id'];assert.equal(articles.length,5);assert.ok(articles.every(a=>a.props['data-study-source-id']&&a.props['data-study-sentence'].includes('我')));assert.equal(r.root.findAllByType('a').length,0);assert.equal(r.root.findAllByType('select').length,1);await m.act(()=>button(r,'Next').props.onClick());assert.notEqual(r.root.findAllByType('article')[0].props['data-study-source-id'],firstSource);await m.act(()=>r.unmount());
});

test('rapid word-page changes never exceed the shared three-request preview budget or fetch abandoned queued rows',async()=>{
 const original=globalThis.__connectionsResources;globalThis.__connectionsResources={headwords:new Set(['青一','青二','青三','青四','青五','青六','青七','青八','青九']),characters};globalThis.__deferPreviews=true;globalThis.__pendingPreviews=[];
 const {r}=await mount();await m.act(()=>button(r,'Related words').props.onClick());assert.equal(__pendingPreviews.length,3);await m.act(()=>button(r,'Next').props.onClick());assert.equal(__pendingPreviews.length,3);
 await m.act(async()=>{for(const task of __pendingPreviews.slice())task.resolve();await new Promise(resolve=>setTimeout(resolve,0));});assert.equal(__pendingPreviews.length,4);await m.act(async()=>{__pendingPreviews[3].resolve();await new Promise(resolve=>setTimeout(resolve,0));});assert.equal(__pendingPreviews.length,4);await m.act(()=>r.unmount());globalThis.__deferPreviews=false;globalThis.__connectionsResources=original;
});
