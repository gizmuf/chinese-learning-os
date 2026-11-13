import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const b=await build({stdin:{contents:`export * from './app/review-queue';export {items,curriculum} from './app/content';`,resolveDir:process.cwd()},bundle:true,format:'esm',platform:'node',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
test('Practice all includes every level entry, even when already reviewed and regardless of the time cap',()=>{
 const pool=m.items.filter(i=>i.hskLevel===1),at=Date.now();const events=pool.map((i,n)=>({id:'seed-'+n,itemId:i.id,skill:'meaning',mode:'recall',rating:4,assisted:false,at,timezone:'UTC',detail:{}}));
 assert.equal(pool.length,300);assert.equal(new Set(pool.flatMap(i=>Array.from(i.hanzi))).size,248);
 assert.equal(m.buildReviewQueue(events,'meaning',pool,1).length,0);
 assert.equal(m.buildReviewQueue(events,'meaning',pool,1,'extra').length,2);
 assert.deepEqual(m.buildReviewQueue(events,'meaning',pool,1,'all').map(i=>i.id),pool.map(i=>i.id));
 assert.equal(m.curriculum.edition,'HSK 2025 syllabus');
});
test('all-level queues preserve separate senses and incremental vs cumulative scope',()=>{
 const second=m.items.filter(i=>i.hskLevel===2),third=m.items.filter(i=>i.hskLevel===3);
 assert.equal(m.buildReviewQueue([],'meaning',second,1,'all').length,200);assert.equal(new Set(second.map(i=>i.hanzi)).size,198);
 assert.equal(m.buildReviewQueue([],'meaning',third,1,'all').length,500);assert.equal(m.items.filter(i=>i.hskLevel).length,1000);
});
test('shareable all-word links only accept explicit supported HSK scopes',()=>{
 for(const [level,n] of [['hsk1',1],['hsk2',2],['hsk3',3]])assert.equal(m.allReviewLevel(m.allReviewHref(level)),level);
 for(const s of ['', '?practice=all','?practice=all&hsk=4','?practice=due&hsk=1'])assert.equal(m.allReviewLevel(s),null);
 assert.equal(m.allReviewHref('bonus'),null);
});
