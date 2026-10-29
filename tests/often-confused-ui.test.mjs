import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const built=await build({stdin:{contents:`export {default as OftenConfused} from './app/often-confused';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd()},jsx:'automatic',bundle:true,platform:'node',format:'esm',write:false,loader:{'.css':'empty'},logLevel:'silent',alias:{react:require.resolve('react').replace(/\/index\.js$/,'')},plugins:[{name:'locale',setup(b){b.onResolve({filter:/^\.\/i18n$/},()=>({path:'mock',namespace:'locale'}));b.onLoad({filter:/.*/,namespace:'locale'},()=>({contents:`export const useI18n=()=>({locale:'en',t:text=>text});`,loader:'js'}));}}]});
const m=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
// Bundled React act uses its browser MessageChannel fallback. As in the other
// renderer harnesses, release those test scheduler ports after unmounting.
test.after(()=>{for(const handle of process._getActiveHandles())if(handle.constructor.name==='MessagePort')handle.unref();});
test('Cover/reveal self-check hides both Chinese and pinyin, resets between sets, and leaves overview and exit usable',async()=>{
 globalThis.IS_REACT_ACT_ENVIRONMENT=true;
 let root,closed=0;
 const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
 const button=label=>root.root.findAllByType('button').find(b=>b.props['aria-label']===label||text(b)===label);
 await m.act(async()=>{root=m.renderer.create(m.createElement(m.OftenConfused,{onClose:()=>closed++,notify:()=>{}}),{createNodeMock:()=>({showModal(){},scrollTop:0})})});
 await m.act(async()=>button('Recall from the picture').props.onClick());
 assert.equal(root.root.findAllByProps({className:'oc-word'}).length,0);assert.equal(root.root.findAllByProps({className:'oc-covered'}).length,2);
 await m.act(async()=>button('Reveal word & example').props.onClick());assert.equal(root.root.findAllByProps({className:'oc-word'}).length,1);
 await m.act(async()=>button('Next set').props.onClick());assert.equal(root.root.findAllByProps({className:'oc-word'}).length,0);assert.equal(root.root.findAllByProps({className:'oc-covered'}).length,2);
 await m.act(async()=>button('See everything').props.onClick());assert.equal(root.root.findAllByProps({className:'oc-word'}).length,2);
 await m.act(async()=>root.root.findAllByType('button').find(b=>text(b).startsWith('Browse all sets')).props.onClick());
 assert.equal(root.root.findByProps({className:'oc-library-grid'}).findAllByType('button').length,24);
 await m.act(async()=>root.root.findByType('input').props.onChange({target:{value:'bei'}}));assert.equal(root.root.findByProps({className:'oc-library-grid'}).findAllByType('button').length,1);
 await m.act(async()=>root.root.findByType('input').props.onChange({target:{value:''}}));await m.act(async()=>button('Same sound').props.onClick());assert.equal(root.root.findByProps({className:'oc-library-grid'}).findAllByType('button').length,3);
 await m.act(async()=>button('Back to my cards').props.onClick());assert.equal(closed,1);await m.act(async()=>root.unmount());
});

