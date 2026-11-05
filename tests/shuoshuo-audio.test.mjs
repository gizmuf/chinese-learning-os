import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const result=await build({stdin:{contents:`export * from './app/shuoshuo-audio';export {appStudyDictionary} from './app/study-lookup-model';`,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',write:false});const file=join(mkdtempSync(join(tmpdir(),'shuoshuo-audio-')),'model.mjs');writeFileSync(file,result.outputFiles[0].text);const m=await import(pathToFileURL(file));
const lesson=JSON.parse(readFileSync('data/shuoshuo-morning.json')),audio=JSON.parse(readFileSync('data/shuoshuo-morning-audio.json'));
test('all 42 authored sentence IDs have exact synthetic readings; 41 unique texts reuse 41 files',()=>{
 assert.deepEqual(m.shuoshuoAudioCounts,{words:40,sentences:42});assert.equal(Object.keys(audio.sentences).length,42);
 const files=new Set();for(const row of lesson.sentences){const clip=m.shuoshuoSentenceAudio(row.id,row.hanzi);assert.ok(clip,row.id);assert.equal(clip.text,row.hanzi);assert.equal(m.shuoshuoSentenceAudioForText(row.hanzi).source,clip.source);files.add(clip.source);assert.equal(clip.validated,true);assert.equal(clip.synthetic,true);assert.ok(clip.durationSeconds>0);assert.equal(createHash('sha256').update(readFileSync('public'+clip.source)).digest('hex'),clip.sha256);}
 assert.equal(files.size,41);assert.equal(createHash('sha256').update(readFileSync('data/shuoshuo-morning.json')).digest('hex'),'82954ce61e4663f5b9e7fff1a2122c804637c7f268a2bda7fd62f02564e069e8');
});
test('five missing words have new exact clips and all 35 established references remain present',()=>{
 assert.equal(Object.keys(audio.words).length,40);const missing=['刷牙','洗脸','烧水','泡咖啡','阳台'];for(const word of missing){const clip=m.shuoshuoWordAudio(word);assert.ok(clip);assert.equal(clip.voice,'zh-CN-XiaoxiaoNeural');assert.equal(clip.synthetic,true);assert.ok(clip.source.startsWith('/audio/shuoshuo/'));}
 const old=Object.entries(audio.words).filter(([word])=>!missing.includes(word));assert.equal(old.length,35);for(const [word,clip] of old){assert.ok(clip.manifest);assert.equal(m.shuoshuoWordAudio(word).source,clip.source);assert.equal(createHash('sha256').update(readFileSync('public'+clip.source)).digest('hex'),clip.sha256);}
});
test('sentences reject changed text, wrong IDs, unvalidated clips, wrong voice and external paths',()=>{
 const row=lesson.sentences[0],original=audio.sentences[row.id];assert.equal(m.shuoshuoSentenceAudio(row.id,row.hanzi+'。'),undefined);assert.equal(m.shuoshuoSentenceAudio('unknown',row.hanzi),undefined);assert.equal(m.shuoshuoWordAudio('not lesson text'),undefined);
 for(const patch of [{source:'https://bad.invalid/file.mp3'},{validated:false},{synthetic:false},{voice:'wrong'},{durationSeconds:0},{sha256:'bad'}]){const data={...audio,sentences:{...audio.sentences,[row.id]:{...original,...patch}}};assert.equal(m.selectShuoshuoSentence(data,row.id,row.hanzi),undefined);}
});
test('shared dictionary supplies five word recordings and distinct contextual full-sentence playback',()=>{
 const dictionary=m.appStudyDictionary('en');for(const word of ['刷牙','洗脸','烧水','泡咖啡','阳台']){const e=dictionary.get(word);assert.equal(e.audio.text,word);assert.equal(e.audio.source,m.shuoshuoWordAudio(word).source);assert.equal(e.audio.context,false);}
 for(const row of lesson.sentences){const e=dictionary.get(row.hanzi);assert.equal(e.audio.text,row.hanzi);assert.equal(e.audio.kind,'sentence');assert.equal(e.audio.context,true);}
});
