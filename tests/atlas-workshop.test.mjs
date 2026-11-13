import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';
async function load(entry) { const r=await build({entryPoints:[entry],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});return import('data:text/javascript;base64,'+Buffer.from(r.outputFiles[0].text).toString('base64')); }
const w=await load('app/atlas-workshop-data.ts');
const structure=JSON.parse(readFileSync('public/atlas/component-strokes.json'));
test('Authored assemblies cover each real stroke exactly once; no missing or overlapping pieces',()=>{
 for(const entry of w.assemblies){
  const indices=entry.parts.flatMap(p=>p.strokes);
  assert.deepEqual([...indices].sort((a,b)=>a-b),entry.data.strokes.map((_,i)=>i),entry.hanzi);
  assert.equal(entry.parts.filter(p=>p.anchor).length,1);
  for(const p of entry.parts){assert.ok(p.pinyin);assert.ok(p.strokes.length);}
  for(const locale of ['en','fr','ru'])assert.ok(entry.meaning[locale]&&entry.note[locale]);
  if(entry.family==='qing'){
    const mapping=structure.mappings['u'+entry.hanzi.codePointAt(0).toString(16)] ?? (entry.hanzi==='睛'?{qing:[5,6,7,8,9,10,11,12]}:undefined);
    assert.ok(mapping,entry.hanzi);
    assert.deepEqual(entry.parts.find(p=>p.anchor).strokes,mapping.qing);
    assert.equal(entry.parts.find(p=>p.anchor).role,'sound');
  }
 }
});
test('Repeated components consume separate slots; wrong and already-used pieces cannot finish a puzzle',()=>{
 const entry=w.assemblies.find(a=>a.hanzi==='森'),placed=[];
 assert.equal(w.checkAssemblyChoice(entry.parts,placed,'日'),-1);
 for(let i=0;i<3;i++){const slot=w.checkAssemblyChoice(entry.parts,placed,'木');assert.equal(slot,i);placed.push(slot);}
 assert.equal(w.checkAssemblyChoice(entry.parts,placed,'木'),-1);
 const rest=w.assemblies.find(a=>a.hanzi==='休');assert.equal(w.checkAssemblyChoice(rest.parts,[1],'木'),-1);assert.equal(w.checkAssemblyChoice(rest.parts,[1],'亻'),0);
});
test('Words retain ordered complete compounds, pinyin and local geometry in every locale',()=>{
 for(const word of w.wordBuilds){assert.equal(word.parts.map(p=>p.hanzi).join(''),word.hanzi);assert.ok(word.pinyin&&!word.pinyin.includes(' '));for(const p of word.parts){assert.ok(p.data.strokes.length&&p.pinyin);for(const lang of ['en','fr','ru'])assert.ok(p.meaning[lang]);}}
});
const ink=await load('app/ink-render.ts');
test('Pressure-sensitive ink stays finite for dots, repeated points, corners and full strokes without mutating saved input',()=>{
 const examples=[[],[{x:.5,y:.5,p:0,t:0}],[{x:.5,y:.5,p:1,t:0},{x:.5,y:.5,p:1,t:1}],Array.from({length:1500},(_,i)=>({x:i/1500,y:.5+Math.sin(i/50)*.1,p:.5,t:i}))];
 for(const stroke of examples){const before=JSON.stringify(stroke);for(const done of [false,true]){const outline=ink.inkOutline(stroke,300,300,done);assert.ok(outline.every(p=>p.every(Number.isFinite)));if(stroke.length)assert.ok(outline.length>=3);}assert.equal(JSON.stringify(stroke),before);}
 const line=p=>Array.from({length:20},(_,i)=>({x:.1+i*.04,y:.5,p,t:i}));
 const height=points=>Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]));
 assert.ok(height(ink.inkOutline(line(.95),300,300))>height(ink.inkOutline(line(.1),300,300)));
});

test('Expanded workshop keeps six usable families, unique choices and contextual examples without changing the core index',()=>{
 assert.deepEqual(w.familyIds,['wood','light','water','person','mouth','qing']);
 assert.equal(w.assemblies.length,33);assert.equal(new Set(w.assemblies.map(a=>a.family+':'+a.hanzi)).size,33);
 for(const family of w.familyIds){assert.ok(w.assemblies.filter(a=>a.family===family).length>=5);assert.ok(w.wordBuilds.some(word=>w.wordFamilies(word).includes(family)));}
 assert.equal(w.wordBuilds.length,30);assert.equal(new Set(w.wordBuilds.map(word=>word.hanzi)).size,30);
 for(const word of w.wordBuilds){assert.ok(w.wordFamilies(word).every(f=>w.familyIds.includes(f)));if(word.example){assert.ok(word.example.hanzi.includes(word.hanzi)||['洗手','喝水'].includes(word.hanzi));assert.ok(word.example.pinyin);for(const lang of ['en','fr','ru'])assert.ok(word.example.meaning[lang]);}}
 for(const [family,char,glyph] of [['water','清','氵'],['qing','清','青'],['wood','休','木'],['person','休','亻'],['mouth','问','口'],['light','朋','月']])assert.equal(w.assemblies.find(a=>a.family===family&&a.hanzi===char).parts.find(p=>p.anchor).glyph,glyph);
});
test('Authored fragments retain actual stroke positions, including enclosed mouth and extra eye stroke',()=>{
 assert.deepEqual(w.assemblies.find(a=>a.hanzi==='问').parts.find(p=>p.anchor).strokes,[3,4,5]);
 assert.deepEqual(w.assemblies.find(a=>a.family==='mouth'&&a.hanzi==='喝').parts.find(p=>p.anchor).strokes,[0,1,2]);
 assert.equal(w.assemblies.find(a=>a.hanzi==='睛').parts.find(p=>p.glyph==='目').strokes.length,5);
 assert.equal(w.assemblies.find(a=>a.hanzi==='晴').parts.find(p=>p.glyph==='日').strokes.length,4);
 const friends=w.assemblies.find(a=>a.hanzi==='朋');assert.ok(friends.parts.every(p=>p.role==='shape'));
});
