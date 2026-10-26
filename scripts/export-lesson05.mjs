import {build} from 'esbuild';
import {writeFileSync} from 'node:fs';
import {isAbsolute} from 'node:path';
const destination=process.argv[2];
if(!destination||!isAbsolute(destination))throw Error('Pass an absolute output JSON path');
const b=await build({entryPoints:['app/lesson05-data.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
writeFileSync(destination,JSON.stringify({date:m.lesson05.date,title:m.lesson05.title,topics:m.lesson05Topics,terms:m.lesson05Terms,sentences:m.lesson05Sentences,paths:m.lesson05Paths,connections:m.lesson05Connections},null,2)+'\n');
console.log('Exported Lesson05 content in EN/FR/RU/TR.');
