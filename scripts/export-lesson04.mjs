import {build} from 'esbuild';
import {writeFileSync} from 'node:fs';
const b=await build({entryPoints:['app/lesson04-data.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
writeFileSync(process.argv[2],JSON.stringify({lesson:m.lesson04,topics:m.lesson04Topics,terms:m.lesson04Terms,sentences:m.lesson04Sentences,builders:m.lesson04Builders.map((v,i)=>({...v,...m.lesson04BuilderCopy[i]})),checks:m.lesson04Checks},null,2));
