import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

/** Ship Atlas browse glyphs from the already pinned, attributed Hanzi Writer data. */
export async function prepareAtlasBrowseStrokes(target='public/characters'){
 const {characters}=JSON.parse(await readFile('data/hsk-browse-index.json','utf8'));
 const glyphs=[...new Set(characters.map(row=>row.hanzi))].sort();
 await mkdir(target,{recursive:true});
 let added=0;
 for(const glyph of glyphs){
  if(!/^\p{Unified_Ideograph}$/u.test(glyph))throw Error('Unexpected Atlas browse glyph: '+glyph);
  const path=join(target,glyph+'.json');
  const bytes=await readFile(join('node_modules/hanzi-writer-data',glyph+'.json'));
  const value=JSON.parse(bytes);
  if(!value.strokes?.length||value.strokes.length!==value.medians?.length)throw Error('Missing Atlas stroke data: '+glyph);
  // Previously published character URLs are immutable. Keep their exact bytes.
  try{await writeFile(path,bytes,{flag:'wx'});added++;}
  catch(error){if(error.code!=='EEXIST')throw error;}
 }
 console.log('Atlas browse strokes: '+glyphs.length+' glyphs, '+added+' newly staged.');
 return {total:glyphs.length,added};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))await prepareAtlasBrowseStrokes(process.argv[2]);
