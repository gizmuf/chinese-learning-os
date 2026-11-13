import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
async function load(entry){const result=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));}
const {rankSearch,searchScore,pinyinKey}=await load('app/chinese-search.ts');
const {cloudWords}=await load('app/atlas-cloud-model.ts');
const fields=w=>({hanzi:w.hanzi,pinyin:w.pinyin,english:w.meaning});
test('short tone-free pinyin returns real readings, never English substrings',()=>{
 for(const q of ['he','He','hé','he2']){
 const hits=rankSearch(cloudWords('en'),q,'pinyin',fields);
 assert.ok(hits.slice(0,8).some(w=>w.hanzi==='和'));
 assert.ok(!hits.some(w=>w.hanzi==='他'));
 }
 for(const [q,hanzi] of [['de','的'],['ma','吗'],['shi','是'],['you','有']])assert.ok(rankSearch(cloudWords('en'),q,'pinyin',fields).slice(0,14).some(w=>w.hanzi===hanzi));
});
test('Hanzi searches work in either mode and exact matches sort first',()=>{
 const rows=[{hanzi:'暖和',pinyin:'nuǎn huo'},{hanzi:'和',pinyin:'hé'}];
 for(const mode of ['pinyin','english'])assert.equal(rankSearch(rows,'和',mode,x=>x)[0].hanzi,'和');
});
test('keyboard aliases preserve ü and exact readings before syllable/prefix',()=>{
 assert.equal(pinyinKey('nǚ'),pinyinKey('nv'));assert.equal(pinyinKey('lü4'),pinyinKey('lu:'));assert.notEqual(pinyinKey('nu'),pinyinKey('nü'));
 assert.equal(searchScore({hanzi:'女',pinyin:'nǚ'},'nv'),0);
 assert.equal(searchScore({hanzi:'怒',pinyin:'nù'},'nv'),null);
 assert.equal(searchScore({hanzi:'西安',pinyin:"xī’ān"},"xi'an"),0);
 assert.equal(searchScore({hanzi:'什么',pinyin:'shén me'},'he'),null);
});
test('explicit English mode keeps meaning available and empty search preserves inventory',()=>{
 assert.equal(searchScore({hanzi:'他',pinyin:'tā',english:'he / him'},'he','english'),10);
 assert.equal(searchScore({hanzi:'他',pinyin:'tā',english:'he / him'},'he','pinyin'),null);
 const rows=[{hanzi:'他',pinyin:'tā'}];assert.deepEqual(rankSearch(rows,'','pinyin',x=>x),rows);
});
