import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const require=createRequire(import.meta.url);
const result=await build({stdin:{contents:`export {default as Guide} from './app/dictionary-component-guide';export {StudyDictionaryDialog as Dialog} from './app/study-dictionary';export {createElement as h,createRef} from 'react';export {renderToStaticMarkup as render} from 'react-dom/server';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd()},bundle:true,format:'cjs',platform:'node',jsx:'automatic',write:false,loader:{'.css':'empty'},logLevel:'silent',plugins:[{name:'locale',setup(b){b.onResolve({filter:/^\.\/i18n$/},()=>({path:'mock',namespace:'locale'}));b.onLoad({filter:/.*/,namespace:'locale'},()=>({contents:`export const useI18n=()=>({locale:'en',t:text=>text});`,loader:'js'}));}}]});
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);const m=module.exports;
test.after(()=>{for(const handle of process._getActiveHandles())if(handle.constructor.name==='MessagePort')handle.unref();});
const rows=JSON.parse(readFileSync('data/hanzi-structure.json')).characters;
const dictionary=new Map(rows.map(r=>[r.hanzi,{text:r.hanzi,pinyin:r.readings.join(' / '),meaning:r.definition,structure:r}]));
for(const [text,row] of Object.entries(JSON.parse(gunzipSync(readFileSync('public/dictionary/characters.json.gz')))))if(!dictionary.has(text))dictionary.set(text,{text,pinyin:(row.pinyin??[]).join(' / '),meaning:row.definition,structure:row});
const guide=text=>m.h(m.Guide,{text,structure:dictionary.get(text).structure,dictionary,onLookup:()=>{}});
test('surname shows both direct components and distinguishes the dictionary radical',()=>{
 const html=m.render(guide('姓'));assert.match(html,/Open component 生/);assert.match(html,/Open component 女/);assert.match(html,/shēng/);assert.match(html,/nǚ/);assert.match(html,/Dictionary radical/);assert.match(html,/not a historical explanation/);assert.doesNotMatch(html,/Invented memory aid/);
 const css=readFileSync('app/dictionary-component-guide.css','utf8');assert.match(css,/min-width:54px;min-height:54px/);
});
test('component guide can recursively open source-recorded parts without leaving definition',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;let root,current='姓';const visits=[];
 const onLookup=(text)=>{visits.push(text);current=text;root.update(view())};
 const view=()=>m.h(m.Guide,{text:current,structure:dictionary.get(current).structure,dictionary,onLookup});
 await m.act(async()=>{root=m.renderer.create(view())});
 for(const glyph of ['生','土','十'])await m.act(async()=>root.root.findAllByType('button').find(b=>b.props['aria-label']==='Open component '+glyph).props.onClick({currentTarget:{}}));
 assert.deepEqual(visits,['生','土','十']);await m.act(async()=>root.unmount());
});
test('terminal components are honest rather than showing an empty clickable promise',()=>{
 const html=m.render(guide('女'));assert.match(html,/No smaller parts are recorded/);assert.doesNotMatch(html,/Open component 女/);
 const src=readFileSync('app/study-dictionary.tsx','utf8');assert.match(src,/className="sp-component-path"/);assert.match(src,/history\.slice\(0,index\)/);assert.match(src,/data-study-source-restore="true"/);
});
