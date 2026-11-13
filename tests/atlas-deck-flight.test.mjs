import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({entryPoints:['app/atlas-deck-flight.ts'],bundle:true,write:false,format:'esm',platform:'node'});
const {settleDeckFlight}=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}}
test('A completed card flight commits once even when its fallback deadline passes',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const d=deferred();let commits=0,aborts=0;
 settleDeckFlight(d.promise,()=>commits++,()=>aborts++,()=>{});d.resolve();await Promise.resolve();t.mock.timers.tick(1000);
 assert.equal(commits,1);assert.equal(aborts,0);
});
test('A cancelled browser animation unlocks via abort and never commits later',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const d=deferred();let commits=0,aborts=0;
 settleDeckFlight(d.promise,()=>commits++,()=>aborts++,()=>{});d.reject(Error('Animation cancelled'));await Promise.resolve();t.mock.timers.tick(1000);
 assert.equal(commits,0);assert.equal(aborts,1);
});
test('Blur or a route change cancels a pending flight and suppresses late completion',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const d=deferred();let commits=0,aborts=0;
 const flight=settleDeckFlight(d.promise,()=>commits++,()=>aborts++,()=>{});flight.cancel();d.resolve();await Promise.resolve();t.mock.timers.tick(1000);
 assert.equal(commits,0);assert.equal(aborts,0);
});
test('A stalled completion gets a bounded forced finish with one commit; a failed finish aborts',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let commits=0,aborts=0,forced=0;const d=deferred();
 settleDeckFlight(d.promise,()=>commits++,()=>aborts++,()=>forced++);t.mock.timers.tick(650);d.resolve();await Promise.resolve();assert.deepEqual([commits,aborts,forced],[1,0,1]);
 settleDeckFlight(new Promise(()=>{}),()=>commits++,()=>aborts++,()=>{throw Error('Detached animation')});t.mock.timers.tick(650);assert.equal(commits,1);assert.equal(aborts,1);
});
