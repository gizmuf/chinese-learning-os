import fs from 'node:fs';
import { build } from 'esbuild';
const bundled = await build({entryPoints:['app/content.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {items} = await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const ui = {};
for (const line of fs.readFileSync('data/ui-translations.tsv','utf8').trim().split('\n')) {
  const [key,fr,ru,...extra] = line.split('\t');
  if (!key || !fr || !ru || extra.length || ui[key]) throw Error('Invalid or duplicate UI row: '+key);
  ui[key] = {fr,ru};
}
const vocabulary = {};
for (const line of fs.readFileSync('data/vocabulary-fr-ru.tsv','utf8').trim().split('\n')) {
  const [id,frMeaning,ruMeaning,frSentence,ruSentence,...extra] = line.split('\t');
  if (!items.some(i=>i.id===id) || vocabulary[id] || extra.length || ![frMeaning,ruMeaning,frSentence,ruSentence].every(Boolean)) throw Error('Invalid vocabulary row: '+id);
  vocabulary[id] = {fr:{english:frMeaning,translation:frSentence},ru:{english:ruMeaning,translation:ruSentence}};
}
for(const item of items) if(!vocabulary[item.id]) throw Error('Missing translation: '+item.id);
fs.writeFileSync('data/translations.json',JSON.stringify({ui,vocabulary},null,2)+'\n');
console.log(`Built ${Object.keys(ui).length} UI keys and ${Object.keys(vocabulary).length} bilingual cards.`);
