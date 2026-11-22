import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
import {mkdtempSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';

const require=createRequire(import.meta.url);
const bundle=await build({
 stdin:{contents:`export {WorkspaceReadingProvider,WorkspaceJourney,WorkspaceInspector} from './app/atlas-workspace-content';
 export {workspaceGroups,resolveWorkspaceContext} from './app/atlas-workspace-model';
 export {readAtlasWorkspaceRoute} from './app/atlas-workspace-route';
 export {LookupContext} from './app/study-lookup-context';
 export {createElement} from 'react'; export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},
 bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',loader:{'.css':'empty'},
 alias:{react:require.resolve('react').replace(/\/index\.js$/,'')},
 plugins:[{name:'test-context',setup(build){
  build.onResolve({filter:/^\.\/i18n$/},()=>({path:'i18n',namespace:'test'}));
  build.onResolve({filter:/^\.\/auth-client$/},()=>({path:'auth',namespace:'test'}));
  build.onLoad({filter:/.*/,namespace:'test'},args=>({contents:args.path==='i18n'?`export const useI18n=()=>({locale:'en'});`:`export const authenticatedFetch=async()=>Response.json({events:[]});`,loader:'js'}));
 }}],
});
globalThis.require=require;
const file=join(mkdtempSync(join(tmpdir(),'atlas-hints-')),'bundle.mjs');writeFileSync(file,bundle.outputFiles[0].text);
const m=await import(pathToFileURL(file));
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const storage=new Map();
globalThis.localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)};
let headerHeight=96;
const header={getBoundingClientRect:()=>({height:headerHeight})};
globalThis.document={querySelector:()=>header};
const observers=[];
globalThis.ResizeObserver=class{constructor(callback){this.callback=callback;observers.push(this);}observe(node){this.node=node;}disconnect(){this.disconnected=true;}};
const groups=m.workspaceGroups('en',3), group=groups.find(group=>group.anchor==='学'),topic=groups.find(group=>group.kind==='topic');
const word=group.words.find(word=>word.hanzi==='学生');
assert.ok(word);
const route=m.readAtlasWorkspaceRoute('?'+new URLSearchParams({atlas:'1',workspace:'1',mode:'read',hsk:'3',anchor:'学',focus:'word',text:word.hanzi,group:group.id}));
const context=m.resolveWorkspaceContext(route,'en',groups);
assert.equal(context.word?.id,word.id);assert.ok(context.example?.pinyin);
const text=node=>typeof node==='string'?node:node.children.map(text).join('');
const button=(root,label)=>root.root.findAllByType('button').find(node=>text(node)===label);
const key=owner=>'chinese-os:atlas-reading-hints:v1:'+owner;

async function mount(owner='guest',active=true,embedded=false){
 const selected=[],opened=[],styles=new Map();
 const rootRef={current:{style:{setProperty:(name,value)=>styles.set(name,value)}}};
 const lookup={dictionary:new Map(),open:(...args)=>opened.push(args)};
 const body=m.createElement(m.LookupContext.Provider,{value:lookup},
  m.createElement(m.WorkspaceJourney,{route,groups:[group,topic],locale:'en',context,select:(...args)=>selected.push(args),openGroup(){},showWhole(){}}),
  m.createElement(m.WorkspaceInspector,{route,context,audio:{playing:'',listen(){},stop(){}},explore(){},showFamily(){},onStory(){},onWriting(){},chunksHref:''}));
 const props={active,owner,root:rootRef,embedded};
 let root;await m.act(()=>{root=m.renderer.create(m.createElement(m.WorkspaceReadingProvider,props,body));});
 return {root,selected,opened,styles,update:next=>m.act(()=>root.update(m.createElement(m.WorkspaceReadingProvider,{...props,...next},body)))};
}

function assertHints(root,pinyin,english){
 const row=root.root.findAllByProps({className:'wf-row'}).find(node=>node.props['data-word-id']===word.id);
 assert.equal(text(row.findByProps({className:'wf-reading'})),pinyin?word.pinyin:'');
 assert.equal(text(row.findByProps({className:'wf-meaning'})),english?word.meaning:'');
 assert.equal(row.props['aria-label'],[word.hanzi,pinyin&&word.pinyin,english&&word.meaning].filter(Boolean).join(' · '));
 const inspector=root.root.findByProps({id:'aw-context'});
 assert.equal(inspector.findAllByProps({className:'aw-reading'}).length,pinyin?2:0);
 assert.equal(inspector.findAllByProps({className:'aw-meaning'}).length,english?1:0);
 const paragraphs=inspector.findAllByType('p').map(text);
 assert.equal(paragraphs.includes(context.example.pinyin),pinyin);
 assert.equal(paragraphs.includes(context.example.meaning),english);
 const heading=root.root.findAllByType('article').find(node=>node.props.id===group.id).findByType('h3');
 assert.equal(text(heading).includes(group.reading),pinyin);
 assert.equal(text(heading).includes(group.title),english);
 const topicRow=root.root.findByProps({className:'aw-topic-words'}).findAllByType('button')[0];
 assert.equal(text(topicRow.children[1]),pinyin?topic.words[0].pinyin:'');
 assert.equal(text(topicRow.children[2]),english?topic.words[0].meaning:'');
 const groupOption=root.root.findAllByType('option').find(node=>node.props.value===group.id);
 assert.equal(text(groupOption).includes(group.title),english);
}

test('independent switches cover family rows, headings and the context sentence without selecting a word',async()=>{
 const view=await mount('switches-'+crypto.randomUUID());const {root}=view;
 try{
  assertHints(root,true,true);
  await m.act(()=>button(root,'Pinyin').props.onClick());assertHints(root,false,true);
  await m.act(()=>button(root,'English').props.onClick());assertHints(root,false,false);
  assert.equal(view.selected.length,0);
  const row=root.root.findAllByProps({className:'wf-row'}).find(node=>node.props['data-word-id']===word.id);
  await m.act(()=>row.props.onClick());assert.equal(view.selected[0][0].id,word.id);
  const lookupWord=root.root.findByProps({id:'aw-context'}).findAllByType('button').find(node=>node.props.className==='study-word');
  assert.ok(lookupWord);
  await m.act(()=>lookupWord.props.onClick({stopPropagation(){},currentTarget:{}}));assert.equal(view.opened.length,1);
  await m.act(()=>button(root,'Pinyin').props.onClick());assertHints(root,true,false);
  await m.act(()=>button(root,'English').props.onClick());assertHints(root,true,true);
 }finally{await m.act(()=>root.unmount());}
});

test('preferences restore per notebook, and other Atlas modes keep their own visible hints',async()=>{
 storage.set(key('alice'),JSON.stringify({pinyin:false,english:true}));
 storage.set(key('bob'),JSON.stringify({pinyin:true,english:false}));
 const view=await mount('alice');
 try{
  assertHints(view.root,false,true);
  await view.update({owner:'bob'});assertHints(view.root,true,false);
  await view.update({owner:'bob',active:false});assertHints(view.root,true,true);
  assert.equal(view.root.root.findAllByProps({className:'aw-reading-controls'}).length,0);
  await view.update({owner:'bob',active:true});assertHints(view.root,true,false);
  await m.act(()=>button(view.root,'Pinyin').props.onClick());
  assert.deepEqual(JSON.parse(storage.get(key('bob'))),{pinyin:false,english:false});
  assert.deepEqual(JSON.parse(storage.get(key('alice'))),{pinyin:false,english:true});
 }finally{await m.act(()=>view.root.unmount());}
 const restored=await mount('bob');try{assertHints(restored.root,false,false);}finally{await m.act(()=>restored.root.unmount());}
});

test('sticky offset follows the real header height, including wrapping, and embedded views keep their own origin',async()=>{
 const view=await mount('geometry');const observer=observers.at(-1);
 assert.equal(view.styles.get('--aw-sticky-header'),'96px');assert.equal(observer.node,header);
 headerHeight=132;await m.act(()=>observer.callback());assert.equal(view.styles.get('--aw-sticky-header'),'132px');
 await m.act(()=>view.root.unmount());assert.equal(observer.disconnected,true);
 const embedded=await mount('embedded',true,true);
 try{assert.equal(embedded.styles.get('--aw-sticky-header'),'0px');}finally{await m.act(()=>embedded.root.unmount());}
});

test.after(()=>{for(const handle of process._getActiveHandles())if(handle.constructor.name==='MessagePort')handle.unref();});
