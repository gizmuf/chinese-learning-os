import test from'node:test';import assert from'node:assert/strict';import{build}from'esbuild';import{readFileSync}from'node:fs';import{createHash}from'node:crypto';
const result=await build({entryPoints:['app/atlas-cloud-extended.ts'],bundle:true,platform:'node',format:'esm',write:false});const m=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));const data=JSON.parse(readFileSync('data/hanzi-structure.json','utf8'));
test('All 1000 HSK words and 655 characters have traceable structure nodes without invented grading IDs',()=>{const c=m.extendedCoverage();assert.equal(c.words,1000);assert.equal(c.characters,655);assert.equal(c.complete,655);assert.equal(c.partial,0);assert.equal(c.componentKeys,Object.keys(data.reverseIndex).length);for(const node of m.extendedCharacters('fr')){assert.ok(node.id.startsWith('structure-'));assert.ok(node.readings.length);assert.ok(node.meaning);assert.equal(node.meaningLocale,node.reviewed?'fr':'en');assert.ok(m.extendedWords(node.hanzi,'fr').length);assert.equal(node.reviewed?.hanzi??node.hanzi,node.hanzi);}});
test('Every reverse edge and canonical word ID is real and structural AND queries never synthesize combinations',()=>{for(const [glyph,hanzi] of Object.entries(data.reverseIndex))for(const char of hanzi)assert.ok(data.characters.find(row=>row.hanzi===char).recursiveComponents.includes(glyph));for(const row of data.characters){assert.deepEqual(row.wordIds.sort(),m.extendedWords(row.hanzi,'en').map(word=>word.id).sort());}assert.deepEqual(m.extendedFamily(['not-a-component'],'en'),[]);const family=m.extendedFamily(['sun','qing'],'en');assert.ok(family.some(node=>node.hanzi==='晴'));for(const node of family)for(const id of ['sun','qing'])assert.ok(m.extendedComponent(id).variants.some(g=>node.hanzi===g||node.components.includes(g)));});
test('HSK scopes are cumulative and source terminals have no invented self edges',()=>{for(const [scope,count]of[[1,300],[2,500],[3,1000]])assert.equal(m.extendedCoverage(scope).words,count);const one=m.extendedCharacters('en').find(node=>node.hanzi==='一');assert.equal(one.complete,true);assert.deepEqual(one.unresolved,[]);assert.deepEqual(one.leafComponents,[]);assert.deepEqual(one.components,[]);assert.equal(one.structureSource.terminal,true);assert.equal(m.extendedWords('晴天','en').length,0);});

const review=JSON.parse(readFileSync('data/structure-resolutions.json','utf8'));
const excerpt=readFileSync(review.sourceExcerpt,'utf8');
test('All 81 replacements preserve exact China-tagged IDS evidence and distinguish nine named shapes',()=>{
 assert.equal(review.resolutions.length,81);assert.equal(Object.keys(review.namedComponents).length,9);
 for(const resolution of review.resolutions){
  const row=data.characters.find(r=>r.hanzi===resolution.hanzi);assert.ok(row);assert.equal(row.source,'babelstone-ids');assert.equal(row.structureSource.line,resolution.sourceLine);assert.equal(row.structureSource.region,'G');
  const raw=resolution.sourceIds[0];assert.ok(excerpt.split('\n').some(line=>line.split('\t')[1]===row.hanzi&&line.split('\t').slice(2).includes(raw)));
  let normalized=raw.slice(1,raw.indexOf('$'));
  for(const [glyph,part]of Object.entries(review.namedComponents))normalized=normalized.replaceAll('{'+part.number+'}',glyph);
  assert.equal(row.decomposition,normalized);assert.ok(row.decompositionComplete);assert.equal(resolution.approximate,false);assert.ok(!row.decomposition.includes('？'));assert.ok(!row.recursiveComponents.includes(row.hanzi));
 }
 assert.equal(review.resolutions.filter(r=>r.status==='atomic').length,9);
 for(const [glyph,part]of Object.entries(review.namedComponents)){const component=m.extendedComponent(glyph);assert.ok(component);for(const language of ['en','fr','ru'])assert.equal(component.label[language],part.label[language]);assert.equal(part.kind,'named-unencoded-terminal');}
});
test('Named parts have exact separate families, with no false standard-character substitutions',()=>{
 const part=number=>Object.entries(review.namedComponents).find(([,p])=>p.number===number)[0];
 for(const [number,char]of [[45,'北'],[25,'展'],[48,'年'],[6,'段'],[24,'飞'],[52,'马'],[53,'鸟'],[68,'黑'],[15,'旅']]){
  assert.ok(m.extendedFamily([part(number)],'en').some(node=>node.hanzi===char));
 }
 const year=data.characters.find(row=>row.hanzi==='年');assert.ok(!year.leafComponents.includes('㐄'));
 const fly=data.characters.find(row=>row.hanzi==='飞');assert.ok(!fly.leafComponents.includes('水'));
 for(const row of data.characters){assert.equal(row.decompositionComplete,true);assert.deepEqual(row.unresolvedComponents,[]);for(const part of row.recursiveComponents)assert.ok(data.reverseIndex[part].includes(row.hanzi));}
 assert.equal(data.coverage.cycleEdgesSkipped,0);
});

test('All rare and named component shapes are bundled with pinned licensed fonts',()=>{
 const fonts=JSON.parse(readFileSync('public/fonts/atlas-structure-shapes.json','utf8'));
 const points=new Set(fonts.flatMap(f=>f.glyphCodepoints));
 for(const glyph of Object.keys(data.reverseIndex)){const point=glyph.codePointAt(0);if(point<0x4e00||point>0x9fff)assert.ok(points.has('U+'+point.toString(16).toUpperCase().padStart(4,'0')),glyph);}
 for(const font of fonts){assert.equal(createHash('sha256').update(readFileSync('public'+font.file)).digest('hex'),font.sha256);assert.match(readFileSync('public/licenses/'+font.family+'-LICENSE.txt','utf8'),/ARPHIC PUBLIC LICENSE/);}
 const named=fonts.find(f=>f.family==='ChineseOSNamedShapes');assert.equal(named.sourceVersion,'Version 1.472');assert.equal(named.sourceSha256,review.fontSourceSha256);assert.equal(named.glyphCodepoints.length,9);
});
