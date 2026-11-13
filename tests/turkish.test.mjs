import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {readFileSync} from 'node:fs';
const result=await build({stdin:{contents:"export * from './app/translate';export * from './app/course-data';export * from './app/lesson04-data';export * from './app/lesson05-data';export * from './app/atlas-data';export * from './app/atlas-stories';export * from './app/atlas-cloud-extended';export * from './app/content';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
test('Turkish vocabulary covers every supported item while preserving Chinese, IDs and existing languages',()=>{
 const tr=JSON.parse(readFileSync('data/turkish-vocabulary.json'));
 assert.equal(Object.keys(tr).length,m.items.length);
 for(const item of m.items){const localized=m.localizeItem(item,'tr');assert.equal(localized.id,item.id);assert.equal(localized.hanzi,item.hanzi);assert.equal(localized.pinyin,item.pinyin);assert.ok(localized.english?.trim());assert.ok(localized.translation?.trim());assert.equal(m.localizeItem(item,'en'),item);}
 assert.equal(m.localeNames.tr,'Türkçe');assert.equal(m.translate('Next','tr'),'Sonraki');assert.equal(m.translate('Next','fr'),'Suivant');assert.equal(m.translate('Next','ru'),'Далее');
 assert.ok(!m.translate('Listen to {0}','tr',['你好']).includes('{0}'));
});
test('Curriculum and Atlas data expose nonempty Turkish siblings without changing source-language values',()=>{
 const visit=value=>{if(!value||typeof value!=='object')return;if(typeof value.en==='string'&&typeof value.fr==='string'&&typeof value.ru==='string'){assert.ok(value.tr?.trim(),'Missing tr: '+value.en);assert.equal((value.en.match(/\p{Script=Han}/gu)??[]).sort().join(''),(value.tr.match(/\p{Script=Han}/gu)??[]).sort().join(''));}Object.values(value).forEach(visit);};
 for(const key of ['terms','sentences','lesson04All','lesson04Topics','lesson05All','lesson05Topics','atlasCharacters','atlasGroups','atlasComponents','atlasStories'])visit(m[key]);
 const before=JSON.parse(readFileSync('data/lesson04/content.json'));
 assert.deepEqual(m.lesson04All.map(({meaning,...v})=>({...v,meaning:{en:meaning.en,fr:meaning.fr,ru:meaning.ru}})),[...before.terms,...before.sentences]);
 const definition=m.extendedCharacters('tr').find(v=>v.hanzi==='学');assert.ok(definition?.meaning);assert.notEqual(definition.meaning, m.extendedCharacters('en').find(v=>v.hanzi==='学').meaning);
});
