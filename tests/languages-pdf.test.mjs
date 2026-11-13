import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';import {createRequire} from 'node:module';import {build} from 'esbuild';
const require=createRequire(import.meta.url);
const folder='/tmp/chinese-os-pdf-qa';mkdirSync(folder,{recursive:true});
await build({entryPoints:['app/notebook-pdf.ts','app/translate.ts','app/content.ts'],outdir:folder,bundle:true,platform:'node',format:'cjs',outExtension:{'.js':'.cjs'},logLevel:'silent'});
const {items,isInLevel}=require(folder+'/content.cjs');const {localizeItem,translate}=require(folder+'/translate.cjs');const {createNotebookPdf,worksheetItems}=require(folder+'/notebook-pdf.cjs');
const translations=JSON.parse(readFileSync('data/translations.json','utf8'));
test('all 1020 vocabulary cards have French and Russian meanings and sentences without changing learning identity',()=>{
 assert.equal(Object.keys(translations.vocabulary).length,items.length);
 for(const locale of ['fr','ru'])for(const item of items){const localized=localizeItem(item,locale);assert.ok(localized.english&&localized.translation);assert.equal(localized.english,translations.vocabulary[item.id][locale].english);for(const key of ['id','lesson','hanzi','pinyin','sentence','sentencePinyin','hskEntry','hskLevel'])assert.equal(localized[key],item[key]);}
 for(const [key,values]of Object.entries(translations.ui))for(const locale of ['fr','ru']){assert.ok(values[locale]);assert.deepEqual([...key.matchAll(/\{\d+\}/g)].map(x=>x[0]).sort(),[...values[locale].matchAll(/\{\d+\}/g)].map(x=>x[0]).sort());}
 assert.equal(translate('Stroke {0} of {1}','ru',[2,7]),'Черта 2 из 7');
});
test('PDF selection cannot leak words from another study level',()=>{
 const selected=items.map(i=>i.id);assert.equal(worksheetItems(items,selected,'hsk1').length,300);assert.equal(worksheetItems(items,selected,'hsk2').length,200);assert.equal(worksheetItems(items,selected,'bonus').length,20);assert.equal(worksheetItems(items,selected,'hsk3').length,500);
});
const font=new Uint8Array(readFileSync('public/fonts/NotoSans-Regular.ttf'));const characters=Object.fromEntries([...new Set(items.flatMap(i=>Array.from(i.hanzi)))].map(char=>[char,JSON.parse(readFileSync(`public/characters/${char}.json`,'utf8'))]));
test('A4 notebook generation supports whole lessons, Cyrillic, pinyin and vector stroke diagrams',async()=>{
 for(const locale of ['en','fr','ru']){const pool=items.filter(i=>isInLevel(i,'hsk2')&&i.lesson==='first').map(i=>localizeItem(i,locale));const bytes=await createNotebookPdf(pool,'hsk2',locale,{font,characters});assert.equal(Buffer.from(bytes.slice(0,4)).toString(),'%PDF');assert.ok(bytes.length>10_000);writeFileSync(`${folder}/HSK2-${locale}.pdf`,bytes);}
 await assert.rejects(()=>createNotebookPdf([items[0],items.at(-1)],'hsk1','en',{font,characters}),/one study level/);
});

test('HSK3 notebooks generate in all three languages with every selected character',async()=>{
 for(const locale of ['en','fr','ru']){
  const pool=items.filter(i=>i.hskLevel===3).filter((_,index)=>index%100===0).map(i=>localizeItem(i,locale));
  const bytes=await createNotebookPdf(pool,'hsk3',locale,{font,characters});
  assert.equal(Buffer.from(bytes.slice(0,4)).toString(),'%PDF');assert.ok(bytes.length>10_000);
  writeFileSync(`${folder}/HSK3-${locale}.pdf`,bytes);
 }
});
