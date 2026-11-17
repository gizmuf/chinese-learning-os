import test from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { build } from 'esbuild';
import { indexedDB } from 'fake-indexeddb';

const {outputFiles:[bundle]}=await build({
  stdin:{contents:"export * from './app/hsk3-speaking-model'; export * from './app/hsk3-speaking-storage';",resolveDir:process.cwd()},
  bundle:true,write:false,format:'esm',platform:'node',
});
const {speakingTasks,speakingSteps,speakingAudio,speakingClock,readSpeakingAttempt,beginSpeakingAttempt,saveSpeakingAnswer,clearSpeakingAnswers}
  =await import('data:text/javascript;base64,'+Buffer.from(bundle.text).toString('base64'));

test('official oral sample windows and all 15 original prompts are in order',async()=>{
  const records=speakingSteps.filter(step=>step.phase==='record');
  assert.deepEqual(records.map(step=>step.question),Array.from({length:15},(_,index)=>index));
  assert.deepEqual(records.map(step=>step.seconds),[...Array(8).fill(10),...Array(5).fill(15),90,90]);
  assert.deepEqual(speakingSteps.filter(step=>step.phase==='prepare').map(step=>[step.question,step.seconds]),[[13,180],[14,180]]);
  assert.equal(new Set(speakingTasks.filter(t=>t.kind==='picture').map(t=>t.picture)).size,5);
  for(const step of speakingSteps.filter(step=>step.phase==='listen')) assert.ok((await stat('public'+speakingAudio(step.clip))).size>1500);
  assert.ok((await stat('public/audio/hsk3-speaking/scenes.webp')).size>20_000);
  assert.equal(speakingClock(90),'1:30');
});

test('each answer survives reload and stale tabs cannot change a newer attempt',async()=>{
  globalThis.indexedDB=indexedDB;
  const audio=new Blob(['recording'],{type:'audio/mp4'});
  await beginSpeakingAttempt('first');
  assert.equal(await saveSpeakingAnswer('first',{question:0,audio}),true);
  const first=await readSpeakingAttempt();
  const found=first.answers;
  assert.equal(found.length,1);
  assert.equal(found[0].audio.type,'audio/mp4');
  assert.equal(await found[0].audio.text(),'recording');
  await beginSpeakingAttempt('second');
  assert.equal(await saveSpeakingAnswer('first',{question:1,audio}),false);
  assert.equal(await saveSpeakingAnswer('second',{question:2,audio}),true);
  assert.equal(await clearSpeakingAnswers(first.id),false);
  assert.equal(await saveSpeakingAnswer('second',{question:3,audio}),true);
  assert.deepEqual((await readSpeakingAttempt()).answers.map(answer=>answer.question),[2,3]);
  assert.equal(await clearSpeakingAnswers('second'),true);
  assert.equal(await readSpeakingAttempt(),undefined);
});

test('leaving microphone setup releases a permission grant that arrives on review',async()=>{
  const fixture=await renderSpeaking();
  try {
    await fixture.click('New attempt');
    await fixture.click('Enable microphone');
    await fixture.click('Back to recordings');
    await fixture.grantMicrophone();
    assert.equal(fixture.heading(),'Speaking review');
    assert.equal(fixture.track.readyState,'ended');
    assert.equal(fixture.track.onended,null);
  } finally {
    await fixture.unmount();
  }
});

test('ending an attempt during recorder finalization saves the answer and opens review',async()=>{
  const fixture=await renderSpeaking();
  try {
    await fixture.click('New attempt');
    await fixture.click('Enable microphone');
    await fixture.grantMicrophone();
    await fixture.click('Start speaking mock');
    await fixture.endPrompt();
    await fixture.endPrompt();
    await fixture.endPrompt();
    await fixture.click('End attempt');
    await fixture.expireTimer();
    await fixture.click('End attempt and review');
    await fixture.finishRecording();
    assert.equal(fixture.heading(),'Speaking review');
    assert.equal(fixture.saved.length,1);
    assert.equal(fixture.saved[0].question,0);
    assert.equal(fixture.track.readyState,'ended');
  } finally {
    await fixture.unmount();
  }
});

async function renderSpeaking() {
  const {createRequire}=await import('node:module');
  const {default:React}=await import('react');
  const {default:renderer,act}=await import('react-test-renderer');
  const saved=[];
  globalThis.speakingTestStorage={
    readSpeakingAttempt:async()=>({id:'previous',answers:[{question:0,audio:new Blob(['previous'])}]}),
    beginSpeakingAttempt:async()=>{},
    saveSpeakingAnswer:async(id,answer)=>{saved.push(answer);return true;},
    clearSpeakingAnswers:async()=>true,
  };
  const {outputFiles:[component]}=await build({
    stdin:{contents:"export {default} from './app/hsk3-speaking';",resolveDir:process.cwd()},
    bundle:true,write:false,format:'cjs',platform:'node',jsx:'automatic',
    external:['react','react/jsx-runtime'],loader:{'.css':'empty'},
    plugins:[{
      name:'speaking-test-storage',
      setup(builder){
        builder.onResolve({filter:/^\.\/hsk3-speaking-storage$/},()=>({path:'storage',namespace:'speaking-test'}));
        builder.onLoad({filter:/.*/,namespace:'speaking-test'},()=>({contents:'module.exports=globalThis.speakingTestStorage;'}));
      },
    }],
  });
  const componentModule={exports:{}};
  const require=createRequire(import.meta.url);
  new Function('module','exports','require',component.text)(componentModule,componentModule.exports,require);

  let grant;
  let tick;
  const recorders=[];
  const track={readyState:'live',onended:null,stop(){this.readyState='ended';}};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
    getUserMedia:()=>new Promise(resolve=>{grant=resolve;}),
  }});
  class Recorder {
    static isTypeSupported(){return true;}
    mimeType='audio/mp4';
    state='inactive';
    constructor(){recorders.push(this);}
    start(){this.state='recording';}
    stop(){this.state='inactive';}
  }
  Object.assign(globalThis,{
    window:{MediaRecorder:Recorder,setInterval:callback=>{tick=callback;return 1;},clearInterval(){},addEventListener(){},removeEventListener(){}},
    MediaRecorder:Recorder,
    IS_REACT_ACT_ENVIRONMENT:true,
    requestAnimationFrame:()=>1,
  });
  const player={src:'',ended:true,play:async()=>{},pause(){}};
  let tree;
  await act(async()=>{
    tree=renderer.create(React.createElement(componentModule.exports.default),{
      createNodeMock:element=>element.type==='audio'?(element.props.hidden?player:{}):null,
    });
  });

  return {
    saved,track,
    heading:()=>tree.root.findByType('h2').children.join(''),
    click:label=>act(async()=>{
      const button=tree.root.findAllByType('button').find(candidate=>candidate.children.includes(label));
      assert.ok(button,'Missing button '+label);
      button.props.onClick();
    }),
    grantMicrophone:()=>act(async()=>grant({getAudioTracks:()=>[track],getTracks:()=>[track]})),
    endPrompt:()=>act(async()=>tree.root.findAllByType('audio').find(audio=>audio.props.hidden).props.onEnded()),
    expireTimer:()=>act(async()=>{
      const realNow=Date.now;
      Date.now=()=>realNow()+11_000;
      try {tick();} finally {Date.now=realNow;}
    }),
    finishRecording:()=>act(async()=>{
      const recorder=recorders.at(-1);
      recorder.ondataavailable({data:new Blob(['answer'],{type:'audio/mp4'})});
      recorder.onstop();
    }),
    unmount:async()=>{
      await act(async()=>tree.unmount());
      delete navigator.mediaDevices;
      for(const key of ['window','MediaRecorder','IS_REACT_ACT_ENVIRONMENT','requestAnimationFrame','speakingTestStorage'])delete globalThis[key];
    },
  };
}
