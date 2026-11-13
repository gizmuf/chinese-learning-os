import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './app/api/lesson10-material/route';export * from './app/lesson10-materials';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const files=new Map(m.lesson10Materials.map(file=>[file.id,fs.readFileSync(file.path)]));
const request=id=>new Request('https://example.test'+m.lesson10MaterialHref(id));
test('the complete package retains all four 46-page hybrid workbooks and both existing supplemental endpoints',()=>{
 const full=m.lesson10Materials.filter(file=>file.kind==='hybrid');
 assert.deepEqual(full.map(file=>file.locale),['en','fr','ru','tr']);
 assert.ok(full.every(file=>file.pages===46));
 assert.ok(m.lesson10Materials.some(file=>file.id==='study-en'));
 assert.ok(m.lesson10Materials.some(file=>file.id==='writing-en'));
 for(const file of m.lesson10Materials)assert.match(file.commit,/^[a-f0-9]{40}$/,'every download must pin a real source commit');
});
test('public download route serves the exact approved PDF bytes with download headers, without authentication',async()=>{
 const calls=[];globalThis.fetch=async url=>{calls.push(String(url));const file=m.lesson10Materials.find(file=>String(url).endsWith('/'+file.path));return new Response(files.get(file.id));};
 for(const file of m.lesson10Materials){
  const response=await m.GET(request(file.id));assert.equal(response.status,200);
  assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.ok(response.headers.get('Content-Disposition').includes(file.filename));assert.equal(Number(response.headers.get('Content-Length')),file.bytes);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),file.sha256);
  assert.ok(calls.at(-1).includes('/'+file.commit+'/'));
 }
});
test('unknown file IDs cannot become an arbitrary URL fetch, and failed/corrupt upstream bytes are never returned as PDFs',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response('unavailable',{status:503});};
 assert.equal((await m.GET(request('https://other.test/private'))).status,404);assert.equal(calls,0);
 const unavailable=await m.GET(request('study-en'));assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('Cache-Control'),'no-store');
 const bad=Buffer.from(files.get('study-en'));bad[bad.length-1]^=1;
 globalThis.fetch=async()=>new Response(bad);assert.equal((await m.GET(request('study-en'))).status,503);
});
test('HEAD reports the verified file and conditional requests preserve the exact content validator',async()=>{
 globalThis.fetch=async()=>new Response(files.get('study-en'));
 const response=await m.HEAD(request('study-en'));assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,0);assert.equal(response.headers.get('Content-Length'),'3158765');
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No fetch expected');};
 const file=m.lesson10Materials[0],conditional=new Request(request(file.id),{headers:{'If-None-Match':`"${file.sha256}"`}});
 assert.equal((await m.GET(conditional)).status,304);assert.equal(calls,0);
});
