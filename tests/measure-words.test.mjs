import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync,existsSync,mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);globalThis.require=require;
const bundle=await build({stdin:{contents:`export * from './app/measure-words-model';export {items} from './app/content';export {appStudyDictionary} from './app/study-lookup-model';export {contextualDictionaryEntry} from './app/dictionary-source-model';export {authoredCharacterReadings} from './app/pinyin-boundaries';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const modelFile=join(mkdtempSync(join(tmpdir(),'measure-model-')),'bundle.mjs');writeFileSync(modelFile,bundle.outputFiles[0].text);const m=await import(pathToFileURL(modelFile));
test('72 distinct practical entries cover every group, with two aligned examples and real stroke data',()=>{
 assert.equal(m.measureWords.length,72);assert.equal(new Set(m.measureWords.map(w=>w.hanzi)).size,72);assert.equal(new Set(m.measureWords.map(w=>w.id)).size,72);
 assert.deepEqual([...new Set(m.measureWords.map(w=>w.group))].sort(),[...m.measureGroups].sort());
 for(const w of m.measureWords){assert.ok(w.meaning);assert.ok(/[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/u.test(w.pinyin),w.hanzi);assert.equal(w.examples.length,2);
  for(const e of w.examples){assert.ok(e.hanzi.includes(w.hanzi),e.hanzi);assert.ok(e.english);const readings=m.authoredCharacterReadings(e.hanzi,e.pinyin);assert.ok(readings,e.hanzi+': '+e.pinyin);const pos=e.hanzi.indexOf(w.hanzi);if(w.hanzi.length===1)assert.equal(readings[pos].pinyin,w.pinyin,e.hanzi);}
  for(const ch of new Set([w.hanzi,...w.examples.map(e=>e.hanzi)].join(''))){const glyph=JSON.parse(readFileSync(`node_modules/hanzi-writer-data/${ch}.json`));assert.ok(glyph.strokes.length,ch);}
 }
});
test('classroom targets, tones, variants and beginner rules remain explicit',()=>{
 const shan=m.measureWords.find(w=>w.hanzi==='扇'),zhi=m.measureWords.find(w=>w.hanzi==='只');assert.equal(shan.pinyin,'shàn');assert.deepEqual(shan.examples.map(e=>[e.hanzi,e.pinyin]),[['一扇门','yí shàn mén'],['一扇窗','yí shàn chuāng']]);assert.equal(zhi.pinyin,'zhī');assert.equal(zhi.examples[0].hanzi,'一只猫');assert.equal(zhi.examples[0].pinyin,'yì zhī māo');
 for(const q of ['扇','SHAN','shan4','shàn','door','chuang','chuāng','window'])assert.ok(m.matchesMeasureWord(shan,q),q);
 assert.ok(m.matchesMeasureWord(zhi,'cat'));assert.ok(!m.matchesMeasureWord(shan,'unrelated'));
 assert.equal(m.measureWords.find(w=>w.hanzi==='个').examples[1].hanzi,'两个苹果');
});
test('curriculum counts and IDs are unchanged; 40 exact existing cards are reused by reading',()=>{
 assert.equal(m.items.length,1020);assert.equal(m.items.filter(w=>w.hskLevel===1).length,300);assert.equal(m.items.filter(w=>w.hskLevel===2).length,200);assert.equal(m.items.filter(w=>w.hskLevel===3).length,500);assert.equal(m.items.filter(w=>!w.hskLevel).length,20);
 assert.equal(m.measureWords.filter(w=>m.measureCanonical(w)).length,40);
 assert.equal(m.measureCanonical(m.measureWords.find(w=>w.hanzi==='只')).id,'hsk1-287');
 assert.equal(m.measureCanonical({hanzi:'只',pinyin:'zhǐ'})?.pinyin,'zhǐ');
 assert.equal(m.measureCanonical(m.measureWords.find(w=>w.hanzi==='扇')),undefined);
});
test('shared dictionary adds missing headwords and classifier senses without replacing earlier readings/IDs/audio',()=>{
 const old={text:'只',pinyin:'zhǐ',meaning:'only',audio:{text:'只',pinyin:'zhǐ',source:'/existing.mp3',context:false},word:{id:'original',pinyin:'zhǐ'}};
 const d=m.addMeasureDictionary(new Map([['只',old]]));assert.equal(d.get('只').word.id,'original');assert.equal(d.get('只').audio,old.audio);assert.equal(d.get('只').pinyin,'zhǐ');assert.match(d.get('只').meaning,/only/);
 const first=JSON.stringify([...d]);m.addMeasureDictionary(d);assert.equal(JSON.stringify([...d]),first);
 const contextual=m.contextualDictionaryEntry(d.get('只'),{text:'一只猫',pinyin:'yì zhī māo',meaning:'one cat'});assert.equal(contextual.pinyin,'zhī');assert.match(contextual.meaning,/animals/);assert.equal(contextual.audio,undefined);
 for(const locale of ['en','fr','ru','tr']){const dictionary=m.appStudyDictionary(locale);for(const word of m.measureWords){assert.ok(dictionary.has(word.hanzi));for(const example of word.examples)assert.ok(dictionary.has(example.hanzi));}assert.equal(dictionary.get('扇').pinyin,'shàn');}
});
const ui=await build({stdin:{contents:`export {default as MeasureWords} from './app/measure-words';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',plugins:[{name:'ui',setup(b){
 b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));
 b.onResolve({filter:/\.css$/},a=>({path:a.path,namespace:'css'}));b.onLoad({filter:/.*/,namespace:'css'},()=>({contents:''}));
 b.onResolve({filter:/^\.\/(i18n|shared-writing|study-lookup-context)$/},a=>({path:a.path,namespace:'stub'}));
 b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:({'./i18n':`export const useI18n=()=>({locale:'en'});`,'./shared-writing':`import {createElement} from 'react';export default props=>createElement('shared-writing',props);`,'./study-lookup-context':`export const StudyText=({text})=>text;`})[a.path]}));
}}]});
const file=join(mkdtempSync(join(tmpdir(),'measure-ui-')),'bundle.mjs');writeFileSync(file,ui.outputFiles[0].text);const u=await import(pathToFileURL(file));globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const label=node=>typeof node==='string'?node:(node.children??[]).map(label).join('');
async function click(r,name){const b=r.root.findAllByType('button').find(b=>label(b)===name);assert.ok(b,name);await u.act(()=>b.props.onClick());}
test('search/filter, ungraded hidden recall, exact shared writing and Back work without emitting events',async()=>{
 let r;await u.act(()=>{r=u.renderer.create(u.createElement(u.MeasureWords));});
 assert.equal(r.root.findAllByType('article').length,72);
 await u.act(()=>r.root.findByType('input').props.onChange({target:{value:'shan4'}}));assert.ok(r.root.findAllByType('article').length>=1);await u.act(()=>r.root.findByType('input').props.onChange({target:{value:'window'}}));assert.equal(r.root.findAllByType('article').length,1);assert.match(label(r.root),/一扇门/);
 await click(r,'Recall');assert.doesNotMatch(label(r.root.findByType('article')),/扇|shàn|一扇门/);assert.match(label(r.root.findByType('article')),/doors and windows/);
 await click(r,'Reveal classifier & examples');assert.match(label(r.root.findByType('article')),/扇/);
 await click(r,'Practise phrase · 1');let writing=r.root.findByType('shared-writing');assert.equal(writing.props.hanzi,'一扇门');assert.equal(writing.props.pinyin,'yí shàn mén');assert.equal(writing.props.contextual.sourceId,'mw-扇:0');assert.equal(writing.props.initialMode,'recall');
 await click(r,'← Back to measure words');assert.equal(r.root.findByType('input').props.value,'window');
 await click(r,'Write classifier · 扇');writing=r.root.findByType('shared-writing');assert.equal(writing.props.hanzi,'扇');assert.equal(writing.props.pinyin,'shàn');assert.equal(writing.props.item,undefined);
 await click(r,'← Back to measure words');await u.act(()=>r.root.findByType('input').props.onChange({target:{value:'一只猫'}}));await click(r,'Reveal classifier & examples');await click(r,'Write classifier · 只');assert.equal(r.root.findByType('shared-writing').props.item.id,'hsk1-287');assert.equal(r.root.findByType('shared-writing').props.item.english,'many animals; one of a pair');
 await click(r,'← Back to measure words');await u.act(()=>r.root.findByType('select').props.onChange({target:{value:'time'}}));assert.match(label(r.root),/No match/);await u.act(()=>r.root.findByType('input').props.onChange({target:{value:''}}));assert.equal(r.root.findAllByType('article').length,4);await u.act(()=>r.unmount());
});
test('resource is reachable through a deep link, sidebar and library and packages its writing assets',()=>{
 const app=readFileSync('app/study-app.tsx','utf8');assert.match(app,/get\("study"\)===\"measure-words\"/);assert.match(app,/id: "measure-words"/);assert.match(app,/changeView\("measure-words"\)/);assert.match(app,/MeasureWords key=\{user\?\.id\?\?"guest"\}/);
 assert.ok(readFileSync('scripts/prepare-learning-assets.mjs','utf8').includes("'data/measure-words.json'"));
 assert.ok(existsSync(fileURLToPath(new URL('../app/measure-words.css',import.meta.url))));
});
