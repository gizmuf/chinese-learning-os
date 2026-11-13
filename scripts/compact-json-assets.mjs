import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';

// Reduce deployment packaging overhead without removing learning content.
// Only generated JSON delivery copies change; original sources and media stay intact.
export function compactJsonAssets(root=path.join(process.cwd(),'dist/client')) {
 let savedBytes=0, files=0;
 function visit(dir) {
  for(const item of fs.readdirSync(dir,{withFileTypes:true})) {
   const file=path.join(dir,item.name);
   if(item.isDirectory()) visit(file);
   else if(item.isFile()&&item.name.endsWith('.json')) {
    const original=fs.readFileSync(file,'utf8');
    const value=JSON.parse(original), compact=JSON.stringify(value);
    assert.deepStrictEqual(JSON.parse(compact),value,`JSON value changed: ${file}`);
    const saved=Buffer.byteLength(original)-Buffer.byteLength(compact);
    if(saved>0){fs.writeFileSync(file,compact);savedBytes+=saved;files++;}
   }
  }
 }
 visit(root);return {files,savedBytes};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(compactJsonAssets()));
