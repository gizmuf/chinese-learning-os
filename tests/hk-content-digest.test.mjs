import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {createHash} from 'node:crypto';import {build} from 'esbuild';
const output=await build({entryPoints:['hk/content-digest.ts'],bundle:true,platform:'node',format:'cjs',write:false});
test('preserved HTTP content-only SHA256 fallback matches native SHA256 across134 boundary and Unicode vectors',async()=>{
 const context={module:{exports:{}},exports:{},Uint8Array,Uint32Array,ArrayBuffer,DataView,crypto:undefined};vm.runInNewContext(output.outputFiles[0].text,context);const {contentDigest}=context.module.exports;
 const cases=[...['','abc','你好，今天星期一。','𠀀 / café / Русский / Türkçe'].map(s=>new TextEncoder().encode(s)),...Array.from({length:130},(_,n)=>Uint8Array.from({length:n},(_,i)=>(i*37+n)%256))];
 for(const bytes of cases)assert.equal(Buffer.from(await contentDigest('SHA-256',bytes)).toString('hex'),createHash('sha256').update(bytes).digest('hex'));
 await assert.rejects(contentDigest('SHA-1',new Uint8Array()),/Only SHA-256/);
});
