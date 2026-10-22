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
    const mapping=structure.mappings['u'+entry.hanzi.codePointAt(0).toString(16)];
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
