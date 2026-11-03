import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const b=await build({stdin:{contents:`export * from './app/my-day-speaking-model';export {default as Speaking} from './app/my-day-speaking';export {default as Lesson} from './app/my-day-lesson';export {restoreContextSession} from './app/study-context-session';export {initialCloudRoute} from './app/atlas-cloud-route';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{name:'ui',setup(b){
 b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));
 b.onResolve({filter:/^\.\/(study-lookup|audio|shared-writing|recognition-review)$/},a=>({path:a.path,namespace:'mock'}));
 b.onResolve({filter:/\.css$/},a=>({path:a.path,namespace:'css'}));b.onLoad({filter:/.*/,namespace:'css'},()=>({contents:''}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:a.path==='./shared-writing'||a.path==='./recognition-review'?`export default ()=>null;`:a.path==='./audio'?`export const speak=()=>{};export const stopAudio=()=>{};export const playRecording=()=>{};`:`export const StudyText=({text})=>text;`,loader:'js'}));
}}]});
const file=join(mkdtempSync(join(tmpdir(),'myday-speaking-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const label=n=>typeof n==='string'?n:(n.children??[]).map(label).join('');
const click=async(r,text)=>{const button=r.root.findAllByType('button').find(n=>label(n)===text);assert.ok(button,text);await m.act(()=>button.props.onClick());};
test('two separate supplied variants retain 8 and 30 complete three-line rows and five full-day sections',()=>{
 assert.deepEqual(m.speakingVariants.map(v=>m.speakingRows(v.id).length),[8,30]);
 assert.deepEqual(m.speakingVariants[1].sections.map(s=>s.rows.length),[8,5,7,7,3]);
 assert.equal(m.speakingRows(m.speakingVariants[0].id)[0].hanzi,'我每天早上醒来，然后起床，洗澡，换衣服。');
 assert.equal(m.speakingRows(m.speakingVariants[1].id)[0].hanzi,'我每天早上七点左右醒来。');
 assert.equal(m.speakingRows(m.speakingVariants[1].id).at(-1).hanzi,'晚上十一点左右，我上床睡觉。');
 for(const v of m.speakingVariants)for(const row of m.speakingRows(v.id))for(const key of ['hanzi','pinyin','english'])assert.ok(row[key].trim());
 assert.equal(m.speakingRows('unknown').length,0);
});
test('only exact validated voice recordings are reused, all files exist and pending inventory is deduplicated',()=>{
 const manifest=JSON.parse(readFileSync('data/qwen-curriculum-audio.json'));
 for(const [index,v] of m.speakingVariants.entries()){
  const rows=m.speakingRows(v.id),clips=rows.map(row=>m.speakingClip(row.hanzi)).filter(Boolean);assert.equal(clips.length,[8,30][index]);
  for(const clip of clips){assert.ok((manifest.recordings.some(r=>r.text===clip.text&&r.source===clip.source))||clip.voice==='zh-CN-XiaoxiaoNeural');assert.ok(existsSync('public'+clip.source));}
 }
 const pending=JSON.parse(readFileSync('data/my-day-speaking-audio-pending.json'));assert.equal(pending.uniqueMissingCount,27);assert.equal(new Set(pending.texts.map(r=>r.hanzi)).size,27);
 assert.equal(m.speakingClip('我也喜欢水果。').voice,'zh-CN-XiaoxiaoNeural');
 assert.notEqual(m.speakingViewKey('a','one'),m.speakingViewKey('b','one'));
});
test('practice advances in short portions, hides/reveals and counts self-reports without claiming grades',async()=>{
 let r;const id=m.speakingVariants[0].id;await m.act(()=>{r=m.renderer.create(m.createElement(m.Speaking,{id,owner:'test',notify(){},onBack(){}}));});
 const article=()=>r.root.findAll(n=>n.props.className==='md-sentence');assert.equal(article().length,1);
 const lines=article()[0].children.filter(n=>n.props?.lang);assert.deepEqual(lines.map(n=>n.props.lang),['zh-Hans','zh-Latn-pinyin','en']);
 await click(r,'I said it aloud · 0/3');await click(r,'I said it aloud · 1/3');await click(r,'I said it aloud · 2/3');assert.ok(label(r.root).includes('Try it once from memory.'));
 await click(r,'Hide text · try from memory');assert.equal(article()[0].findAll(n=>n.props.lang).length,0);await click(r,'Reveal text');
 await m.act(()=>r.root.findByProps({'aria-label':'Practice size'}).props.onChange({target:{value:'2'}}));assert.equal(article().length,2);
 await click(r,'Next');assert.ok(label(r.root).includes('Sentence 3–4 / 8'));await click(r,'Previous');
 await click(r,'Read full variant');assert.equal(article().length,8);await click(r,'Return to practice');assert.equal(article().length,2);
 assert.ok(label(r.root).includes('no pronunciation or tone score'));await m.act(()=>r.unmount());
});
test('context checkpoints validate supplied sentence identity and reject modified text',()=>{
 const id=m.speakingVariants[0].id,row=m.speakingRows(id)[0],url='/?rehearsal='+id;
 const v={originURL:url,originY:0,entry:{text:'起床',pinyin:'qǐchuáng',meaning:'get up',contextual:{sourceId:id+':1',text:row.hanzi,pinyin:row.pinyin,meaning:row.english}},route:m.initialCloudRoute};
 assert.ok(m.restoreContextSession(JSON.stringify(v),url));v.entry.contextual.text='wrong';assert.equal(m.restoreContextSession(JSON.stringify(v),url),null);
});
test('new chapters are visible inside the existing My Day entry and preserve all original sentence rows',async()=>{
 let r;await m.act(()=>{r=m.renderer.create(m.createElement(m.Lesson,{db:null,record:async()=>{throw new Error('Unexpected review write')},notify(){},onBack(){}}));});
 assert.ok(label(r.root).includes('New in My Day · 3 November'));
 assert.ok(r.root.findAllByType('button').some(b=>label(b)==="Practise today's 8 sentences"));
 assert.ok(r.root.findAllByType('button').some(b=>label(b)==='Practise the full 30-sentence story'));
 assert.equal(r.root.findAll(n=>n.props.className==='md-sentence'&&n.props['data-study-source-id']).length,26);
 await m.act(()=>r.unmount());
});
test('fallback rejects mismatched text, unvalidated files, wrong voices and external paths; all completed audio bytes match hashes',async()=>{
 const {createHash}=await import('node:crypto');const audio=JSON.parse(readFileSync('data/my-day-speaking-audio.json'));assert.equal(audio.recordings.length,27);
 for(const clip of audio.recordings){assert.equal(createHash('sha256').update(readFileSync('public'+clip.source)).digest('hex'),clip.sha256);assert.ok(clip.durationSeconds>0);assert.equal(m.selectSpeakingFallback(audio,clip.text).source,clip.source);}
 const first=audio.recordings[0];for(const bad of [{...audio,status:'pending'},{...audio,voice:'other'},{...audio,recordings:[{...first,validated:false}]},{...audio,recordings:[{...first,source:'https://bad.invalid/test.mp3'}]}])assert.equal(m.selectSpeakingFallback(bad,first.text),undefined);
 assert.equal(m.selectSpeakingFallback(audio,'not a source sentence'),undefined);
});
