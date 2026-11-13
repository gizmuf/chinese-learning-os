import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({entryPoints:['app/writing-pointer.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {acceptWritingPointer,WritingSvgTarget}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
test('Pencil takes priority over an earlier palm, even when it is not the primary contact',()=>{
 assert.equal(acceptWritingPointer({pointerType:'pen',button:0},false,false,{type:'touch'}),true);
 assert.equal(acceptWritingPointer({pointerType:'touch',button:0},false,true,null),false);
 assert.equal(acceptWritingPointer({pointerType:'touch',button:0},false,false,{type:'pen'}),false);
 assert.equal(acceptWritingPointer({pointerType:'mouse',button:2},false,false,null),false);
 assert.equal(acceptWritingPointer({pointerType:'touch',button:0},true,false,null),false);
 assert.equal(acceptWritingPointer({pointerType:'mouse',button:0},false,false,null),true);
});
class FakeSvg extends EventTarget{
 attrs={};captured=new Set();children=[];
 appendChild(v){this.children.push(v);return v;}
 setAttribute(k,v){this.attrs[k]=v;}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){this.captured.delete(id);}
 getBoundingClientRect(){return {left:10,top:20,width:320,height:320};}
}
function event(type,id,pointerType,x=25,y=35){const e=new Event(type,{cancelable:true});Object.assign(e,{pointerId:id,pointerType,button:0,clientX:x,clientY:y});return e;}
test('A palm move or lift cannot move/end the active Pencil stroke; cancellation permits the next stroke',()=>{
 const original=globalThis.document;globalThis.document={createElementNS:()=>new FakeSvg()};
 try{const host=new FakeSvg(),target=WritingSvgTarget.create(host,()=>true,320,320);let starts=0,ends=0;const points=[];
 target.addPointerStartListener(()=>starts++);target.addPointerMoveListener(e=>points.push(e.getPoint()));target.addPointerEndListener(()=>ends++);
 target.node.dispatchEvent(event('pointerdown',1,'touch'));target.node.dispatchEvent(event('pointerdown',2,'pen'));
 target.node.dispatchEvent(event('pointermove',1,'touch',200,200));target.node.dispatchEvent(event('pointerup',1,'touch'));
 assert.equal(starts,1);assert.equal(ends,0);assert.equal(points.length,0);
 target.node.dispatchEvent(event('pointermove',2,'pen',40,60));assert.deepEqual(points,[{x:30,y:40}]);
 target.node.dispatchEvent(event('pointercancel',2,'pen'));assert.equal(ends,1);
 target.node.dispatchEvent(event('pointerdown',3,'pen'));target.node.dispatchEvent(event('pointerup',3,'pen'));assert.equal(starts,2);assert.equal(ends,2);
 target.dispose();target.node.dispatchEvent(event('pointerdown',4,'pen'));assert.equal(starts,2);
 }finally{globalThis.document=original;}
});
test('Mouse drawing still works and secondary mouse buttons cannot begin strokes',()=>{
 const original=globalThis.document;globalThis.document={createElementNS:()=>new FakeSvg()};
 try{const target=WritingSvgTarget.create(new FakeSvg(),()=>false);let count=0;target.addPointerStartListener(()=>count++);
 const right=event('pointerdown',1,'mouse');right.button=2;target.node.dispatchEvent(right);assert.equal(count,0);
 target.node.dispatchEvent(event('pointerdown',2,'mouse'));target.node.dispatchEvent(event('pointerup',2,'mouse'));assert.equal(count,1);target.dispose();
 }finally{globalThis.document=original;}
});
test('An explicit Pencil-only preference change restores finger mode without remounting',()=>{
 const original=globalThis.document;globalThis.document={createElementNS:()=>new FakeSvg()};
 try{let only=false;const target=WritingSvgTarget.create(new FakeSvg(),()=>only);let starts=0;target.addPointerStartListener(()=>starts++);
 target.node.dispatchEvent(event('pointerdown',1,'pen'));target.node.dispatchEvent(event('pointerup',1,'pen'));
 target.node.dispatchEvent(event('pointerdown',2,'touch'));assert.equal(starts,1);
 only=true;target.node.dispatchEvent(event('pointerdown',3,'touch'));assert.equal(starts,1);
 only=false;target.node.dispatchEvent(event('pointerdown',4,'touch'));assert.equal(starts,2);target.dispose();
 }finally{globalThis.document=original;}
});
