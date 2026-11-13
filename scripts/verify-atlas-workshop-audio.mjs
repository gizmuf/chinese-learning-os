import { build } from 'esbuild';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const output=await build({stdin:{contents:"import {wordBuilds} from './app/atlas-workshop-data';import {workshopAudioEntries} from './app/atlas-workshop-audio';export const rows=workshopAudioEntries(wordBuilds);",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {rows}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const directory='public/atlas/workshop-audio/';
const manifest=JSON.parse(readFileSync(directory+'manifest.json','utf8'));
if(manifest.voice!=='zh-CN-XiaoxiaoNeural'||manifest.language!=='zh-CN'||manifest.generationRate!=='-10%')throw Error('Unexpected workshop pronunciation voice/rate');
if(manifest.recordings.length!==rows.length || new Set(manifest.recordings.map(r=>r.file)).size!==rows.length)throw Error('Wrong recording inventory');
for(const row of rows){
 const record=manifest.recordings.find(r=>r.file===row.file);
 if(!record || ['itemId','kind','text'].some(k=>record[k]!==row[k]))throw Error('Missing/stale workshop recording: '+row.file);
 const data=readFileSync(directory+row.file);
 if(data.length<1000 || createHash('sha256').update(data).digest('hex')!==record.sha256)throw Error('Invalid workshop recording: '+row.file);
}
const actual=readdirSync(directory).filter(file=>file.endsWith('.mp3')).sort();
if(JSON.stringify(actual)!==JSON.stringify(rows.map(r=>r.file).sort()))throw Error('Unexpected workshop MP3 files');
console.log(`Verified ${rows.filter(r=>r.kind==='word').length} Atlas workshop words and ${rows.filter(r=>r.kind==='sentence').length} full sentences (${manifest.voice}, ${manifest.generationRate}).`);
