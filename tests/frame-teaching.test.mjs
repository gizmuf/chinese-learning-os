import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {build} from 'esbuild';
const b=await build({stdin:{contents:`export {grammarFrames,grammarChunkTasks,learningSequence} from './app/chunk-library-data';export {FrameTeaching} from './app/frame-teaching';export {appStudyDictionary,studyLookupEntry} from './app/study-lookup-model';export {createElement} from 'react';export {renderToStaticMarkup} from 'react-dom/server';`,resolveDir:process.cwd()},banner:{js:"import{createRequire}from'node:module';const require=createRequire(process.cwd()+'/package.json');"},jsx:'automatic',loader:{'.css':'empty'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
test('All 54 patterns teach a scene, usage, contrast and visual relationship before any cloze input',()=>{
 assert.equal(m.grammarFrames.filter(f=>f.advanced).length,30);
 for(const f of m.grammarFrames){assert.equal(f.examples.length,2);assert.equal(f.learning.labels.length,2);for(const lang of ['en','fr','ru','tr']){for(const key of ['scene','explanation','contrast'])assert.ok(f.learning[key][lang],f.id+key+lang);assert.ok(f.learning.labels.every(label=>label[lang]));}}
 const task=m.grammarChunkTasks.find(t=>t.id==='chunk-frame-adv-even-if-1'),html=m.renderToStaticMarkup(m.createElement(m.FrameTeaching,{task,notify:()=>{},onPractice:()=>{}}));
 assert.match(html,/Picture the situation/);assert.match(html,/How it works/);assert.match(html,/Notice the difference/);assert.match(html,/即使/);assert.match(html,/jíshǐ/);assert.match(html,/Same frame, another situation/);assert.match(html,/Now try the gaps/);assert.doesNotMatch(html,/<input|<textarea/);
});
test('Every grammar target has a contextual reading, glossary entry in four languages, and unchanged activity identity',()=>{
 const readings=JSON.parse(fs.readFileSync('data/speaking-chunks/target-readings.json')),dicts=Object.fromEntries(['en','fr','ru','tr'].map(l=>[l,m.appStudyDictionary(l)]));
 for(const frame of m.grammarFrames)for(const ex of frame.examples){assert.deepEqual(Object.keys(readings[ex.id]).map(Number).sort((a,b)=>a-b),ex.targets);for(const i of ex.targets){assert.ok(readings[ex.id][i]);for(const dict of Object.values(dicts)){const entry=dict.get(ex.parts[i]);assert.ok(entry?.pinyin&&entry?.meaning,ex.parts[i]);assert.ok(entry.audio?.source,ex.parts[i]);}}}
});
test('Grammar lookup adds context-specific senses without changing earlier lesson glosses',()=>{const d=m.appStudyDictionary('en');assert.equal(d.get('还是').meaning,'or (in questions)');assert.match(m.studyLookupEntry(d,'还是','en',true).meaning,/still/);assert.equal(m.studyLookupEntry(d,'还是','en',false).meaning,'or (in questions)');});
test('Necessary-condition diagram points from possible result to its requirement on desktop and mobile',()=>{
 const task=m.grammarChunkTasks.find(t=>t.id==='chunk-frame-connect-only-if-1'),html=m.renderToStaticMarkup(m.createElement(m.FrameTeaching,{task,notify:()=>{},onPractice:()=>{}}));assert.match(html,/lucide-arrow-left/);assert.match(html,/lucide-arrow-up/);
});

test('Learning navigation visits each grammar pattern once while keeping both contextual examples in it',()=>{const sequence=m.learningSequence(m.grammarChunkTasks);assert.equal(sequence.length,54);assert.equal(new Set(sequence.map(t=>t.frameId)).size,54);assert.equal(m.grammarChunkTasks.filter(t=>t.frameId===sequence[0].frameId).length,2);});
