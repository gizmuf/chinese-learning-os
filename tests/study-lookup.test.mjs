import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const r=await build({entryPoints:['app/study-lookup-model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
const d=m.appStudyDictionary('en');
test('Family Journey sentence resolves the clicked word and its individual characters',()=>{
 const sentence='请从这个门出。';assert.equal(m.lookupAtOffset(sentence,4,d),'门');assert.equal(m.lookupAtOffset(sentence,5,d),'出');assert.ok(d.get('门').pinyin.includes('mén'));assert.ok(d.get('门').meaning);assert.equal(d.get('出国').pinyin,'chūguó');
});
test('Punctuation and whitespace cannot resolve to a neighbouring Chinese word',()=>{
 for(const offset of [-1,6,7,8,Infinity,1.2])assert.equal(m.lookupAtOffset('请从这个门出。 ',offset,d),null);
 assert.equal(m.lookupAtOffset('你好',0,d),'你好');assert.equal(m.lookupAtOffset('你好',1,d),'你好');
});
test('Shared dictionary recordings point to real assets, including all course word sources',()=>{
 const missing=[...d.values()].filter(e=>e.audio&&!existsSync('public'+decodeURIComponent(e.audio.source))).map(e=>[e.text,e.audio.source]);assert.deepEqual(missing,[]);
 for(const locale of ['en','fr','ru','tr']){const dictionary=m.appStudyDictionary(locale);for(const ch of ['门','出','国','请','既','臭']){assert.ok(dictionary.get(ch)?.pinyin);assert.ok(dictionary.get(ch)?.meaning);}}
});
const ui=await build({stdin:{contents:`import {createElement as h} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import Provider,{StudyText,StudyLookupButton} from './app/study-lookup';const props={notify:()=>{},penOnly:false,setPenOnly:()=>{}};export const sentence=renderToStaticMarkup(h(Provider,props,h('p',{lang:'zh-Hans'},h(StudyText,{text:'请从这个门出。',anchor:'出'}))));export const word=renderToStaticMarkup(h(Provider,props,h('strong',{},h(StudyText,{text:'出国',whole:true}))));export const lookup=renderToStaticMarkup(h(Provider,props,h(StudyLookupButton,{text:'出国'})));`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,loader:{'.css':'empty'},logLevel:'silent'});
const module={exports:{}};new Function('require','module','exports',ui.outputFiles[0].text)(createRequire(import.meta.url),module,module.exports);
test('Journey context provides separate keyboard-accessible word targets and preserves the shared-character highlight',()=>{
 const html=module.exports.sentence;assert.match(html,/class="study-word" lang="zh-Hans"><span>门<\/span><\/button>/);assert.match(html,/class="wf-shared">出<\/span>/);assert.doesNotMatch(html,/>请从这个门出。<\/button>/);
 assert.match(module.exports.word,/>出国<\/button>/);assert.match(module.exports.lookup,/aria-label="Definition: 出国"/);
 assert.doesNotMatch(html,/<button[^>]*>(?:(?!<\/button>)[\s\S])*<button/);
});
