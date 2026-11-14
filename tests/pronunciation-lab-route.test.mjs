import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';
import {build} from 'esbuild';

const require=createRequire(import.meta.url);
const result=await build({
 stdin:{contents:`
  export {default as CanonicalLab} from './app/pronunciation-lab/page';
  export {createElement} from 'react';
  export {act,create} from 'react-test-renderer';
  export async function runStaticEntry(){await import('./hk/main');return globalThis.staticEntry;}
 `,resolveDir:process.cwd()},
 bundle:true,platform:'node',format:'cjs',jsx:'automatic',external:['react','react/jsx-runtime','react-test-renderer'],write:false,logLevel:'silent',loader:{'.css':'empty'},
 plugins:[{name:'static-route-browser',setup(build){
  const stubs={
   'react-dom/client':"export const createRoot=()=>({render:element=>{globalThis.staticEntry=element}});",
   '../app/study-app':"export default function StudyApp(){return 'StudyApp';}",
   './auth-client':"export const getAuthClient=()=>{throw Error('Unexpected authentication');};",
  };
  build.onResolve({filter:/^(react-dom\/client|\.\.\/app\/study-app|\.\/auth-client)$/},({path})=>({path,namespace:'stub'}));
  build.onLoad({filter:/.*/,namespace:'stub'},({path})=>({contents:stubs[path]}));
 }}],
});
const module={exports:{}};
new Function('require','module','exports',result.outputFiles[0].text)(require,module,module.exports);
const {CanonicalLab,createElement,runStaticEntry,act,create}=module.exports;

test('Alibaba opens the shared lab with HTTP recording and server evaluation disabled',async t=>{
 const previousWindow=globalThis.window;
 const previousDocument=globalThis.document;
 const previousAct=globalThis.IS_REACT_ACT_ENVIRONMENT;
 globalThis.window=Object.assign(new EventTarget(),{location:{pathname:'/pronunciation-lab'},isSecureContext:false});
 globalThis.document={getElementById:()=>({})};
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;
 t.after(async()=>{
  if(root)await act(async()=>root.unmount());
  delete globalThis.staticEntry;
  globalThis.window=previousWindow;
  globalThis.document=previousDocument;
  globalThis.IS_REACT_ACT_ENVIRONMENT=previousAct;
 });
 const element=await runStaticEntry();
 await act(async()=>{root=create(element)});
 const content=JSON.stringify(root.toJSON());
 assert.match(content,/Pronunciation lab/);
 assert.match(content,/我是谁/);
 assert.match(content,/Wǒ shì shéi/);
 assert.match(content,/Microphone recording requires HTTPS/);
 assert.match(content,/Server evaluation is unavailable on this deployment/);
 assert.equal(root.root.findByType('a').props.href,'/');
 assert.deepEqual(root.root.findAllByType('button').map(button=>[button.props.children,button.props.disabled]),[
  ['Record',true],['Evaluate recording',true],
 ]);
 assert.equal(root.root.findAllByType('input').length,0);
});

test('the server-rendered route still exposes its existing evaluator consent',async t=>{
 const previousWindow=globalThis.window;
 const previousAct=globalThis.IS_REACT_ACT_ENVIRONMENT;
 globalThis.window=Object.assign(new EventTarget(),{isSecureContext:true});
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root;
 t.after(async()=>{
  if(root)await act(async()=>root.unmount());
  globalThis.window=previousWindow;
  globalThis.IS_REACT_ACT_ENVIRONMENT=previousAct;
 });
 await act(async()=>{root=create(createElement(CanonicalLab))});
 const content=JSON.stringify(root.toJSON());
 assert.match(content,/Real evaluation requires server activation/);
 assert.match(content,/Send this recording to Tencent/);
 assert.equal(root.root.findByType('input').props.type,'checkbox');
 assert.equal(root.root.findAllByType('button').find(button=>button.props.children==='Evaluate recording').props.disabled,true);
});

test('leaving the lab during pending permission releases the eventual microphone stream',async t=>{
 const previousWindow=globalThis.window;
 const previousContext=globalThis.AudioContext;
 const previousOffline=globalThis.OfflineAudioContext;
 const previousAct=globalThis.IS_REACT_ACT_ENVIRONMENT;
 const previousMedia=Object.getOwnPropertyDescriptor(navigator,'mediaDevices');
 const permission=Promise.withResolvers(),requested=Promise.withResolvers();
 const events=[];
 globalThis.window=Object.assign(new EventTarget(),{isSecureContext:true});
 globalThis.AudioContext=class{
  async resume(){}
  async close(){events.push('context closed')}
  createMediaStreamSource(){events.push('capture started');throw Error('Unexpected capture')}
 };
 globalThis.OfflineAudioContext=class{};
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia(){
  requested.resolve();
  return permission.promise;
 }}});
 let root;
 t.after(async()=>{
  if(root)await act(async()=>root.unmount());
  globalThis.window=previousWindow;
  globalThis.AudioContext=previousContext;
  globalThis.OfflineAudioContext=previousOffline;
  globalThis.IS_REACT_ACT_ENVIRONMENT=previousAct;
  if(previousMedia)Object.defineProperty(navigator,'mediaDevices',previousMedia);
  else delete navigator.mediaDevices;
 });
 await act(async()=>{root=create(createElement(CanonicalLab));});
 const record=root.root.findAllByType('button').find(button=>button.props.children==='Record');
 assert.equal(record.props.disabled,false);
 await act(async()=>{record.props.onClick();await requested.promise;});
 assert.match(JSON.stringify(root.toJSON()),/Opening microphone/);
 await act(async()=>{
  window.dispatchEvent(new Event('pagehide'));
  root.unmount();
  root=null;
  permission.resolve({getTracks:()=>[{stop:()=>events.push('track stopped')}]});
 });
 assert.deepEqual(events,['context closed','track stopped']);
});
