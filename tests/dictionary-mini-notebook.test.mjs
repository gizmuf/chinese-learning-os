import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const compiled=await build({stdin:{contents:`import React from 'react';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';export {default as Notebook} from './app/dictionary-mini-notebook';export {expandDictionaryForNotebook} from './app/dictionary-window';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'cjs',write:false,external:['react','react-test-renderer'],loader:{'.css':'empty'},plugins:[{name:'isolated-writing-surface',setup(b){b.onResolve({filter:/^\.\/ink$/},()=>({path:'ink',namespace:'stub'}));b.onResolve({filter:/^\.\/notebook$/},()=>({path:'notebook',namespace:'stub'}));b.onLoad({filter:/.*/,namespace:'stub'},a=>({contents:a.path==='ink'?`import React from 'react';export default function Ink(p){return React.createElement('canvas',p);}`:`import React from 'react';export const Grid=()=>React.createElement('svg');export const NotebookWordModel=({text})=>React.createElement('span',null,text);`,loader:'jsx'}));}}],logLevel:'silent'});
const module={exports:{}};new Function('require','module','exports',compiled.outputFiles[0].text)(require,module,module.exports);const m=module.exports;
test('the inline notebook has eight independent cells and retains ink while folding or inspecting another character',async()=>{
 let r;const props={text:'书店',visible:true,onClose:()=>{}};await m.act(()=>{r=m.renderer.create(m.createElement(m.Notebook,props));});
 let cells=()=>r.root.findAllByType('canvas');assert.equal(cells().length,8);assert.equal(cells()[0].props.penOnly,true);
 const first=[[{x:.1,y:.2,p:.5,t:1}]],second=[[{x:.3,y:.4,p:.5,t:2}]];
 await m.act(()=>cells()[0].props.onChange(first));await m.act(()=>cells()[1].props.onChange(second));
 await m.act(()=>r.root.findAllByType('button').find(b=>b.props.children==='店').props.onClick());assert.equal(cells()[0].props.strokes.length,0);
 await m.act(()=>r.root.findAllByType('button').find(b=>b.props.children==='书').props.onClick());assert.deepEqual(cells()[0].props.strokes,first);
 await m.act(()=>r.update(m.createElement(m.Notebook,{...props,visible:false})));assert.equal(cells().length,0);
 await m.act(()=>r.update(m.createElement(m.Notebook,props)));assert.deepEqual(cells()[1].props.strokes,second);
 await m.act(()=>r.root.findByProps({'aria-label':'Clear box 1'}).props.onClick());assert.equal(cells()[0].props.strokes.length,0);assert.deepEqual(cells()[1].props.strokes,second);
 await m.act(()=>r.unmount());
});
test('expansion moves left to retain the original right edge and stays inside tablet and phone bounds',()=>{
 const rect={x:650,y:80,width:360,height:560};const expanded=m.expandDictionaryForNotebook(rect,{left:0,top:0,width:1024,height:768});
 assert.equal(expanded.width,940);assert.equal(expanded.x,70);assert.equal(expanded.x+expanded.width,rect.x+rect.width);assert.ok(expanded.y+expanded.height<=756);
 const phone=m.expandDictionaryForNotebook(rect,{left:0,top:0,width:390,height:844});assert.equal(phone.width,366);assert.equal(phone.x,12);assert.ok(phone.y+phone.height<=832);
});

test('whole-word library practice pairs both characters in two rows instead of requiring a character switch',async()=>{
 let r;await m.act(()=>{r=m.renderer.create(m.createElement(m.Notebook,{text:'你好',visible:true,wholeWord:true,onClose:()=>{}}));});
 assert.equal(r.root.findAllByType('canvas').length,8);assert.equal(r.root.findAllByProps({className:'sp-mini-word-repetition'}).length,2);
 const labels=r.root.findAll(n=>n.props.role==='group').map(n=>n.props['aria-label']);assert.deepEqual(labels,['你 · 1','好 · 2','你 · 3','好 · 4','你 · 5','好 · 6','你 · 7','好 · 8']);await m.act(()=>r.unmount());
});
