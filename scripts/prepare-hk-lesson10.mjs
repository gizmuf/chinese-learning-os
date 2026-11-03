import {readFile,mkdir,copyFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['app/lesson10-materials.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {lesson10Materials}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
await mkdir('dist-hk/lesson10-materials',{recursive:true});
const receipt=[];
for(const file of lesson10Materials){
 const bytes=await readFile(file.path),sha256=createHash('sha256').update(bytes).digest('hex');
 if(bytes.length!==file.bytes||sha256!==file.sha256||bytes.subarray(0,5).toString()!=='%PDF-')throw Error('Unapproved PDF '+file.id);
 await copyFile(file.path,'dist-hk/lesson10-materials/'+file.filename);receipt.push({...file});
}
const quote=s=>'"'+s.replaceAll('"','\\"')+'"';
const map=(name,value)=>'map $arg_file $'+name+' {\n default "";\n'+receipt.map(f=>' '+quote(f.id)+' '+quote(value(f))+';').join('\n')+'\n}\n';
const maps=map('lesson10_pdf',f=>f.filename)+map('lesson10_etag',f=>'"'+f.sha256+'"');
await writeFile('hk/lesson10-maps.conf',maps);
await writeFile('dist-hk/lesson10-materials/manifest.json',JSON.stringify({source:'27241e40b4818ce4d9d8bec133aba42c2c2b26e7',materials:receipt},null,2)+'\n');
console.log(JSON.stringify({verified:receipt.length,complete:receipt.filter(f=>f.kind==='hybrid').length,bytes:receipt.reduce((n,f)=>n+f.bytes,0)}));
