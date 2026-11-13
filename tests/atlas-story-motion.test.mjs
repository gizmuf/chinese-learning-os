import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
async function load(entry) {
  const r = await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
  return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64'));
}
const m = await load('app/atlas-story-motion.ts');
test('Narration maps to a continuous timeline, including exact stage boundaries and seeking', () => {
  assert.equal(m.stageAt(0),0);
  assert.equal(m.stageAt(1/3),1);
  assert.equal(m.stageAt(2/3),2);
  assert.equal(m.stageAt(1),2);
  assert.equal(m.progressForAudio(0,6,6),m.progressForAudio(1,0,10));
  assert.equal(m.progressForAudio(1,10,10),m.progressForAudio(2,0,8));
  assert.equal(m.progressForAudio(2,8,8),1);
  assert.equal(m.progressForAudio(1,5,10),.5);
  assert.ok(Number.isFinite(m.progressForAudio(0,0,0)));
});
test('Morphing retains endpoints and handles a dot becoming a stroke without invalid geometry', () => {
  const dot=m.resample([[320,195],[320,195]]), line=m.resample([[240,195],[400,195]]);
  assert.deepEqual(line[0],[240,195]);
  assert.deepEqual(line.at(-1),[400,195]);
  for(const p of [0,.25,.5,.75,1]) assert.ok(!/NaN|Infinity/.test(m.morph(dot,line,p)));
  assert.ok(m.morph(dot,line,1).startsWith('M240.00,195.00'));
  assert.deepEqual(m.glyphPoint([0,900]),[170,45]);
  assert.deepEqual(m.glyphPoint([1024,-124]),[470,345]);
});
test('Unmounting a story cannot stop a pronunciation started elsewhere', async () => {
  class AudioMock {
    constructor(src){this.src=src;this.paused=false;}
    pause(){this.paused=true;}
    load(){}
    removeAttribute(){this.src='';}
    play(){this.paused=false;return Promise.resolve();}
  }
  globalThis.Audio=AudioMock;
  try {
    const audio=await load('app/audio.ts');
    const story=audio.playRecording('/story.mp3',()=>{});
    const word=audio.playRecording('/word.mp3',()=>{});
    assert.equal(story.paused,true);
    audio.releaseRecording(story);
    assert.equal(word.paused,false);
    assert.equal(word.src,'/word.mp3');
    audio.releaseRecording(word);
    assert.equal(word.paused,true);
    assert.equal(word.src,'');
  } finally {delete globalThis.Audio;}
});
