import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync,existsSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.requestAnimationFrame=fn=>fn();
const b=await build({stdin:{contents:`export * from './app/my-day-lesson-model';export {items} from './app/content';export {atlasByHanzi,componentById} from './app/atlas-model';export {default as Lesson} from './app/my-day-lesson';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{name:'ui',setup(b){
 b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));
 b.onResolve({filter:/\.css$/},a=>({path:a.path,namespace:'css'}));b.onLoad({filter:/.*/,namespace:'css'},()=>({contents:''}));
 b.onResolve({filter:/^\.\/(study-lookup|audio|shared-writing|recognition-review)$/},a=>({path:a.path,namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},a=>({contents:({
 './study-lookup':`export const StudyText=({text})=>text;`,
 './audio':`export const speak=()=>{};export const stopAudio=()=>{};export const playRecording=()=>{};`,
 './shared-writing':`import {createElement} from 'react';export default props=>createElement('writing-stub',props);`,
 './recognition-review':`import {createElement} from 'react';export default props=>createElement('review-stub',props);`,
 })[a.path],loader:'js'}));
 }}]});
const file=join(mkdtempSync(join(tmpdir(),'my-day-lesson-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));
const canonical='我每天八点左右醒来。|二十到三十分钟后，我起床。|然后我去厨房做早饭。|因为我不吃肉，所以早饭我做素菜。|然后我吃早饭。|早饭后，我准备出门，因为我得去学校。|我走出家门，走路去学校。|我家离学校很近，走路只要十分钟。|路上，我用微信点一杯咖啡。|到学校以后，我在楼下取咖啡。|然后我走进教室。|我的课早上八点四十分开始。|十点十分，我们休息二十分钟。|休息的时候，我走出教室。|中午十二点，我们休息一个小时。|我吃午饭。|下午一点，我还有一个半小时的中文课。|下午两点半下课以后，我回家。|到家以后，我进屋开始工作。|我在家工作，也学中文。|下午我通常出去散步。|有时候我走半个小时，有时候走两个小时。|我在附近走走，有时候买点东西。|然后我回到家，继续工作。|晚上我练习中文。|晚上十一点左右，我上床睡觉。'.split('|');
test('faithful V2 preserves all 26 approved sentences, five scenes, original 8:00 and complete pronunciation/translation',()=>{
 assert.deepEqual(m.myDaySentences.map(row=>row.hanzi),canonical);assert.deepEqual(m.myDayLesson.sections.map(s=>s.rows.length),[6,5,6,7,2]);
 for(const row of m.myDaySentences){assert.ok(row.pinyin.trim());assert.ok(row.english.trim());assert.ok(!/\p{Script=Han}/u.test(row.pinyin));}
 assert.equal(m.myDayLesson.movement.length,10);assert.equal(m.myDayLesson.connectors.length,7);
 assert.ok(m.myDayLesson.movement.find(r=>r.hanzi==='回来').english.includes('toward'));
 assert.ok(m.myDayLesson.movement.find(r=>r.hanzi==='出去').english.includes('away'));
 assert.ok(m.myDaySentences[5].pinyin.includes('děi'));assert.equal(m.myDaySentences[0].hanzi.includes('八点'),true);
});
test('all practice/writing/Atlas references resolve to existing identities; sentence audio is exact and local',()=>{
 assert.ok(m.myDayVocabulary.length>=10);const ids=new Set(m.items.map(item=>item.id));
 for(const item of m.myDayVocabulary){assert.ok(ids.has(item.id));assert.ok(!item.id.includes('my-day'));const atlas=m.myDayAtlasLink(item);if(atlas){const p=new URLSearchParams(atlas.href.split('?')[1]);const ch=m.atlasByHanzi.get(p.get('hanzi'));assert.ok(ch);assert.ok(ch.components.includes(p.get('part')));assert.ok(m.componentById.has(p.get('part')));}}
 for(const row of m.myDaySentences){const item=m.myDaySentenceAudio(row.hanzi);if(item){assert.equal(item.sentence,row.hanzi);assert.ok(existsSync('public/audio/'+item.id+'-sentence.mp3'));}}
 assert.equal(m.myDaySentenceAudio('我今天七点醒来。'),undefined);
});
function label(n){return typeof n==='string'?n:(n.children??[]).map(label).join('');}
const button=(r,text)=>r.root.findAllByType('button').find(b=>label(b)===text||b.props['aria-label']===text);
async function click(r,text){const b=button(r,text);assert.ok(b,text);await m.act(()=>b.props.onClick({currentTarget:null}));}
test('reading toggles and sentence rehearsal never record events; optional writing and practice use canonical words',async()=>{
 const events=[];let r;await m.act(()=>{r=m.renderer.create(m.createElement(m.Lesson,{db:{},record:async e=>events.push(e),notify(){},onBack(){}}));});
 const checkbox=r.root.findAllByType('input');
 assert.ok(JSON.stringify(r.toJSON()).includes(canonical[0]));
 await m.act(()=>checkbox[0].props.onChange({target:{checked:false}}));assert.ok(!JSON.stringify(r.toJSON()).includes(canonical[0]));
 await m.act(()=>checkbox[1].props.onChange({target:{checked:false}}));await m.act(()=>checkbox[2].props.onChange({target:{checked:false}}));
 assert.ok(r.root.findAllByProps({role:'status'}).length);
 await click(r,'One sentence at a time');assert.ok(label(r.root.findByProps({'aria-live':'polite'}))==='Sentence 1 / 26');
 await click(r,'Next');assert.ok(label(r.root.findByProps({'aria-live':'polite'}))==='Sentence 2 / 26');await click(r,'Previous');
 assert.equal(events.length,0);
 await click(r,'Practise these known words');const review=r.root.findByType('review-stub');assert.equal(review.props.practice,true);assert.deepEqual(review.props.queue.map(i=>i.id),m.myDayVocabulary.map(i=>i.id));
 await m.act(()=>review.props.onWrite(m.myDayVocabulary[0]));assert.equal(r.root.findByType('writing-stub').props.item.id,m.myDayVocabulary[0].id);
 await click(r,'Close writing');assert.equal(r.root.findAllByType('writing-stub').length,0);await click(r,'Close word practice');assert.equal(events.length,0);
 await m.act(()=>r.unmount());
});
test('lesson has both catalog entry points and a separate rehearsal route, without changing canonical curriculum',()=>{
 const shell=readFileSync('app/study-app.tsx','utf8'),studio=readFileSync('app/study-studio.tsx','utf8');
 assert.ok(shell.includes('rehearsal=my-day-01-v2'));assert.ok(shell.includes('Open My day lesson'));assert.ok(studio.includes('Day 01 V2 · Open lesson'));
 assert.ok(!readFileSync('app/content.ts','utf8').includes('my-day-01-v2'));
});
