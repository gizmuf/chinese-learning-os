import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const compiled=await build({entryPoints:['app/dictionary-window.ts'],bundle:true,platform:'node',format:'esm',write:false});
const w=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const bounds={left:0,top:0,width:768,height:1024};
test('resize anchors opposite edges, respects minimum and clamps all directions',()=>{
 const rect={x:100,y:100,width:360,height:560};
 assert.deepEqual(w.resizeDictionaryWindow(rect,'w',{x:90,y:0},bounds),{x:190,y:100,width:270,height:560});
 assert.deepEqual(w.resizeDictionaryWindow(rect,'nw',{x:1000,y:1000},bounds),{x:200,y:420,width:260,height:240});
 assert.deepEqual(w.resizeDictionaryWindow(rect,'se',{x:5000,y:5000},bounds),{x:100,y:100,width:656,height:912});
});
test('west resize preserves right edge when maximum width is reached',()=>{
 assert.deepEqual(w.resizeDictionaryWindow({x:850,y:50,width:360,height:500},'w',{x:-1000,y:0},{left:0,top:0,width:1280,height:1024}),{x:450,y:50,width:760,height:500});
});
test('size fits offset visual viewport and restored preferred size survives rotation',()=>{
 const preferred={width:600,height:800};
 assert.deepEqual(w.fitDictionarySize(preferred,{left:20,top:220,width:390,height:360}),{width:366,height:336});
 assert.deepEqual(w.fitDictionarySize(preferred,bounds),preferred);
 for(const value of [null,{}, {width:NaN,height:300},{width:-1,height:300},{width:Infinity,height:300}])assert.equal(w.readDictionarySize(value),undefined);
});
const structureBuild=await build({entryPoints:['app/dictionary-structure.ts'],bundle:true,platform:'node',format:'esm',write:false});
const s=await import('data:text/javascript;base64,'+Buffer.from(structureBuild.outputFiles[0].text).toString('base64'));
test('structure labels preserve nested positions, overlaps and repeated leaves',()=>{
 assert.deepEqual(s.dictionaryStructureParts('⿰酉星'),[{glyph:'酉',position:'Left'},{glyph:'星',position:'Right'}]);
 assert.deepEqual(s.dictionaryStructureParts('⿻兀日').map(p=>p.position),['Overlapping part','Overlapping part']);
 assert.deepEqual(s.dictionaryStructureParts('⿰彳⿱旦寸').map(p=>p.position),['Left','Right · Top','Right · Bottom']);
 assert.equal(s.dictionaryStructureParts('⿰日日').length,2);
 assert.equal(s.dictionaryComponentReading('酉').pinyin,'yǒu');
 assert.equal(s.dictionaryComponentReading('⺀').pinyin,'');
 assert.equal(s.dictionaryStructureParts('⿰酉星','tr')[0].position,'Sol');
});
