import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const mock=`let words=[],fail=false,requests=[],pending=new Map(),active=0,peak=0;export function setup(w,f=false){words=w;fail=f;requests=[];pending=new Map();active=peak=0;}export const loadDictionaryResources=async()=>{if(fail)throw Error('offline');return {headwords:new Set(words),characters:new Map()}};export function fetchDictionaryEntry(text){requests.push(text);active++;peak=Math.max(active,peak);return new Promise((resolve,reject)=>pending.set(text,{resolve,reject})).finally(()=>active--)}export function complete(text,value){pending.get(text)?.resolve(value)}export function reject(text){pending.get(text)?.reject(Error('offline'))}export const inspect=()=>({requests:[...requests],active,peak});`;
const b=await build({stdin:{contents:`export {default as Family} from './app/dictionary-word-family';export * from './dictionary-client';export {createElement} from 'react';export {create,act} from 'react-test-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,loader:{'.css':'empty'},plugins:[{name:'isolated-hsk-metadata',setup(b){b.onResolve({filter:/^\.\/hsk-badge$/},()=>({path:'badge',namespace:'isolated-hsk'}));b.onLoad({filter:/.*/,namespace:'isolated-hsk'},()=>({contents:'export default function Badge(){return null;}'}));}},{name:'mock',setup(b){b.onResolve({filter:/dictionary-client$/},a=>({path:'client',namespace:'test'}));b.onResolve({filter:/study-lookup-context$/},a=>({path:'lookup',namespace:'test'}));b.onLoad({filter:/.*/,namespace:'test'},a=>({contents:a.path==='client'?mock:`import {createElement} from 'react';const dictionary=new Map([['树林',{text:'树林',pinyin:'shùlín',meaning:'woods / grove'}]]);export const useStudyLookup=()=>({dictionary});export const StudyText=({text})=>createElement('button',null,text);`,loader:'js',resolveDir:process.cwd()}));}}]});
const file=join(mkdtempSync(join(tmpdir(),'dictionary-family-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));globalThis.IS_REACT_ACT_ENVIRONMENT=true;
test.after(()=>{for(const handle of process._getActiveHandles())if(handle.constructor.name==='MessagePort')handle.unref();});
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(''):n?text(n.children):'';
const tick=()=>new Promise(r=>setTimeout(r,0));async function settle(){await m.act(async()=>{await tick();await tick()});}
const button=(r,label)=>r.root.findAllByType('button').find(b=>text(b.props.children).startsWith(label));
async function mount(words=[],failed=false,current=['电视'],character='电'){m.setup(words,failed);let r;await m.act(async()=>{r=m.create(m.createElement(m.Family,{character,currentWords:current,structuralCount:2}));await tick();});await settle();return r;}
async function click(r,label){const b=button(r,label);assert.ok(b,label);await m.act(()=>b.props.onClick());await settle();}
test('course word readings and meanings remain visible when broader dictionary resources fail',async()=>{
 const r=await mount([],true);assert.ok(text(r.toJSON()).includes('diànshì'));assert.ok(text(r.toJSON()).includes('television'));assert.equal(m.inspect().requests.length,0);
 assert.ok(text(r.toJSON()).includes('Could not load the broader word list'));await m.act(()=>r.unmount());
});
test('broader rows distinguish missing entry from resource failure and support retry',async()=>{
 const r=await mount(['电甲','电乙'],false,[]);await click(r,'Broader dictionary');const requested=m.inspect().requests;assert.equal(requested.length,2);
 await m.act(()=>{m.complete(requested[0],undefined);m.reject(requested[1]);});await settle();
 assert.ok(text(r.toJSON()).includes('No dictionary entry available'));assert.ok(text(r.toJSON()).includes('Could not load this reading'));assert.ok(button(r,'Retry reading'));
 await click(r,'Retry reading');await m.act(()=>m.complete(requested[1],{text:requested[1],pinyin:'diàn yǐ',meaning:'fixture meaning'}));await settle();
 assert.ok(text(r.toJSON()).includes('diàn yǐ'));assert.ok(text(r.toJSON()).includes('fixture meaning'));await m.act(()=>r.unmount());
});
test('only visible rows load, concurrency is bounded, and late responses cannot alter the next page',async()=>{
 const words=Array.from('甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉',glyph=>'电'+glyph),r=await mount(words,false,[]);await click(r,'Broader dictionary');assert.equal(m.inspect().requests.length,3);assert.equal(m.inspect().peak,3);
 const old=m.inspect().requests.slice();await click(r,'Next words');assert.equal(m.inspect().requests.length,3);
 await m.act(()=>{for(const word of old)m.complete(word,{text:word,pinyin:'old',meaning:'stale previous page'});});await settle();
 const current=m.inspect().requests.filter(w=>!old.includes(w));assert.equal(current.length,2);assert.equal(m.inspect().peak,3);
 await m.act(()=>{for(const word of current)m.complete(word,{text:word,pinyin:'new',meaning:'current page'});});await settle();
 assert.ok(!text(r.toJSON()).includes('stale previous page'));assert.ok(text(r.toJSON()).includes('current page'));assert.equal(m.inspect().requests.length,5);await m.act(()=>r.unmount());
});

test('authored Atlas words reuse the shared dictionary instead of a broader proper-name sense',async()=>{const r=await mount([],true,['树林'],'林');assert.ok(text(r.toJSON()).includes('shùlín'));assert.ok(text(r.toJSON()).includes('woods / grove'));assert.equal(m.inspect().requests.length,0);await m.act(()=>r.unmount());});
