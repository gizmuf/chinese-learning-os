import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const result=await build({stdin:{contents:"export * from './app/atlas-workshop-audio';export {wordBuilds} from './app/atlas-workshop-data';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const a=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('Workshop audio maps whole words and exact example sentences to separate stable clips',()=>{
 const rows=a.workshopAudioEntries(a.wordBuilds);
 assert.equal(rows.filter(r=>r.kind==='word').length,30);
 assert.equal(rows.filter(r=>r.kind==='sentence').length,24);
 assert.equal(new Set(rows.map(r=>r.file)).size,54);
 assert.equal(a.workshopAudioId('洗手'),'atlas-workshop-u6d17-u624b');
 for(const word of a.wordBuilds){
  assert.match(a.workshopRecording(word,'word'),/^\/atlas\/workshop-audio\/atlas-workshop-(u[0-9a-f]+-)+word\.mp3$/);
  const sentence=rows.find(r=>r.itemId===a.workshopAudioId(word.hanzi)&&r.kind==='sentence');
  assert.equal(sentence?.text,word.example?.hanzi);
  assert.equal(Boolean(a.workshopRecording(word,'sentence')),Boolean(word.example));
  if(sentence)assert.notEqual(a.workshopRecording(word,'word'),a.workshopRecording(word,'sentence'));
 }
 assert.deepEqual([...rows].sort((x,y)=>x.file.localeCompare(y.file)),a.workshopAudioEntries([...a.wordBuilds].reverse()).sort((x,y)=>x.file.localeCompare(y.file)));
});
test('Every bundled workshop clip matches its authored text, voice and digest',()=>{
 const manifest=JSON.parse(readFileSync('public/atlas/workshop-audio/manifest.json'));
 assert.equal(manifest.voice,'zh-CN-XiaoxiaoNeural');assert.equal(manifest.generationRate,'-10%');assert.equal(manifest.language,'zh-CN');
 const expected=a.workshopAudioEntries(a.wordBuilds);assert.equal(manifest.recordings.length,expected.length);
 for(const row of expected){const actual=manifest.recordings.find(r=>r.file===row.file);assert.ok(actual,row.file);assert.deepEqual({itemId:actual.itemId,kind:actual.kind,text:actual.text,file:actual.file},row);const data=readFileSync('public/atlas/workshop-audio/'+row.file);assert.ok(data.length>=1000);assert.equal(createHash('sha256').update(data).digest('hex'),actual.sha256);}
});
test('Switching word to sentence keeps one player and preserves the chosen slow speed and pitch',async()=>{
 const original=globalThis.Audio;
 const players=[];
 class AudioMock{
  constructor(src){this.src=src;this.paused=true;players.push(this);}
  pause(){this.paused=true;}
  removeAttribute(){this.src='';}
  load(){}
  play(){this.paused=false;return Promise.resolve();}
 }
 globalThis.Audio=AudioMock;
 try{
  const output=await build({entryPoints:['app/audio.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
  const player=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
  const word=a.wordBuilds.find(w=>w.hanzi==='洗手');
  player.setSpeechRate(.8);
  const first=player.playRecording(a.workshopRecording(word,'word'),()=>{});
  const second=player.playRecording(a.workshopRecording(word,'sentence'),()=>{});
  assert.equal(first.paused,true);assert.equal(first.src,'');assert.equal(second.paused,false);
  assert.equal(second.playbackRate,.8);assert.equal(second.preservesPitch,true);
  assert.equal(players.filter(p=>!p.paused).length,1);
  player.setSpeechRate(1);assert.equal(second.playbackRate,1);
  player.stopAudio();assert.ok(players.every(p=>p.paused));
 }finally{globalThis.Audio=original;}
});
