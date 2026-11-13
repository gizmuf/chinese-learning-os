import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const result=await build({stdin:{contents:`export {Lesson05Gloss} from './app/lesson05-context';export {LookupContext,StudyLookupButton} from './app/study-lookup-context';export {appStudyDictionary} from './app/study-lookup-model';export {videoDictionary,videoStudy} from './app/video-study-data';export {createElement as h} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd()},bundle:true,format:'cjs',platform:'node',jsx:'automatic',write:false,loader:{'.css':'empty'},logLevel:'silent',plugins:[{name:'ui-environment',setup(b){
 b.onResolve({filter:/^\.\/i18n$/},()=>({path:'locale',namespace:'test-ui'}));
 b.onResolve({filter:/^\.\/study-dictionary$/},()=>({path:'dialog',namespace:'test-ui'}));
 b.onLoad({filter:/.*/,namespace:'test-ui'},a=>({contents:a.path==='locale'?`export const useI18n=()=>({locale:'en',t:v=>v});`:`import {createElement as h} from 'react';export const DictionaryWords=({text,onLookup})=>h('button',{onClick:e=>onLookup(text,e.currentTarget)},text);export const DictionaryAudio=()=>null;export const StudyDictionaryDialog=props=>h('dialog',{'data-entry':props.entry?.text??'','data-meaning':props.entry?.meaning??'',onClose:props.onClose});`,loader:'js',resolveDir:process.cwd()}));
}}]});
const module={exports:{}};new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);const m=module.exports;
test.after(()=>{for(const handle of process._getActiveHandles())if(handle.constructor.name==='MessagePort')handle.unref();});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
test('lesson gloss and explicit dictionary action share the same provider handler and trigger',async()=>{
 const calls=[],dictionary=new Map([['姓',{text:'姓',pinyin:'xìng',meaning:'surname'}]]),value={dictionary,open:(...args)=>calls.push(args)},trigger={id:'source-trigger'};let root;
 await m.act(async()=>{root=m.renderer.create(m.h(m.LookupContext.Provider,{value},m.h('section',{},m.h(m.Lesson05Gloss,{text:'姓',notify:()=>{},dictionaryOverride:dictionary}),m.h(m.StudyLookupButton,{text:'姓'}))))});
 assert.equal(root.root.findAllByType('dialog').length,0,'shared route must not mount a competing local dialog');
 const buttons=root.root.findAllByType('button');
 for(const button of buttons)await m.act(async()=>button.props.onClick({currentTarget:trigger,stopPropagation(){}}));
 assert.deepEqual(calls,[['姓',trigger],['姓',trigger]]);await m.act(async()=>root.unmount());
});
test('character mode routes each selected character through the shared provider',async()=>{
 const calls=[],trigger={},dictionary=new Map();let root;
 await m.act(async()=>{root=m.renderer.create(m.h(m.LookupContext.Provider,{value:{dictionary,open:(...a)=>calls.push(a)}},m.h(m.Lesson05Gloss,{text:'姓生。',notify:()=>{},charactersOnly:true,dictionaryOverride:dictionary})))});
 const buttons=root.root.findAllByType('button');assert.equal(buttons.length,2);
 await m.act(async()=>buttons[1].props.onClick({currentTarget:trigger}));assert.deepEqual(calls,[['生',trigger]]);assert.equal(root.root.findAllByType('dialog').length,0);await m.act(async()=>root.unmount());
});
test('standalone lesson gloss preserves its local dictionary override and dialog fallback',async()=>{
 const dictionary=new Map([['姓',{text:'姓',pinyin:'xìng',meaning:'standalone surname'}]]);let root;
 await m.act(async()=>{root=m.renderer.create(m.h(m.Lesson05Gloss,{text:'姓',notify:()=>{},dictionaryOverride:dictionary}))});
 assert.equal(root.root.findAllByType('dialog').length,1);
 await m.act(async()=>root.root.findByType('button').props.onClick({currentTarget:{}}));
 assert.equal(root.root.findByType('dialog').props['data-entry'],'姓');assert.equal(root.root.findByType('dialog').props['data-meaning'],'standalone surname');await m.act(async()=>root.unmount());
});
test('shared dictionary preserves video character coverage and readable localized entries',()=>{
 for(const locale of ['en','fr','ru','tr']){
  const shared=m.appStudyDictionary(locale),video=m.videoDictionary(locale);
  for(const char of new Set(m.videoStudy.segments.flatMap(v=>Array.from(v.hanzi).filter(ch=>/\p{Script=Han}/u.test(ch))))){
   assert.ok(video.get(char),char);const row=shared.get(char);assert.ok(row?.pinyin,char+' pinyin');assert.ok(row.meaning,char+' meaning');assert.ok(row.audio,char+' audio');assert.equal(row.audio.text,char,char+' character audio');
  }
 }
});
test('video passage exposes authored context, not a reconstructed generic sentence',()=>{
 const source=readFileSync('app/video-study.tsx','utf8');
 for(const attr of ['data-study-sentence={v.hanzi}','data-study-pinyin={v.pinyin}','data-study-meaning={v.meaning[locale]}',"data-study-source-id={'video-'+v.id}"])assert.ok(source.includes(attr),attr);
 assert.match(source,/Lesson05Gloss text={v.hanzi}/);
});
