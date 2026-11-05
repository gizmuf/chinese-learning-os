import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const compiled=await build({stdin:{contents:`export {default as Badge} from './app/hsk-badge';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-test-renderer'],loader:{'.css':'empty'},plugins:[{name:'badge-only',setup(b){b.onResolve({filter:/^\.\/(i18n|dictionary-client)$/},a=>({path:a.path,namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='./i18n'?`export const useI18n=()=>({locale:'en'});`:`export const loadHskLevelResource=()=>globalThis.__hskFetch();`}));}}]});
function module(){const out={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(require,out,out.exports);return out.exports;}
const payload={version:1,words:{'1':'你|书店','2':'','3':'银行','4':'基本','5':'青','6':'','7-9':'朝气蓬勃'},characters:{'1':'你书','2':'','3':'银','4':'青基','5':'','6':'','7-9':'暨'}};
test('all badges share one metadata request, retain the existing subtle badge class, and distinguish word and character levels',async()=>{
 const m=module();let calls=0,resolve;globalThis.__hskFetch=()=>{calls++;return new Promise(r=>resolve=r);};let r;
 await m.act(()=>{r=m.renderer.create(m.createElement('div',null,...['青','基本','暨'].map(text=>m.createElement(m.Badge,{text,key:text}))));});
 assert.equal(calls,1);assert.equal(r.root.findAllByProps({className:'dictionary-hsk-badge'}).length,3);
 await m.act(async()=>{resolve(payload);await Promise.resolve();});
 const badges=r.root.findAllByType('small');assert.deepEqual(badges.map(b=>b.children.join('')),['HSK 4','HSK 4','HSK 7–9']);assert.equal(badges[0].props['data-hsk-kind'],'character');assert.equal(badges[1].props['data-hsk-kind'],'word');
 await m.act(()=>r.update(m.createElement(m.Badge,{text:'讠'})));assert.equal(r.root.findByType('small').children.join(''),'HSK —');assert.equal(calls,1);await m.act(()=>r.unmount());
});
test('metadata failure does not label a word as unlisted or break lookup, and reopening retries',async()=>{
 const m=module();let calls=0;globalThis.__hskFetch=async()=>{if(++calls===1)throw Error('offline');return payload;};let r;
 await m.act(async()=>{r=m.renderer.create(m.createElement(m.Badge,{text:'基本'}));});assert.equal(r.root.findByType('small').children.join(''),'HSK ?');
 await m.act(()=>r.unmount());await m.act(async()=>{r=m.renderer.create(m.createElement(m.Badge,{text:'基本'}));});assert.equal(r.root.findByType('small').children.join(''),'HSK 4');assert.equal(calls,2);await m.act(()=>r.unmount());
});
