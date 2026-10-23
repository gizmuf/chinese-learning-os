import {build} from 'esbuild';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
const destination=process.argv[2];
if(!destination||!isAbsolute(destination))throw Error('Pass an absolute output JSON path');
const out=await build({entryPoints:['app/atlas-family-stories-data.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {familyStoryAudio}=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
writeFileSync(destination,JSON.stringify(familyStoryAudio(),null,2)+'\n');
console.log(`Exported ${familyStoryAudio().length} authored story recordings.`);
