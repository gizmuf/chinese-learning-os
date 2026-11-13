import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {indexedDB} from 'fake-indexeddb';
import {createRequire} from 'node:module';
import {writeFileSync,mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require=createRequire(import.meta.url);globalThis.require=require;globalThis.indexedDB=indexedDB;globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const result=await build({stdin:{contents:`export * from './app/private-lessons-model';export * from './app/local-store';export {items} from './app/content';export {default as PrivateLessons} from './app/private-lessons';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent',plugins:[{name:'ui',setup(b){b.onResolve({filter:/^(react|react-test-renderer)$/},a=>({path:require.resolve(a.path),external:true}));b.onResolve({filter:/^\.\/(i18n|writing-practice)$/},a=>({path:a.path,namespace:'writing-test'}));b.onLoad({filter:/.*/,namespace:'writing-test'},a=>({contents:a.path==='./i18n'?`export const useI18n=()=>({locale:'en',t:s=>s});`:`import {createElement} from 'react';export default function Writing(props){return createElement('writing-stub',props);}`,loader:'js'}));b.onResolve({filter:/\.css$/},a=>({path:a.path,namespace:'css'}));b.onLoad({filter:/.*/,namespace:'css'},()=>({contents:''}));}}]});
const bundle=join(mkdtempSync(join(tmpdir(),'private-lessons-tests-')),'bundle.mjs');writeFileSync(bundle,result.outputFiles[0].text);const m=await import(pathToFileURL(bundle));
async function fixture(patch={}){const base={schemaVersion:1,title:'Synthetic lesson',source:{kind:'user-provided',videoUrl:null,verificationAgainstAudio:false,notes:[]},sources:[{id:1,hanzi:'甲。',rawPinyin:null},{id:2,hanzi:'乙。',rawPinyin:null}],sentences:[{id:'s1',sourceIds:[1],hanzi:'甲。',pinyin:'jiǎ',english:'first',notes:[],uncertain:false},{id:'s2',sourceIds:[2],hanzi:'乙。',pinyin:'yǐ',english:'second',notes:[],uncertain:false}],practiceTargets:[],...patch};return {...base,sourceHash:await m.privateDigest(base.sources),contentHash:await m.privateDigest(base)};}
const tick=()=>new Promise(r=>setTimeout(r,15));async function settle(){await m.act(async()=>{await tick();await tick();});}
function label(n){return typeof n==='string'?n:(n.children??[]).map(label).join('');}
async function click(r,name){const b=r.root.findAllByType('button').find(b=>label(b)===name);assert.ok(b,name);assert.ok(!b.props.disabled);await m.act(async()=>{b.props.onClick();await tick();});await settle();}
async function mount(owner){const db=await m.openStore(owner);let r;await m.act(()=>{r=m.renderer.create(m.createElement(m.PrivateLessons,{owner,db,onBack(){},onSignIn(){}}));});await settle();return {db,r};}
async function choose(r,lesson){await m.act(async()=>{await r.root.findByType('input').props.onChange({currentTarget:{files:[{size:100,text:async()=>JSON.stringify(lesson)}],value:''}});await tick();});await settle();}
test('strict bounded schema, source coverage, exact mappings and integrity reject malformed imports',async()=>{
 const f=await fixture();assert.deepEqual(await m.parsePrivateLesson(JSON.stringify(f)),f);
 for(const bad of [{...f,extra:true},{...f,title:'changed'},await fixture({sentences:[f.sentences[1],f.sentences[0]]}),await fixture({sentences:[{...f.sentences[0],hanzi:'乙。'},f.sentences[1]]}),await fixture({practiceTargets:[{text:'甲',pinyin:'jiǎ',english:'first',canonicalItemId:'not-real',sourceIds:[1]}]}),await fixture({sources:[{...f.sources[0],id:2},f.sources[1]]})])await assert.rejects(m.parsePrivateLesson(JSON.stringify(bad)),/Nothing was imported/);
 await assert.rejects(m.parsePrivateLesson(' '.repeat(m.privateFileLimit+1)));
 for(const videoUrl of ['javascript:alert(1)','https://example.com/','https://www.youtube.com/watch?v=abcdefghijk&v=private','https://youtu.be:444/abcdefghijk'])await assert.rejects(m.parsePrivateLesson(JSON.stringify(await fixture({source:{...f.source,videoUrl}}))));
 assert.ok(await m.parsePrivateLesson(JSON.stringify(await fixture({source:{...f.source,videoUrl:'https://youtu.be/abcdefghijk'}}))));
});
test('imports preserve checkpoints on duplicates, new revisions, and restoring older content; no learning events',async()=>{
 const owner='private-revisions',db=await m.openStore(owner),f=await fixture();let lib=await m.importPrivateLesson(db,owner,f,0),record=await m.openPrivateLesson(db,owner,f.contentHash,'one');record=await m.savePrivateReader(db,owner,record,{index:1,phases:[3,2],showRaw:true});
 lib=await m.importPrivateLesson(db,owner,f,lib.revision);assert.equal(lib.entries.length,1);assert.equal((await m.openPrivateLesson(db,owner,f.contentHash,'two')).reader.index,1);
 const newer=await fixture({title:'New revision'});lib=await m.importPrivateLesson(db,owner,newer,lib.revision);assert.equal(lib.entries[0].revision,2);
 lib=await m.importPrivateLesson(db,owner,f,lib.revision);assert.equal(lib.entries[0].revision,3);assert.deepEqual((await m.openPrivateLesson(db,owner,f.contentHash,'three')).reader,record.reader);assert.deepEqual(await m.allEvents(db),[]);db.close();
});
test('owner/DB guards, cancellation and catalogue/reader CAS block stale writes',async()=>{
 const owner='private-guards',db=await m.openStore(owner),f=await fixture();await assert.rejects(m.readPrivateLibrary(db,''));await assert.rejects(m.readPrivateLibrary(db,'other'));
 await assert.rejects(m.importPrivateLesson(db,owner,f,0,()=>false));assert.equal((await m.readPrivateLibrary(db,owner)).entries.length,0);
 const lib=await m.importPrivateLesson(db,owner,f,0);await assert.rejects(m.importPrivateLesson(db,owner,f,0));assert.equal((await m.readPrivateLibrary(db,owner)).revision,lib.revision);
 const old=await m.openPrivateLesson(db,owner,f.contentHash,'old'),fresh=await m.openPrivateLesson(db,owner,f.contentHash,'fresh');await assert.rejects(m.savePrivateReader(db,owner,old,{...old.reader,index:1}));await assert.rejects(async()=>m.savePrivateReader(db,owner,fresh,{...fresh.reader,index:1},()=>false));assert.equal((await m.openPrivateLesson(db,owner,f.contentHash,'verify')).reader.index,0);db.close();
});
test('real UI previews/cancels without writes, imports/reveals and restores on Back/reload',async()=>{
 const {db,r}=await mount('private-ui'),f=await fixture();await choose(r,f);assert.ok(label(r.root).includes('2 source segments'));assert.equal((await m.readPrivateLibrary(db,'private-ui')).entries.length,0);await click(r,'Cancel');assert.equal((await m.readPrivateLibrary(db,'private-ui')).entries.length,0);
 await choose(r,f);await click(r,'Import into this device');assert.equal(label(r.root).includes('jiǎ'),false);await click(r,'Show pinyin');assert.ok(label(r.root).includes('jiǎ'));await click(r,'Show English');assert.ok(label(r.root).includes('first'));await click(r,'Next');await click(r,'Previous');assert.ok(label(r.root).includes('first'));await click(r,'Back to local library');await click(r,'Synthetic lesson2 groups · local revision 1');assert.ok(label(r.root).includes('first'));
 await m.act(()=>r.unmount());let reload;await m.act(()=>{reload=m.renderer.create(m.createElement(m.PrivateLessons,{owner:'private-ui',db,onBack(){},onSignIn(){}}));});await settle();assert.ok(label(reload.root).includes('first'));assert.deepEqual(await m.allEvents(db),[]);await m.act(()=>reload.unmount());db.close();
});
test('guest has no picker; owner switch cancels pending file and hides prior private content',async()=>{
 const {db,r}=await mount('private-owner-a'),other=await m.openStore('private-owner-b');let release;const text=new Promise(r=>release=r);
 await m.act(()=>{r.root.findByType('input').props.onChange({currentTarget:{files:[{size:10,text:()=>text}],value:''}});});
 await m.act(()=>r.update(m.createElement(m.PrivateLessons,{owner:'private-owner-b',db:other,onBack(){},onSignIn(){}})));await settle();release(JSON.stringify(await fixture({title:'Private old owner'})));await settle();assert.equal(label(r.root).includes('Private old owner'),false);assert.equal((await m.readPrivateLibrary(other,'private-owner-b')).entries.length,0);
 await m.act(()=>r.update(m.createElement(m.PrivateLessons,{owner:null,db,onBack(){},onSignIn(){}})));await settle();assert.equal(r.root.findAllByType('input').length,0);await m.act(()=>r.unmount());db.close();other.close();
});
test('exact canonical target opens real SharedWriting modes, saves ungraded and returns to the same reader; owner switch cancels old saves',async()=>{
 const item=m.items.find(i=>i.hanzi==='我');assert.ok(item);const base=await fixture();const f=await fixture({sources:[{...base.sources[0],hanzi:'我。'},base.sources[1]],sentences:[{...base.sentences[0],hanzi:'我。'},base.sentences[1]],practiceTargets:[{text:'我',pinyin:'wǒ',english:'I',canonicalItemId:item.id,sourceIds:[1]}]});
 const {db,r}=await mount('private-writer');await choose(r,f);await click(r,'Import into this device');await click(r,'Show pinyin');await click(r,'Show English');await click(r,'Write 我');
 let writer=r.root.findByType('writing-stub');assert.equal(writer.props.item.id,item.id);assert.deepEqual(writer.props.audio,{});assert.equal(writer.props.supported,true);assert.equal(writer.props.mode,'watch');
 for(const mode of ['trace','copy','recall']){await m.act(()=>writer.props.setMode(mode));writer=r.root.findByType('writing-stub');assert.equal(writer.props.mode,mode);}
 await m.act(async()=>{await writer.props.record({id:'synthetic-no-event'});});await settle();assert.ok(label(r.root).includes('Writing practice saved on this device.'));assert.deepEqual(await m.allEvents(db),[]);await click(r,'Back to sentence');assert.ok(label(r.root).includes('first'));assert.ok(label(r.root).includes('Group 1 / 2'));
 const checkpoint=await m.openPrivateLesson(db,'private-writer',f.contentHash,'verify');assert.deepEqual(checkpoint.reader.phases,[3,1]);assert.deepEqual(checkpoint.reader.written,[item.id]);
 await click(r,'Write 我');const oldSave=r.root.findByType('writing-stub').props.record,other=await m.openStore('private-writer-other');await m.act(()=>r.update(m.createElement(m.PrivateLessons,{owner:'private-writer-other',db:other,onBack(){},onSignIn(){}})));await settle();assert.equal(r.root.findAllByType('writing-stub').length,0);await m.act(async()=>{await assert.rejects(oldSave({id:'synthetic-old-owner'}));});await settle();assert.equal((await m.readPrivateLibrary(other,'private-writer-other')).entries.length,0);assert.deepEqual(await m.allEvents(other),[]);await m.act(()=>r.unmount());db.close();other.close();
});
test('private reader uses safe text and no network/lookup/graded producer; additive route and responsive layout',()=>{
 const ui=readFileSync('app/private-lessons.tsx','utf8');for(const forbidden of ['fetch(','console.','dangerouslySetInnerHTML','newEvent','StudyText','speak('])assert.ok(!ui.includes(forbidden),forbidden);assert.ok(ui.includes('data-study-lookup="off"'));assert.ok(readFileSync('app/study-app.tsx','utf8').includes('?private=1'));assert.ok(readFileSync('app/private-lessons.css','utf8').includes('@media'));assert.ok(readFileSync('app/study-studio.tsx','utf8').includes('onPrivate'));
});
