import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const compiled=await build({stdin:{contents:`export {default as Badge} from './app/hsk-badge';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-test-renderer'],loader:{'.css':'empty'},plugins:[{name:'badge-only',setup(b){b.onResolve({filter:/^\.\/(i18n|dictionary-client)$/},a=>({path:a.path,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='./i18n'?`export const useI18n=()=>({locale:'en'});`:`export const loadHskLevelResource=()=>globalThis.__hskFetch();`}));}}]});
function module(){const out={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(require,out,out.exports);return out.exports;}
const payload=JSON.parse(gunzipSync(readFileSync('public/dictionary/hsk-levels-2025.json.gz')));
test('all badges share one metadata request, retain the existing subtle badge class, and distinguish word and character levels',async()=>{
 const m=module();let calls=0,resolve;globalThis.__hskFetch=()=>{calls++;return new Promise(r=>resolve=r);};let r;
 await m.act(()=>{r=m.renderer.create(m.createElement('div',null,...['青','基本','暨'].map(text=>m.createElement(m.Badge,{text,key:text}))));});
 assert.equal(calls,1);assert.equal(r.root.findAllByProps({className:'dictionary-hsk-badge'}).length,3);
 await m.act(async()=>{resolve(payload);await Promise.resolve();});
 const badges=r.root.findAllByType('small');assert.deepEqual(badges.map(b=>b.children.join('')),['HSK 4','HSK 4','HSK 7–9']);assert.equal(badges[0].props['data-hsk-kind'],'character');assert.equal(badges[1].props['data-hsk-kind'],'word');
 await m.act(()=>r.update(m.createElement(m.Badge,{text:'讠'})));assert.equal(r.root.findByType('small').children.join(''),'Out of scope');assert.equal(calls,1);await m.act(()=>r.unmount());
});
test('metadata failure does not label a word as unlisted or break lookup, and reopening retries',async()=>{
 const m=module();let calls=0;globalThis.__hskFetch=async()=>{if(++calls===1)return {...payload,characters:{...payload.characters,'7-9':''}};return payload;};let r;
 await m.act(async()=>{r=m.renderer.create(m.createElement(m.Badge,{text:'基本'}));});assert.equal(r.root.findByType('small').children.join(''),'HSK ?');
 await m.act(()=>r.unmount());await m.act(async()=>{r=m.renderer.create(m.createElement(m.Badge,{text:'基本'}));});assert.equal(r.root.findByType('small').children.join(''),'HSK 4');assert.equal(calls,2);await m.act(()=>r.unmount());
});

test('the badge distinguishes role fallback, equivalents, unresolved readings and verified absence',async()=>{
 const m=module();globalThis.__hskFetch=async()=>payload;
 const examples=[
  {text:'木',kind:'word'},
  {text:'青',kind:'word'},
  {text:'榘'},{text:'碁'},
  {text:'乾'},{text:'乾',pinyin:'gān'},{text:'乾',pinyin:'qián'},
  {text:'徵'},{text:'徵',pinyin:'zhēng'},
  {text:'冉'},{text:'再'},{text:'付'},{text:'寸'},
 ];
 let r;
 await m.act(async()=>{r=m.renderer.create(m.createElement('div',null,...examples.map((props,i)=>m.createElement(m.Badge,{...props,key:i}))));});
 const badges=r.root.findAllByType('small');
 assert.deepEqual(badges.map(b=>b.children.join('')),['HSK 5','HSK 5','HSK 6 ≈','HSK 6 ≈','HSK unresolved','HSK 3 ≈','Out of scope','HSK unresolved','HSK 5 ≈','Out of scope','HSK 1','HSK 4','HSK 6']);
 assert.equal(badges[0].props['data-hsk-kind'],'character');
 assert.equal(badges[1].props['data-hsk-kind'],'word');
 assert.equal(badges[2].props['data-hsk-equivalent'],'矩');
 assert.equal(badges[9].props.title,'Not listed in HSK 2025 levels 1–9');
 await m.act(async()=>r.unmount());
});
