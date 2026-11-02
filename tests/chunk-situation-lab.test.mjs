import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {existsSync,readFileSync,mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const b=await build({stdin:{contents:`export * from './app/chunk-situation-lab-model';export {situationCopy,situationScenarios} from './app/chunk-situation-lab-copy';export {chunkUnits,chunkAudio} from './app/speaking-chunks-data';export {grammarFrames} from './app/chunk-library-data';export {situationSetNames} from './app/chunk-situation-grammar';export {default as Lab} from './app/chunk-situation-lab';export {createElement} from 'react';export {create,act} from 'react-test-renderer';`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,loader:{'.css':'empty'},plugins:[{name:'context',setup(build){build.onResolve({filter:/^\.\/(i18n|audio)$/},args=>({path:args.path,namespace:'mock'}));build.onLoad({filter:/.*/,namespace:'mock'},args=>({contents:args.path.endsWith('i18n')?`export const useI18n=()=>({locale:'en'});`:`export const stopAudio=()=>{};export const playRecording=()=>{};`,loader:'js'}));}}]});
const file=join(mkdtempSync(join(tmpdir(),'situation-test-')),'bundle.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));globalThis.IS_REACT_ACT_ENVIRONMENT=true;globalThis.requestAnimationFrame=fn=>fn();
test.after(()=>{for(const h of process._getActiveHandles())if(h.constructor.name==='MessagePort')h.unref()});
const text=n=>typeof n==='string'||typeof n==='number'?String(n):Array.isArray(n)?n.map(text).join(''):n?text(n.children):'';
const button=(root,label)=>root.root.findAllByType('button').find(b=>text(b.props.children)===label);
async function mount(set='everyday'){let root;await m.act(()=>{root=m.create(m.createElement(m.Lab,{onBack(){},renderExample:example=>m.createElement('div',{'data-example':example.id},example.hanzi,example.pinyin,m.createElement('button',{'data-audio':m.chunkAudio(example.id)},'Canonical audio'))}))});if(set!=='all')await m.act(()=>root.root.findByType('select').props.onChange({target:{value:set}}));return root}
const click=async(root,label)=>m.act(()=>button(root,label).props.onClick());
test('six situations resolve canonical variant2/3 and worked variant1 without copying inventory',()=>{const r=m.situationRound();assert.deepEqual(r.map(s=>s.id),['request-2','choice-2','plan-2','request-3','choice-3','plan-3']);for(const s of r){assert.equal(s.unit,m.chunkUnits.find(u=>u.id===s.unit.id));assert.equal(s.example,s.unit.variants[0]);assert.ok(s.unit.variants.includes(s.target));assert.notEqual(s.example.id,s.target.id);assert.ok(m.situationHintChunks(s).length);for(const ex of [s.example,s.target]){assert.ok(ex.chunks.every(c=>existsSync('public'+m.chunkAudio(c.audioId))));assert.ok(existsSync('public'+m.chunkAudio(ex.id)))} }});
test('route toggle preserves old collections/course/filter/hash without adding old history IDs',()=>{for(const collection of ['', 'words','grammar','original']){const href='/?course=intensive&material=speaking-chunks'+(collection?'&chunks='+collection:'')+'&q=school&other=keep#context',on=m.situationLabHref(href,true);assert.equal(m.situationLabRequested(new URL(on,'http://localhost').search),true);assert.equal(m.situationLabHref(on,false),href)}assert.equal(m.situationLabRequested('?chunklab=bad'),false)});
test('summary keeps typed model matching, spoken self-check and assisted attempts distinct; retry includes help',()=>{const r=m.situationRound(),typed=m.typedSituationResult(r[0],'你能给我一本书吗',false);assert.equal(typed.outcome,'model-match');assert.equal(m.typedSituationResult(r[0],'请给我一本书',false).outcome,'retry');const summary=m.situationSummary([typed,{id:r[1].id,method:'spoken',outcome:'self-check',assisted:false},m.typedSituationResult(r[2],r[2].target.hanzi,true),{id:r[3].id,method:'reveal',outcome:'retry',assisted:true}]);assert.deepEqual(summary,{unaided:1,selfCheck:1,assisted:2,retryIds:[r[2].id,r[3].id]})});
test('task removes worked model, target sentence/pinyin/audio; staged hints count as assistance',async()=>{const root=await mount();assert.ok(text(root.toJSON()).includes('一点儿水'));await click(root,'Try a new situation');assert.ok(!text(root.toJSON()).includes('一点儿水'));assert.ok(!text(root.toJSON()).includes('一本书'));assert.ok(!text(root.toJSON()).includes('yì běn shū'));assert.equal(root.root.findAll(x=>x.props['data-example']).length,0);assert.equal(button(root,'Hint 2 · useful chunks').props.disabled,true);await click(root,'Hint 1 · show the pattern');assert.ok(text(root.toJSON()).includes('你能给我 […] 吗'));assert.ok(!text(root.toJSON()).includes('一本书'));await click(root,'Hint 2 · useful chunks');assert.ok(text(root.toJSON()).includes('一本书'));assert.equal(root.root.findAll(x=>x.props['data-audio']).length,0);await click(root,'I’ve said it · compare');assert.ok(text(root.toJSON()).includes('With help'));assert.ok(text(root.toJSON()).includes('你能给我一本书吗'));await click(root,'I expressed the idea');assert.ok(text(root.toJSON()).includes('Situation 2 of 6'));await m.act(()=>root.unmount())});
test('typed IME composition does not submit; exact pattern feedback does not judge alternate Chinese',async()=>{const root=await mount();await click(root,'Try a new situation');let input=root.root.findByType('input');await m.act(()=>input.props.onChange({target:{value:'请给我一本书'}}));await m.act(()=>input.props.onCompositionStart());await m.act(()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.equal(root.root.findAll(x=>x.props['data-example']).length,0);let prevented=false;input.props.onKeyDown({key:'Enter',nativeEvent:{isComposing:true},preventDefault(){prevented=true}});assert.equal(prevented,true);await m.act(()=>input.props.onCompositionEnd());await m.act(()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.ok(text(root.toJSON()).includes('A different sentence may still be valid Chinese'));assert.ok(text(root.toJSON()).includes('请给我一本书'));assert.equal(root.root.findAll(x=>x.props['data-audio']).length,1);await m.act(()=>root.unmount())});
test('spoken self-check is not auto-assessed, reveal is assisted and bounded retry resets hints',async()=>{const root=await mount();for(let i=0;i<6;i++){await click(root,'Try a new situation');if(i===0){await click(root,'I’ve said it · compare');await click(root,'I expressed the idea')}else{await click(root,'Show the model with help');await click(root,'Next situation')}}const value=text(root.toJSON());assert.ok(value.includes('Unaided spoken self-checks1'));assert.ok(value.includes('Unaided typed model matches0'));assert.ok(value.includes('Assisted attempts5'));await click(root,'Retry with a new attempt · 5');assert.ok(text(root.toJSON()).includes('Situation 1 of 5'));await click(root,'Try a new situation');assert.ok(!text(root.toJSON()).includes('Pattern support'));assert.equal(button(root,'Hint 1 · show the pattern').props.disabled,false);await m.act(()=>root.unmount())});
test('four locales have complete UI/scenario copy and scenarios are context rather than literal model translation',()=>{for(const locale of ['en','fr','ru','tr']){assert.deepEqual(Object.keys(m.situationCopy[locale]),Object.keys(m.situationCopy.en));for(const s of m.situationRound()){const cue=m.situationScenarios[s.id][locale];assert.ok(cue.length>40);assert.notEqual(cue,s.target.meaning[locale]);assert.ok(!cue.includes(s.target.hanzi))}}const source=readFileSync('app/chunk-situation-lab.tsx','utf8');assert.ok(!/useCourseProgress|\.record\(|localStorage|fetch\(/.test(source))});
test('IME candidate-confirmation Enter with keyCode 229 is not a typed answer submission',async()=>{const root=await mount();await click(root,'Try a new situation');let prevented=false;root.root.findByType('input').props.onKeyDown({key:'Enter',nativeEvent:{isComposing:false,keyCode:229},preventDefault(){prevented=true}});assert.equal(prevented,true);await m.act(()=>root.unmount())});
test('all 54 situations include 48 canonical grammar cases with connected readings and existing audio',()=>{
 const all=m.situationRound('all');assert.equal(all.length,54);assert.equal(new Set(all.map(s=>s.id)).size,54);
 for(const [set,count] of Object.entries({everyday:6,compare:12,connect:16,time:10,attitude:2,complement:8}))assert.equal(m.situationRound(set).length,count);
 const grammar=all.filter(s=>s.grammar);assert.equal(grammar.length,48);assert.equal(new Set(grammar.map(s=>s.unit.id)).size,24);
 for(const s of grammar){assert.equal(s.grammar.frame,m.grammarFrames.find(f=>f.id===s.unit.id));assert.equal(s.target.hanzi,s.grammar.target.hanzi);assert.equal(s.target.pinyin,s.grammar.target.pinyin);assert.equal(s.target.meaning,s.grammar.target.meaning);assert.notEqual(s.example.id,s.target.id);assert.ok(situationHasSupport(s));for(const ex of [s.example,s.target])for(const id of [ex.id,...ex.chunks.map(c=>c.audioId)]){const bytes=readFileSync('public'+m.chunkAudio(id));assert.ok(bytes.length>1000);assert.ok(bytes.toString('ascii',0,3)==='ID3'||bytes[0]===255);}}
 function situationHasSupport(s){return m.situationHintChunks(s).every(c=>c.text&&c.pinyin&&['en','fr','ru','tr'].every(l=>c.meaning[l]))}
 assert.equal(m.situationRound('time').find(s=>s.id==='time-as-soon-1').target.chunks[0].pinyin,'yí');
});
test('grammar scenarios and thematic selectors are localized without exposing the canonical answer',()=>{
 for(const s of m.situationRound('all'))for(const locale of ['en','fr','ru','tr']){const cue=m.situationScenarios[s.id][locale];assert.ok(cue.length>40);assert.notEqual(cue,s.target.meaning[locale]);assert.ok(!cue.includes(s.target.hanzi));}
 for(const names of Object.values(m.situationSetNames))for(const locale of ['en','fr','ru','tr'])assert.ok(names[locale].length>3);
});
test('grammar flow hides models, offers marker hints with audio, and does not credit assisted answers',async()=>{
 const root=await mount('compare'),s=m.situationRound('compare')[0];assert.ok(text(root.toJSON()).includes('A 比 B + adjective'));assert.ok(text(root.toJSON()).includes(s.example.hanzi));
 await click(root,'Try a new situation');assert.equal(root.root.findAll(x=>x.props['data-example']).length,0);assert.ok(!text(root.toJSON()).includes(s.target.hanzi));assert.ok(!text(root.toJSON()).includes(s.target.pinyin));
 await click(root,'Hint 1 · show the pattern');assert.ok(text(root.toJSON()).includes('A 比 B + adjective'));assert.equal(root.root.findAll(x=>x.props['aria-label']==='Listen to model: 比').length,0);
 await click(root,'Hint 2 · useful chunks');assert.ok(text(root.toJSON()).includes('bǐ'));assert.equal(root.root.findAll(x=>x.props['aria-label']==='Listen to model: 比').length,1);
 await m.act(()=>root.root.findByType('input').props.onChange({target:{value:s.target.hanzi}}));await m.act(()=>root.root.findByType('form').props.onSubmit({preventDefault(){}}));assert.ok(text(root.toJSON()).includes('With help'));assert.ok(text(root.toJSON()).includes(s.target.hanzi));
 await m.act(()=>root.root.findByType('select').props.onChange({target:{value:'attitude'}}));assert.ok(text(root.toJSON()).includes('Situation 1 of 2'));await click(root,'Try a new situation');assert.equal(button(root,'Hint 1 · show the pattern').props.disabled,false);await m.act(()=>root.unmount());
});
test('default all-set and complete interest round keep self-check, retry and fresh-set state separate',async()=>{
 const root=await mount('all');assert.ok(text(root.toJSON()).includes('Situation 1 of 54'));assert.equal(root.root.findAllByType('option').length,7);
 await m.act(()=>root.root.findByType('select').props.onChange({target:{value:'attitude'}}));
 await click(root,'Try a new situation');await click(root,'I’ve said it · compare');await click(root,'I expressed the idea');await click(root,'Try a new situation');await click(root,'Show the model with help');await click(root,'Next situation');
 assert.ok(text(root.toJSON()).includes('Unaided spoken self-checks1'));assert.ok(text(root.toJSON()).includes('Assisted attempts1'));await click(root,'Retry with a new attempt · 1');assert.ok(text(root.toJSON()).includes('Situation 1 of 1'));
 await m.act(()=>root.root.findByType('select').props.onChange({target:{value:'time'}}));assert.ok(text(root.toJSON()).includes('Situation 1 of 10'));await m.act(()=>root.unmount());
});
test('new constructions keep answers hidden until comparison and preserve assisted retry classification',async()=>{
 const original=new Set(['compare-bi','compare-meiyou','compare-same','distance-li','connect-cause','connect-although','connect-if','time-first-then','time-as-soon','attitude-interest']);
 const added=m.situationRound('all').filter(s=>s.grammar&&!original.has(s.unit.id));
 assert.equal(added.length,28);
 // Exercise the real UI for every target, including the second half of split frames.
 const root=await mount('all');
 for(let index=0;index<m.situationRound('all').length;index++){
  const situation=m.situationRound('all')[index];
  await click(root,'Try a new situation');
  if(situation.grammar&&!original.has(situation.unit.id)){
   assert.equal(root.root.findAll(x=>x.props['data-example']).length,0);
   assert.ok(!text(root.toJSON()).includes(situation.target.hanzi));
   assert.ok(!text(root.toJSON()).includes(situation.target.pinyin));
   await click(root,'Hint 1 · show the pattern');
   assert.ok(text(root.toJSON()).includes(situation.grammar.frame.pattern));
   await click(root,'Hint 2 · useful chunks');
   for(const chunk of situation.target.chunks){
    assert.ok(text(root.toJSON()).includes(chunk.pinyin));
    assert.equal(root.root.findAll(x=>x.props['aria-label']==='Listen to model: '+chunk.text).length,situation.target.chunks.filter(c=>c.text===chunk.text).length);
   }
   await click(root,'I’ve said it · compare');
   assert.ok(text(root.toJSON()).includes(situation.target.hanzi));
   assert.ok(text(root.toJSON()).includes('With help'));
  }else await click(root,'I’ve said it · compare');
  await click(root,'I expressed the idea');
 }
 assert.ok(text(root.toJSON()).includes('Assisted attempts28'));
 await click(root,'Retry with a new attempt · 28');
 assert.ok(text(root.toJSON()).includes('Situation 1 of 28'));
 await click(root,'Try a new situation');
 assert.equal(button(root,'Hint 1 · show the pattern').props.disabled,false);
 await m.act(()=>root.unmount());
});
