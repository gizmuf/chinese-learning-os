import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {build} from 'esbuild';

const bundle=await build({
 stdin:{contents:`export * from './app/dictionary-character-family-model';
 export {sourceCharacterEntry} from './app/dictionary-source-model';
 export {dictionaryStructureParts} from './app/dictionary-structure';`,resolveDir:process.cwd()},
 bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'
});
const {dictionaryFamilyParts:parts,dictionaryCharacterFamily:family,sourceCharacterEntry,dictionaryStructureParts}=await import(
 'data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64')
);
const source=JSON.parse(gunzipSync(readFileSync('public/dictionary/characters.json.gz')));
const dictionary=new Map(Object.entries(source).map(([glyph,row])=>[glyph,sourceCharacterEntry(glyph,row)]));
const glyphs=entries=>entries.map(entry=>entry.text);
const row=(text,decomposition)=>({text,pinyin:'fixture',meaning:'synthetic shape fixture',
 ...(decomposition===undefined?{}:{structure:{radical:text,decomposition}})});
const fixture=rows=>new Map(rows.map(([text,decomposition])=>[text,row(text,decomposition)]));

// Independent forward closure over the established structure reader checks
// completeness against the full source, rather than a hand-picked short list.
const sourceParts=new Map([...dictionary].map(([glyph,entry])=>[
 glyph,dictionaryStructureParts(entry.structure?.decomposition??'').map(part=>part.glyph)
]));
function sourceFamily(selected,part){
 const reached=new Set([part]),matches=new Set();
 let changed;
 do{
  changed=false;
  for(const [glyph,leaves] of sourceParts){
   if(!leaves.some(leaf=>reached.has(leaf)))continue;
   matches.add(glyph);
   if(!reached.has(glyph)){reached.add(glyph);changed=true;}
  }
 }while(changed);
 return [...matches].filter(glyph=>glyph!==selected).sort();
}

test('full source 青 family includes 清 情 请 without a course or twelve-row cap',()=>{
 assert.equal(dictionary.size,9574);
 assert.equal(source['晴'].decomposition,'⿰日青');
 const result=glyphs(family('晴','青',dictionary));
 for(const glyph of ['清','情','请','睛','精','静','靓','箐','倩'])assert.ok(result.includes(glyph),glyph);
 assert.ok(!result.includes('晴'));
 assert.ok(result.length>12);
 assert.deepEqual([...result].sort(),sourceFamily('晴','青'));
 assert.equal(new Set(result).size,result.length);
});

test('source 木 family includes recursively derived rows and all available matches',()=>{
 assert.equal(source['霖'].decomposition,'⿱雨林');
 const result=glyphs(family('木','木',dictionary));
 for(const glyph of ['休','林','森','淋','霖','琳','禁','彬','楚'])assert.ok(result.includes(glyph),glyph);
 assert.ok(!result.includes('木'));
 assert.ok(result.length>12);
 assert.deepEqual([...result].sort(),sourceFamily('木','木'));
});

test('source preference can select an attested nested part, not an unrelated available family',()=>{
 assert.equal(source['青'].decomposition,'⿱龶月');
 assert.equal(parts('晴',dictionary,'青')[0],'青');
 assert.equal(parts('晴',dictionary,'月')[0],'月');
 assert.ok(glyphs(family('晴','月',dictionary)).includes('清'));
 assert.deepEqual(parts('晴',dictionary,'木'),parts('晴',dictionary));
 assert.deepEqual(parts('晴',dictionary,'氵'),parts('晴',dictionary));
});

test('selectors order preferred, selected and direct meaningful leaves with actual other matches',()=>{
 const d=fixture([
  ['明','⿰日月'],['盟','⿱明皿'],['日'],['月'],['晶','⿱日⿰日日'],['朋','⿰月月'],
  ['光','⿱⺌兀'],['耀','⿰光翟'],['品','⿱口⿰口口'],['口'],['独','⿰犭虫']
 ]);
 assert.deepEqual(parts('明',d,'月'),['月','明','日']);
 assert.deepEqual(parts('明',d),['明','日','月']);
 assert.deepEqual(parts('明',d,'光'),['明','日','月']);
 assert.deepEqual(parts('品',d),[]); // Repeated self-only parts are not a family.
 assert.deepEqual(parts('独',d),[]);
 assert.deepEqual(parts('口',d),['口']);
 assert.deepEqual(parts('明',d,'⿰'),parts('明',d));
});

test('cycles remain complete regardless of query or dictionary insertion order',()=>{
 const d=fixture([['甲','⿰乙木'],['乙','⿰甲日'],['丙','⿰甲口'],['木'],['日'],['口']]);
 assert.deepEqual(glyphs(family('木','木',d)).sort(),['丙','乙','甲'].sort());
 assert.deepEqual(glyphs(family('甲','木',d)).sort(),['丙','乙'].sort());
 assert.deepEqual(glyphs(family('甲','日',d)).sort(),['丙','乙'].sort());
 const reversed=new Map([...d].reverse());
 assert.deepEqual(glyphs(family('甲','日',reversed)),glyphs(family('甲','日',d)));
 assert.deepEqual(glyphs(family('甲','木',reversed)),glyphs(family('甲','木',d)));
 assert.ok(!glyphs(family('甲','甲',d)).includes('甲'));
});

test('missing component rows are opaque leaves, while explicit unknown siblings are safe',()=>{
 const d=fixture([
  ['甲','⿰𠆢?'],['乙','⿱甲木'],['丙','⿰𠆢？'],['丁','？'],['戊'],['木']
 ]);
 assert.ok(!d.has('𠆢'));
 assert.deepEqual(glyphs(family('甲','𠆢',d)),['丙','乙']);
 assert.equal(parts('甲',d,'𠆢')[0],'𠆢');
 assert.deepEqual(family('戊','丁',d),[]);
 assert.deepEqual(family('甲','龍',d),[]);
 assert.deepEqual(family('𠆢','木',d),[]); // The selected character must be available.
 assert.deepEqual(family('甲','？',d),[]);
 assert.deepEqual(family('甲','?',d),[]);
});

test('incomplete, ambiguous and extra IDS tokens do not invent containment',()=>{
 const d=fixture([
  ['木'],['甲','⿰木'],['乙','木日'],['丙','⿰木日/⿰月土'],['丁','⿰木x'],
  ['戊','⿱木？'],['己','⿰木日⿱土口'],['庚','⿱?木'],['辛','⿰?木'],['壬','⿰木?']
 ]);
 assert.deepEqual(glyphs(family('木','木',d)),['壬','庚','戊','辛']);
});

test('modern IDS layouts keep operators out of selectors and use exact Unicode leaves',()=>{
 const d=fixture([
  ['木'],['𠮷'],['甲','⿼木𠮷'],['乙','⿽木𠮷'],['丙','⿾木'],['丁','⿿木'],
  ['戊','⿲木日月'],['己','⿳日木月'],['庚','⿰𠮷木']
 ]);
 assert.deepEqual(glyphs(family('木','木',d)),['丁','丙','乙','庚','甲','己','戊']);
 assert.ok(glyphs(family('甲','𠮷',d)).includes('庚'));
 assert.ok(parts('甲',d).includes('𠮷'));
 assert.ok(parts('甲',d).every(glyph=>!/[⿰-⿿?？]/u.test(glyph)));
 for(const operator of Array.from('⿰⿱⿲⿳⿴⿵⿶⿷⿸⿹⿺⿻⿼⿽⿾⿿㇯'))assert.deepEqual(family('木',operator,d),[]);
});

test('shape-only matching keeps radical variants, readings and meanings separate',()=>{
 const d=fixture([
  ['水','?'],['氵','?'],['沐','⿰氵木'],['木'],['甲','⿰水日'],
  ['人','?'],['亻','人'],['休','⿰亻木'],['乙','⿰人口']
 ]);
 d.get('甲').meaning=d.get('沐').meaning='same gloss';
 d.get('甲').pinyin=d.get('沐').pinyin='same reading';
 assert.deepEqual(glyphs(family('水','水',d)),['甲']);
 assert.deepEqual(glyphs(family('氵','氵',d)),['沐']);
 assert.ok(glyphs(family('人','人',d)).includes('休')); // The fixture explicitly connects 亻 to 人.
 assert.deepEqual(parts('沐',d,'水'),parts('沐',d));
});

test('priority words promote their characters, then direct leaf count and code point break ties',()=>{
 const d=fixture([['休','⿰亻木'],['木'],['森','⿱木⿰木木'],['淋','⿰氵林'],['林','⿰木木'],['杜','⿰木土']]);
 const priority=Object.freeze(['森林','休息']);
 assert.deepEqual(glyphs(family('休','木',d)),['杜','林','淋','森']);
 assert.deepEqual(glyphs(family('休','木',d,priority)),['林','森','杜','淋']);
 assert.deepEqual(glyphs(family('休','木',new Map([...d].reverse()),priority)),['林','森','杜','淋']);
 assert.deepEqual(priority,['森林','休息']);
});

test('unknown, compound and non-Han selected values and parts return empty results',()=>{
 for(const invalid of ['', '晴天','A','？','?', '⿰','晴\ufe0f',' 晴','𓀀','\ud800','龘']){
  // 龘 is a valid single Han character deliberately absent from this fixture.
  const d=fixture([['晴','⿰日青'],['清','⿰氵青'],['青']]);
  assert.deepEqual(parts(invalid,d),[],invalid);
  assert.deepEqual(family(invalid,'青',d),[],invalid);
  assert.deepEqual(family('晴',invalid,d),[],invalid);
 }
 const d=fixture([['晴','⿰日青'],['青']]);
 d.set('晴天',{...row('晴天','青'),character:'青'});
 d.set('情',row('清','⿰忄青')); // A mismatched map alias is not a second character.
 assert.deepEqual(family('晴','青',d),[]);
});

test('cached queries preserve original rows and source data without exposing cache arrays',()=>{
 const d=fixture([['木'],['休','⿰亻木'],['林','⿰木木'],['森','⿱木⿰木木']]);
 for(const entry of d.values()){
  if(entry.structure)Object.freeze(entry.structure);
  Object.freeze(entry);
 }
 const before=JSON.stringify([...d]);
 const result=family('木','木',d,['森林']);
 for(const entry of result)assert.equal(entry,d.get(entry.text));
 result.length=0;
 const selectors=parts('木',d);selectors.length=0;
 assert.equal(family('木','木',d).length,3);
 assert.deepEqual(parts('木',d),['木']);
 assert.equal(JSON.stringify([...d]),before);
});

test('one index serves repeated cards, isolated dictionaries and newly added source rows',()=>{
 let scans=0;
 class CountedDictionary extends Map{
  [Symbol.iterator](){scans++;return super[Symbol.iterator]();}
 }
 const d=new CountedDictionary(fixture([['木'],['休','⿰亻木'],['林','⿰木木']]));
 const firstScans=scans;
 family('木','木',d);parts('木',d);family('休','木',d);parts('休',d,'木');
 assert.equal(scans-firstScans,1);
 d.set('杜',row('杜','⿰木土'));
 assert.ok(glyphs(family('木','木',d)).includes('杜'));
 assert.equal(scans-firstScans,2);
 const next=new Map(d);next.set('杜',row('杜','⿰土日'));
 assert.ok(!glyphs(family('木','木',next)).includes('杜'));
 assert.ok(glyphs(family('木','木',d)).includes('杜'));
});
