import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
const result=await build({entryPoints:['app/browse-data.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const data=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('compressed browsing data decodes exactly to every original source field',()=>{
 assert.deepEqual(data.hskBrowseData,JSON.parse(fs.readFileSync('data/hsk-browse-index.json')));
 assert.deepEqual(data.hanziStructureData,JSON.parse(fs.readFileSync('data/hanzi-structure.json')));
});
test('compressed simplified policy preserves all alias and ambiguous-reading decisions',async()=>{
 const result=await build({entryPoints:['app/simplified-policy-data.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
 const module=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 assert.deepEqual(module.default,JSON.parse(fs.readFileSync('data/simplified-dictionary-policy.json')));
});
