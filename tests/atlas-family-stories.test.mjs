import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
const out=await build({entryPoints:['app/atlas-family-stories-data.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {familyStories,storySource,familyStoryAudio}=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
test('Story pilot preserves origin, sound and memory distinctions across three languages',()=>{
 assert.deepEqual(familyStories.map(s=>s.hanzi),['莫','暮','幕','摸','模']);
 assert.deepEqual(familyStories.filter(s=>s.origin).map(s=>s.hanzi),['莫','暮']);
 for(const s of familyStories){assert.equal(s.captions.length,3);assert.ok(storySource(s.hanzi).startsWith('https://humanum.arts.cuhk.edu.hk/'));for(const locale of ['en','fr','ru']){assert.ok(s.meaning[locale]);assert.ok(s.componentMeaning[locale]);for(const caption of s.captions)assert.ok(caption[locale].length>40);if(s.word){assert.ok(s.word.meaning[locale]);assert.ok(s.word.translation[locale]);}}}
 assert.match(familyStories.find(s=>s.hanzi==='模').captions[2].en,/mú.*模具/);
 assert.match(familyStories.find(s=>s.hanzi==='莫').captions[2].en,/borrowed/);
});
test('Every story and whole word has the established locale or Mandarin voice',async()=>{
 const rows=familyStoryAudio();assert.equal(rows.length,23);assert.equal(new Set(rows.map(r=>r.file)).size,rows.length);
 assert.equal(rows.filter(r=>r.voice==='zh-CN-XiaoxiaoNeural'&&r.rate==='-10%').length,8);
 await import('../scripts/verify-atlas-family-stories.mjs');
});
test('Discovery content does not silently expand scheduled HSK or Atlas learning targets',()=>{
 const source=readFileSync('app/atlas-family-stories.tsx','utf8');assert.ok(source.includes('useSwipeNavigation(move)'));assert.ok(!source.includes('.record('));assert.ok(!source.includes('localStorage'));assert.ok(source.includes('releaseRecording'));
});
