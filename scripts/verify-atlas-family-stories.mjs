import {build} from 'esbuild';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const output=await build({entryPoints:['app/atlas-family-stories-data.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {familyStoryAudio}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const rows=familyStoryAudio(),dir='public/atlas/family-stories/';
const manifest=JSON.parse(readFileSync(dir+'manifest.json','utf8'));
if(manifest.recordings.length!==rows.length)throw Error('Unexpected family story audio inventory');
for(const row of rows){const record=manifest.recordings.find(r=>r.file===row.file),data=readFileSync(dir+row.file);if(!record||['text','voice','rate'].some(k=>record[k]!==row[k])||data.length<1000||createHash('sha256').update(data).digest('hex')!==record.sha256)throw Error('Stale family story audio: '+row.file);}
if(JSON.stringify(readdirSync(dir).filter(f=>f.endsWith('.mp3')).sort())!==JSON.stringify(rows.map(r=>r.file).sort()))throw Error('Unexpected family story recording');
console.log(`Verified ${rows.length} family story narrations and pronunciation recordings.`);
