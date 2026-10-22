import{build}from'esbuild';import{readFileSync,copyFileSync,mkdirSync}from'node:fs';import{createHash}from'node:crypto';
const output=await build({entryPoints:['app/atlas-model.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});const{atlasCharacters,componentById,coreIds}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
if(coreIds.size!==100||atlasCharacters.length!==106)throw Error('Unexpected Atlas inventory');mkdirSync('public/characters',{recursive:true});
const chars=new Set(atlasCharacters.flatMap(c=>Array.from(c.hanzi+c.word).filter(c=>/[\u3400-\u9fff]/.test(c))));for(const char of chars)copyFileSync('node_modules/hanzi-writer-data/'+char+'.json','public/characters/'+char+'.json');
const structure=JSON.parse(readFileSync('public/atlas/component-strokes.json','utf8'));const manifest=JSON.parse(readFileSync('public/atlas/audio/manifest.json','utf8'));
for(const c of atlasCharacters){const data=JSON.parse(readFileSync('public/characters/'+c.hanzi+'.json','utf8'));for(const id of c.components){if(!componentById.has(id))throw Error('Unknown component');for(const i of structure.mappings[c.id]?.[id]??[])if(i<0||i>=data.strokes.length)throw Error('Invalid stroke mapping');}
 for(const kind of['word','sentence']){const file=`atlas-${c.id}-${kind}.mp3`;const record=manifest.recordings.find(r=>r.file===file&&r.itemId==='atlas-'+c.id&&r.kind===kind&&r.text===c.word);if(!record)throw Error('Missing contextual audio '+file);const bytes=readFileSync('public/atlas/audio/'+file);if(bytes.length<1000||createHash('sha256').update(bytes).digest('hex')!==record.sha256)throw Error('Invalid recording '+file);}
}
for(const name of ['makemeahanzi-COPYING.txt','makemeahanzi-dictionary-LGPL.txt','makemeahanzi-GPL-3.0.txt'])if(readFileSync('public/licenses/'+name).length<500)throw Error('Missing licence');
if(readFileSync('public/atlas/Hanzi_Connections_Atlas_v2_100_EN.pdf').subarray(0,4).toString()!=='%PDF')throw Error('Missing Atlas PDF');
console.log(`Verified Atlas: 100 core + 6 discovery entries, ${chars.size} writing/example glyphs, 212 contextual recordings and component mappings.`);
