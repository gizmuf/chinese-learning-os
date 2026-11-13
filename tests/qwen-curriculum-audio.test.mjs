import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const compiled=await build({stdin:{contents:`export * from './app/qwen-curriculum-audio';export {lesson09Recording} from './app/lesson09-data';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const hash='a'.repeat(64),clip={material:'lesson09',id:'word-1',text:'学校',source:'/audio/qwen-curriculum/'+hash+'.wav',sha256:hash,durationSeconds:1,validated:true};
const fixture={model:'qwen-audio-3.1-tts-plus',voice:'longanhuan_v3.1',region:'cn-beijing',status:'validated',recordings:[clip]};
test('Qwen replacement requires exact material, text, ID and validated playable metadata',()=>{
 assert.equal(m.selectQwenCurriculumClip(fixture,'lesson09','学校','word-1'),clip);
 for(const [material,text,id] of [['my-day-01-v2','学校','word-1'],['lesson09','学生','word-1'],['lesson09','学校','word-2']])assert.equal(m.selectQwenCurriculumClip(fixture,material,text,id),undefined);
 for(const override of [{validated:false},{durationSeconds:0},{sha256:'bad'},{source:'https://provider.invalid/live'},{source:'/audio/qwen-curriculum/../secret.wav'}])assert.equal(m.selectQwenCurriculumClip({...fixture,recordings:[{...clip,...override}]},'lesson09','学校','word-1'),undefined);
 for(const override of [{status:'pending-keychain-access'},{voice:'other'},{region:'singapore'},{model:'other'}])assert.equal(m.selectQwenCurriculumClip({...fixture,...override},'lesson09','学校','word-1'),undefined);
});
test('Lesson09 uses validated exact replacements and retains every original fallback',()=>{
 const data=JSON.parse(readFileSync('data/qwen-curriculum-audio.json'));
 const old=JSON.parse(readFileSync('public/course09/audio/manifest.json'));
 for(const row of old.recordings){
  const replacement=m.selectQwenCurriculumClip(data,'lesson09',row.text,row.id);
  const path=m.lesson09Recording(row.id);
  assert.equal(path,replacement?.source??'/course09/audio/'+row.file);
  assert.ok(existsSync('public'+path));
 }
 assert.equal(m.lesson09Recording('unknown-recording'),undefined);
});
test('Every released Qwen clip must match its source text and media checksum',()=>{
 const data=JSON.parse(readFileSync('data/qwen-curriculum-audio.json'));
 const old=JSON.parse(readFileSync('public/course09/audio/manifest.json')).recordings;
 const myDay=JSON.parse(readFileSync('data/my-day-01-v2.json')).sections.flatMap(s=>s.rows.map(r=>r.hanzi));
 if(data.status==='validated'){assert.equal(data.recordings.length,348);assert.equal(data.recordings.filter(r=>r.material==='my-day-01-v2').length,26);assert.equal(data.recordings.filter(r=>r.material==='lesson09').length,322);}
 for(const row of data.recordings){
  assert.equal(data.status,'validated');assert.ok(m.selectQwenCurriculumClip(data,row.material,row.text,row.id));
  assert.ok(row.material==='lesson09'?old.some(r=>r.id===row.id&&r.text===row.text):myDay.includes(row.text));
  assert.equal(createHash('sha256').update(readFileSync('public'+row.source)).digest('hex'),row.sha256);
 }
});
