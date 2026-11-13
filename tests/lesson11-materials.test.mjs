import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:`export * from './app/api/lesson11-material/route';export * from './app/lesson11-materials';`,resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const files=new Map(m.lesson11Materials.map(file=>[file.id,fs.readFileSync(file.path)]));
const request=id=>new Request('https://example.test'+m.lesson11MaterialHref(id));
test('the complete package retains all four 54-page hybrid workbooks and all four languages',()=>{
 const full=m.lesson11Materials.filter(file=>file.kind==='hybrid');
 assert.deepEqual(full.map(file=>file.locale),['en','fr','ru','tr']);
 assert.ok(full.every(file=>file.pages===54));
 assert.equal(m.lesson11Materials.length,4);
 for(const file of m.lesson11Materials)assert.match(file.commit,/^[a-f0-9]{40}$/,'every download must pin a real source commit');
});
test('public download route serves the exact approved PDF bytes with download headers, without authentication',async()=>{
 const calls=[];globalThis.fetch=async url=>{calls.push(String(url));const file=m.lesson11Materials.find(file=>String(url).endsWith('/'+file.path));return new Response(files.get(file.id));};
 for(const file of m.lesson11Materials){
  const response=await m.GET(request(file.id));assert.equal(response.status,200);
  assert.equal(response.headers.get('Content-Type'),'application/pdf');assert.ok(response.headers.get('Content-Disposition').includes(file.filename));assert.equal(Number(response.headers.get('Content-Length')),file.bytes);
  assert.equal(crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'),file.sha256);
  assert.ok(calls.at(-1).includes('/'+file.commit+'/'));
 }
});
test('unknown file IDs cannot become an arbitrary URL fetch, and failed/corrupt upstream bytes are never returned as PDFs',async()=>{
 let calls=0;globalThis.fetch=async()=>{calls++;return new Response('unavailable',{status:503});};
 assert.equal((await m.GET(request('https://other.test/private'))).status,404);assert.equal(calls,0);
 const unavailable=await m.GET(request('workbook-en'));assert.equal(unavailable.status,503);assert.equal(unavailable.headers.get('Cache-Control'),'no-store');
 const bad=Buffer.from(files.get('workbook-en'));bad[bad.length-1]^=1;
 globalThis.fetch=async()=>new Response(bad);assert.equal((await m.GET(request('workbook-en'))).status,503);
});
test('HEAD reports the verified file and conditional requests preserve the exact content validator',async()=>{
 globalThis.fetch=async()=>new Response(files.get('workbook-en'));
 const response=await m.HEAD(request('workbook-en'));assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,0);assert.equal(response.headers.get('Content-Length'),String(m.lesson11Materials[0].bytes));
 let calls=0;globalThis.fetch=async()=>{calls++;throw Error('No fetch expected');};
 const file=m.lesson11Materials[0],conditional=new Request(request(file.id),{headers:{'If-None-Match':`"${file.sha256}"`}});
 assert.equal((await m.GET(conditional)).status,304);assert.equal(calls,0);
});
