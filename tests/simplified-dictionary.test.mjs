import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
const result=await build({entryPoints:['app/simplified-chinese.ts'],bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('whole-entry aliases become canonical simplified forms without flattening ambiguous shared characters',()=>{
 for(const [a,b] of [['輕易','轻易'],['講明','讲明'],['決明','决明'],['當日','当日'],['發','发'],['髮','发'],['乾杯','干杯']])assert.equal(m.canonicalDictionaryText(a),b,a);
 assert.equal(m.canonicalDictionaryText('乾'),'乾');assert.equal(m.canonicalDictionaryText('乾','gān'),'干');assert.equal(m.canonicalDictionaryText('乾','qián'),'乾');
 for(const glyph of ['言','日','糸','警','乾','发'])assert.equal(m.canonicalDictionaryText(glyph),glyph);
});
test('lexical prose simplifies attested aliases; unknown ambiguous forms are not invented',()=>{
 assert.equal(m.simplifiedDisplayText('variant of 輕易[qing1 yi4]; 發|发[fa1]'),'variant of 轻易[qing1 yi4]; 发[fa1]');
 assert.equal(m.simplifiedDisplayText('朝日 / 乾 / 言'),'朝日 / 乾 / 言');
 assert.equal(m.isSimplifiedHeadword('輕易'),false);assert.equal(m.isSimplifiedHeadword('轻易'),true);
});
test('broader family index counts simplified headwords while raw source preserves variants and separate senses',()=>{
 const words=JSON.parse(gunzipSync(readFileSync('public/dictionary/headwords.json.gz')));
 for(const [h,count] of [['明',401],['易',166]])assert.equal(words.filter(w=>w!==h&&w.includes(h)).length,count);
 assert.ok(words.includes('轻易'));assert.ok(!words.includes('輕易'));assert.ok(words.includes('朝日'));assert.ok(words.includes('乾'));
 const raw=gunzipSync(readFileSync('resources/cc-cedict/cedict.txt.gz')).toString();assert.match(raw,/輕易 轻易/);assert.match(raw,/當日 当日 \[dang1 ri4\]/);assert.match(raw,/當日 当日 \[dang4 ri4\]/);
});
const sourceBuild=await build({entryPoints:['app/dictionary-source-model.ts'],bundle:true,platform:'node',format:'esm',write:false});
const source=await import('data:text/javascript;base64,'+Buffer.from(sourceBuild.outputFiles[0].text).toString('base64'));
const raw=gunzipSync(readFileSync('resources/cc-cedict/cedict.txt.gz')).toString();
test('alias lookup preserves distinct readings and source-case name senses in canonical entries',()=>{
 const fa=source.cedictEntry(raw,'發');assert.equal(fa.text,'发');assert.ok(fa.senses.some(s=>s.pinyin==='fā'));assert.ok(fa.senses.some(s=>s.pinyin==='fà'));
 const day=source.cedictEntry(raw,'當日');assert.equal(day.text,'当日');assert.deepEqual(day.senses.map(s=>s.pinyin),['dāng rì','dàng rì']);
 const asahi=source.cedictEntry(raw,'朝日');assert.equal(asahi.senses.length,2);assert.equal(asahi.senses.find(s=>s.pinyin.startsWith('Zh')).kind,'name');assert.equal(asahi.senses.find(s=>s.pinyin.startsWith('zh')).kind,undefined);
 assert.equal(source.cedictEntry(raw,'明報').senses[0].kind,'name');
 const qian=source.cedictEntry(raw,'乾');assert.ok(qian.senses.every(s=>!s.pinyin.includes('gān')));
});
test('simplified character lookup uses the actual simplified structure, retaining legitimate shared parts',()=>{
 const chars=JSON.parse(gunzipSync(readFileSync('public/dictionary/characters.json.gz')));
 const glyph=m.canonicalDictionaryText('變'),entry=source.sourceCharacterEntry(glyph,chars[glyph]);assert.equal(entry.text,'变');assert.ok(entry.structure);assert.ok(!entry.structure.decomposition.includes('言'));
 assert.ok(source.sourceCharacterEntry('警',chars['警']).structure.decomposition.includes('言'));
});
const courseBuild=await build({stdin:{contents:`export {items} from './app/content';export {cloudWords} from './app/atlas-cloud-model';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const course=await import('data:text/javascript;base64,'+Buffer.from(courseBuild.outputFiles[0].text).toString('base64'));
test('existing curriculum and Atlas identities already use simplified learner text',()=>{
 for(const item of course.items)for(const field of ['hanzi','sentence','english','translation'])if(typeof item[field]==='string')assert.equal(m.simplifiedDisplayText(item[field]),item[field],item.id+':'+field);
 for(const word of course.cloudWords('en'))assert.equal(m.canonicalDictionaryText(word.hanzi),word.hanzi,word.id);
});
test('whole lexical aliases work inside prose without rewriting shared characters or source names',()=>{
 assert.equal(m.simplifiedDisplayText('他著急'),'他着急');
 assert.equal(m.simplifiedDisplayText('显著急需改善'),'显著急需改善');
 for(const text of ['乾坤','乾隆','著作','看著','宏碁','宏碁集团','韩复榘'])assert.equal(m.simplifiedDisplayText(text),text,text);
 assert.equal(m.simplifiedDisplayText('我喜歡乾坤'),'我喜欢乾坤');
 assert.equal(m.simplifiedDisplayText('我在宏碁集团工作'),'我在宏碁集团工作');
 assert.equal(m.canonicalDictionaryText('傢具'),'家具');assert.equal(m.canonicalDictionaryText('燉煌'),'敦煌');
 assert.equal(m.canonicalDictionaryText('宏碁'),'宏碁');assert.equal(m.canonicalDictionaryText('我在宏碁工作'),'我在宏碁工作');assert.equal(m.canonicalDictionaryText('韓復榘'),'韩复榘');
});
test('shared glyphs attested inside canonical source names remain inspectable as their actual shape',()=>{
 for(const glyph of ['碁','榘','言','糸']){assert.equal(m.canonicalDictionaryText(glyph),glyph);assert.equal(m.simplifiedDisplayText(glyph),glyph);}
 assert.equal(m.simplifiedDisplayText('宏碁 / 韩复榘'),'宏碁 / 韩复榘');
});
