import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

const result = await build({
 stdin: {contents: "export * from './app/atlas-chunks-route'; export {cloudWords} from './app/atlas-cloud-model'; export {readCloudRoute} from './app/atlas-cloud-route';",resolveDir:process.cwd()},
 bundle:true,platform:'node',format:'esm',write:false,
});
const {atlasLearningContext,atlasChunksHref,atlasChunksReturn,cloudWords,readCloudRoute} =
 await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('each active family word supplies its own chunk query and exact return route',()=>{
 const words=cloudWords('en',1);
 const byHanzi=hanzi=>words.find(word=>word.hanzi===hanzi);
 const defaultWord=byHanzi('明天');
 for (const [layout,anchor,hanzi] of [['words','学','大学生'],['words','电','电影院'],['journey','学','学生']]){
  const entry=byHanzi(hanzi);
  assert.ok(entry,hanzi);
  const route=readCloudRoute('?atlas=1&cloud=1&layout='+layout+'&hsk=1&anchor='+anchor+'&entry='+entry.id);
  assert.equal(atlasLearningContext(route,'en',words,defaultWord).word?.id,entry.id);
  const outbound=new URL(atlasChunksHref(route,entry),'https://example.test');
  assert.equal(outbound.searchParams.get('q'),hanzi);
  assert.deepEqual(readCloudRoute(atlasChunksReturn(outbound.search).slice(1)),route);
 }
});

test('unselected journey opens the word library without an unrelated search',()=>{
 const route=readCloudRoute('?atlas=1&cloud=1&layout=journey&hsk=1&entry=missing');
 const words=cloudWords('en',1);
 const word=atlasLearningContext(route,'en',words,words.find(word=>word.hanzi==='明天')).word;
 assert.equal(word,undefined);
 assert.equal(new URL(atlasChunksHref(route,word),'https://example.test').searchParams.has('q'),false);
 assert.equal(atlasChunksReturn('?returnAtlas=https%3A%2F%2Fexample.test'),undefined);
});

test('hybrid layouts follow the fallback character and word rather than the stale route character',()=>{
 const words=cloudWords('en',1), entry=words.find(word=>word.hanzi==='大学生');
 for (const layout of ['layers','constellations','matrix']){
  const route=readCloudRoute('?atlas=1&cloud=1&layout='+layout+'&hsk=1&anchor=学&hanzi=晴&part=qing&entry='+entry.id);
  const context=atlasLearningContext(route,'en',words,undefined);
  assert.equal(context.word?.hanzi,'大学生');
  assert.equal(context.character?.hanzi,'学');
  assert.ok(context.relatives.every(word=>word.hanzi.includes('学')));
  assert.equal(new URL(atlasChunksHref(route,context.word),'https://example.test').searchParams.get('q'),'大学生');
 }
});
