import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';

const result=await build({stdin:{contents:`export * from './app/often-confused-data';export {default as OftenConfused,ContrastPicture,confusionCopy} from './app/often-confused';export {createElement} from 'react';export {renderToStaticMarkup} from 'react-dom/server';export {setLocale} from './i18n';export {matchesContrast} from './app/often-confused';`,resolveDir:process.cwd()},jsx:'automatic',bundle:true,platform:'node',format:'esm',write:false,loader:{'.css':'empty'},logLevel:'silent',banner:{js:"import{createRequire}from'node:module';const require=createRequire(process.cwd()+'/package.json');"},plugins:[{name:'locale',setup(b){b.onResolve({filter:/^\.\/i18n$/},()=>({path:'mock',namespace:'locale'}));b.onLoad({filter:/.*/,namespace:'locale'},()=>({contents:`let locale='en';export const setLocale=value=>{locale=value};export const useI18n=()=>({locale,t:text=>text});`,loader:'js'}));}}]});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('Visual pilot offers 24 compact contrast sets with complete four-language meanings and examples',()=>{
 assert.equal(m.confusionGroups.length,24);assert.equal(m.confusionItems.length,54);
 for(const group of m.confusionGroups){assert.ok(group.items.length>=2&&group.items.length<=4);for(const id of group.items)assert.ok(m.confusionItems.some(item=>item.id===id));for(const lang of ['en','fr','ru','tr'])assert.ok(group.title[lang]&&group.note[lang]);}
 for(const item of m.confusionItems){assert.ok(item.pinyin&&item.sentencePinyin);for(const lang of ['en','fr','ru','tr'])assert.ok(item.meaning[lang]&&item.translation[lang]);}
});

test('Exact word and sentence audio is bundled, hash-verified, and preserves the contextual dǎo reading',()=>{
 const manifest=JSON.parse(fs.readFileSync('public/often-confused/audio/manifest.json'));assert.equal(manifest.voice,'zh-CN-XiaoxiaoNeural');assert.equal(manifest.generationRate,'-10%');assert.equal(manifest.recordings.length,108);
 for(const item of m.confusionItems)for(const kind of ['word','sentence']){const clip=m.confusionRecording(item.id,kind),row=manifest.recordings.find(r=>r.id===item.id+'-'+kind);assert.equal(row.text,clip.text);const bytes=fs.readFileSync('public'+clip.source);assert.equal(createHash('sha256').update(bytes).digest('hex'),row.sha256);assert.ok(bytes.length>1000);}
 assert.equal(manifest.recordings.find(r=>r.id==='fall-word').pronunciationContext,'杯子倒了。');assert.equal(manifest.recordings.find(r=>r.id==='all-word').pronunciationContext,'我们都去。');
});

test('Contrast senses are local: fall dǎo does not overwrite a base dictionary pour dào entry',()=>{
 const base=new Map([['倒',{text:'倒',pinyin:'dào',meaning:'pour'}]]),local=m.confusionDictionary(base,'en');assert.equal(base.get('倒').pinyin,'dào');assert.equal(base.get('倒').meaning,'pour');assert.equal(local.get('倒').pinyin,'dǎo');assert.equal(local.get('倒').meaning,'fall over');assert.match(local.get('倒').audio.source,/fall-word/);
});

test('Each meaning has visible vector artwork and learning stays readable before any exercise',()=>{
 for(const item of m.confusionItems){const svg=m.renderToStaticMarkup(m.createElement(m.ContrastPicture,{scene:item.scene}));assert.match(svg,/<svg/);assert.match(svg,/<path|<circle|<rect|<ellipse/);}
 for(const lang of ['en','fr','ru','tr']){m.setLocale(lang);const html=m.renderToStaticMarkup(m.createElement(m.OftenConfused,{onClose:()=>{},notify:()=>{}}));assert.ok(html.includes(m.confusionCopy.title[lang]));assert.match(html,/dōu/);assert.match(html,/duō/);assert.match(html,/我们/);assert.doesNotMatch(html,/<input|<textarea/);assert.equal((html.match(/class="oc-card"/g)??[]).length,2);}
 m.setLocale('en');
});

test('Stroke display includes every comparison and sentence without changing any older outlines',()=>{
 const font=JSON.parse(fs.readFileSync('public/fonts/hanzi-display.json'));
 for(const item of m.confusionItems)for(const ch of item.hanzi+item.sentence){if(/[\p{Script=Han}]/u.test(ch))assert.ok(font.characters.includes(ch),ch);}
});

