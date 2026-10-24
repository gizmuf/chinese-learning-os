import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const result=await build({stdin:{contents:"export * from './app/atlas-cloud-route';export * from './app/atlas-cloud-entry';export {extendedFamily} from './app/atlas-cloud-extended';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false});
const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));

test('Clean Atlas entries use the new layout while existing deep links retain their tools',()=>{
  for(const query of ['', '?atlas=1','?atlas=1&hanzi=你&part=person&layout=path'])assert.equal(m.isCloudAtlasEntry(new URLSearchParams(query)),true);
  for(const query of ['classic=1','studio=1','lab=connections','listen=1','story=mo','story=mo&listen=1','component=wood','group=forest','target=u68ee','cloud=0']){
    assert.equal(m.isCloudAtlasEntry(new URLSearchParams(query)),false,query);
    const explicit=new URLSearchParams(query);explicit.set('cloud','1');assert.equal(m.isCloudAtlasEntry(explicit),true,'explicit cloud wins: '+query);
  }
});

test('Existing Atlas links default to Family + context without losing the selected vocabulary or family',()=>{
  const route=m.readCloudRoute('?atlas=1&cloud=1&hanzi=你&part=person&word=hello&focus=word');
  assert.equal(route.layout,'family');assert.equal(route.relation,'all');assert.equal(route.stage,'word');assert.equal(route.word,'hello');assert.equal(route.hanzi,'你');assert.equal(route.component,'person');
  assert.deepEqual(m.readCloudRoute(''),m.initialCloudRoute);
});
test('Both layouts preserve exact context, source parts, filters and sentence stage through a URL roundtrip',()=>{
  for(const layout of ['family','path','cloud'])for(const relation of ['all','meaning','sound','shape']){
    const route={...m.initialCloudRoute,hanzi:'北',component:'\uf5fb',parts:['spoon'],collection:'library',nested:true,level:3,kind:'word',word:'hsk3-501',stage:'sentence',layout,relation};
    assert.deepEqual(m.readCloudRoute(m.cloudRouteHref(route)),route);
  }
});
test('Untrusted layout and relation values fall back safely and invalid components never enter a combination',()=>{
  const route=m.readCloudRoute('?layout=other&relation=etymology&part=unknown&with=person,person,unknown,qing&hsk=9&hanzi=你好');
  assert.equal(route.layout,'family');assert.equal(route.relation,'all');assert.equal(route.component,'sun');assert.deepEqual(route.parts,['person','qing']);assert.equal(route.level,'all');assert.equal(route.hanzi,'明');
});
test('Classifying a real family keeps every relative exactly once, including unreviewed shapes',()=>{
  for(const component of ['person','qing','wood','sun','water']){
    const family=m.extendedFamily([component],'en');const groups=m.cloudFamilyGroups(family,component);
    assert.equal(Object.values(groups).flat().length,family.length);
    assert.deepEqual(Object.values(groups).flat().map(c=>c.id).sort(),family.map(c=>c.id).sort());
    assert.equal(new Set(Object.values(groups).flat().map(c=>c.id)).size,family.length);
  }
  const family=m.extendedFamily(['person'],'en'),groups=m.cloudFamilyGroups(family,'亻');
  assert.ok(groups.meaning.some(c=>c.hanzi==='你'));assert.ok(groups.shape.some(c=>c.hanzi==='火'));
  const sounds=m.cloudFamilyGroups(m.extendedFamily(['qing'],'en'),'青');assert.ok(sounds.sound.some(c=>c.hanzi==='晴'));
});
test('Choosing a relation keeps a valid selected context or clears a stale word when moving to another character',()=>{
  const family=m.extendedFamily(['person'],'en');
  const route={...m.initialCloudRoute,hanzi:'你',component:'person',kind:'word',word:'hello',stage:'sentence',layout:'path'};
  assert.deepEqual(m.cloudRelationSelection(route,'meaning',family),{relation:'meaning'});
  const patch=m.cloudRelationSelection(route,'shape',family),next={...route,...patch};
  assert.equal(next.layout,'path');assert.equal(next.relation,'shape');assert.equal(next.word,'');assert.equal(next.kind,'character');assert.equal(next.stage,'character');assert.ok(m.cloudFamilyGroups(family,'person').shape.some(c=>c.hanzi===next.hanzi));
  assert.deepEqual(m.cloudRelationSelection(next,'all',family),{relation:'all'});
  assert.deepEqual(m.cloudRelationSelection(route,'sound',[]),{relation:'sound'});
});

test('Cloud map is a separately addressable view and never overwrites either newer layout',()=>{
 const before=m.readCloudRoute('?atlas=1&cloud=1&hanzi=你&part=person&word=hello&focus=word&layout=cloud');
 assert.equal(before.layout,'cloud');
 for(const layout of ['family','path','cloud']){const next=m.readCloudRoute(m.cloudRouteHref({...before,layout}));assert.equal(next.layout,layout);assert.equal(next.hanzi,'你');assert.equal(next.word,'hello');assert.equal(next.component,'person');}
});
