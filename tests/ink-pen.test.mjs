import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export {inkOutline} from './app/ink-render';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const {inkOutline}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('pen line width does not change with Pencil pressure and does not alter stored points',()=>{
 const low=[{x:.1,y:.1,p:.05,t:1},{x:.5,y:.4,p:.05,t:2},{x:.8,y:.7,p:.05,t:3}];
 const high=low.map(p=>({...p,p:1})),before=JSON.stringify(low);
 assert.deepEqual(inkOutline(low,200,200,true,'pen'),inkOutline(high,200,200,true,'pen'));
 assert.notDeepEqual(inkOutline(low,200,200,true,'brush'),inkOutline(high,200,200,true,'brush'));
 assert.equal(JSON.stringify(low),before);
});
