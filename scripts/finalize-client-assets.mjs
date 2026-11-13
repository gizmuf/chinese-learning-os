import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
/** Rolldown may merge away a chunk after RSC collected its preload list.
 * Remove only unreferenced preload entries; a missing real import stays fatal. */
export function finalizeClientAssets(root=process.cwd()){
 const client=path.join(root,'dist/client'),server=path.join(root,'dist/server');
 const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>entry.isDirectory()?walk(path.join(dir,entry.name)):[path.join(dir,entry.name)]);
 const scripts=walk(client).filter(file=>file.endsWith('.js')).map(file=>({file,code:fs.readFileSync(file,'utf8')}));
 for(const {file,code} of scripts)for(const match of code.matchAll(/["']((?:\.\.?\/)[^"'\n]+\.js)["']/g))if(!fs.existsSync(path.resolve(path.dirname(file),match[1])))throw Error('Missing client import: '+file+' → '+match[1]);
 const manifests=walk(server).filter(file=>path.basename(file)==='__vite_rsc_assets_manifest.js');if(!manifests.length)throw Error('No built RSC asset manifest found');
 const removed=new Set(),checked=new Set();
 const exists=url=>fs.existsSync(path.join(client,url.replace(/^\//,'')));
 for(const file of manifests){
  const raw=fs.readFileSync(file,'utf8').trim();if(!raw.startsWith('export default '))throw Error('Unknown RSC manifest format');
  const data=JSON.parse(raw.slice('export default '.length).replace(/;$/,''));
  for(const bootstrap of (data.bootstrapScriptContent??'').matchAll(/\/_next\/static\/(?:chunks|css)\/[A-Za-z0-9_.-]+\.js/g))if(!exists(bootstrap[0]))throw Error('Missing bootstrap module: '+bootstrap[0]);
  for(const group of [data.clientReferenceDeps,data.serverResources])for(const deps of Object.values(group??{}))for(const kind of ['js','css']){
   if(!Array.isArray(deps[kind]))continue;
   deps[kind]=deps[kind].filter(url=>{
    if(!url.startsWith('/_next/static/'))return true;checked.add(url);if(exists(url))return true;
    if(kind!=='js'||scripts.some(script=>script.code.includes(path.basename(url))))throw Error('Missing required client resource: '+url);
    removed.add(url);return false;
   });
  }
  fs.writeFileSync(file,'export default '+JSON.stringify(data,null,2)+'\n');
 }
 const report={manifests:manifests.length,checkedResources:checked.size,removedUnusedPreloads:[...removed],missingRequiredImports:0};
 fs.writeFileSync(path.join(server,'client-assets-check.json'),JSON.stringify(report,null,2)+'\n');return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(finalizeClientAssets()));
