import ts from 'typescript';
import {readFileSync,writeFileSync} from 'node:fs';
const source=readFileSync(new URL('../app/content.ts',import.meta.url),'utf8');
const result=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}});
const {items}=await import('data:text/javascript;base64,'+Buffer.from(result.outputText).toString('base64'));
if(!process.argv[2])throw new Error('Usage: node scripts/export-audio-content.mjs /absolute/content.json');
writeFileSync(process.argv[2],JSON.stringify(items,null,2)+'\n');
console.log(`Exported ${items.length} vocabulary items.`);
