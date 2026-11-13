import ts from 'typescript';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const code=ts.transpileModule(readFileSync(new URL('app/content.ts',root),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {items}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const manifest=JSON.parse(readFileSync(new URL('public/audio/manifest.json',root),'utf8'));
for(const item of items)for(const [field,kind] of [['hanzi','word'],['sentence','sentence']]){
 const file=`${item.id}-${kind}.mp3`;
 const record=manifest.recordings.find(r=>r.file===file&&r.itemId===item.id&&r.kind===kind&&r.text===item[field]);
 if(!record)throw new Error(`Missing or outdated recording: ${file}`);
 const bytes=readFileSync(new URL(`public/audio/${file}`,root));
 if(bytes.length<1000||createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw new Error(`Invalid audio file: ${file}`);
}
console.log(`Verified ${items.length*2} Mandarin recordings (${manifest.voice}).`);
