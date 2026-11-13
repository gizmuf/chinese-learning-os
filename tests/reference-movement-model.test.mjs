import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';
const b=await build({entryPoints:['app/reference-movement-model.ts'],bundle:true,platform:'node',format:'esm',write:false});const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
test('all twelve source pairs keep path and actor unchanged while the speaker determines the ending',()=>{
 const pairs=['进','出','过','回','上','下'];
 for(let i=0;i<6;i++)for(const p of [0,.25,.5,.75,1]){const come=m.referenceMovementState(i,true,p),go=m.referenceMovementState(i,false,p);assert.equal(come.hanzi,pairs[i]+'来');assert.equal(go.hanzi,pairs[i]+'去');assert.deepEqual(come.actor,go.actor);assert.equal(come.arrived,p===1);}
 assert.notEqual(m.referenceDirections[0].from.x,m.referenceDirections[1].from.x);assert.ok(m.referenceDirections[4].from.y>m.referenceDirections[4].to.y);assert.ok(m.referenceDirections[5].from.y<m.referenceDirections[5].to.y);
});
