import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';import {build} from 'esbuild';import {mkdtempSync,writeFileSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';import {createRequire} from 'node:module';
import fontkit from '@pdf-lib/fontkit';
import {gunzipSync} from 'node:zlib';
const require=createRequire(import.meta.url),dir=mkdtempSync(join(tmpdir(),'hanzi-style-'));
const b=await build({stdin:{contents:`export {HanziStyleProvider,HanziDisplayControls} from './app/hanzi-style';export {default as CloudHighlight} from './app/atlas-cloud-highlight';export * from './app/atlas-cloud-connections';export * from './app/dictionary-character-family-model';export {sourceCharacterEntry} from './app/dictionary-source-model';export {isSimplifiedHeadword} from './app/simplified-chinese';export {hskLevelIndex,hskClassification} from './app/hsk-level-model';export {createElement} from 'react';export {default as renderer,act} from 'react-test-renderer';`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',alias:{react:require.resolve('react').replace(/\/index\.js$/,'')},plugins:[{name:'i18n',setup(build){build.onResolve({filter:/^\.\/i18n$/},()=>({path:'i18n',namespace:'mock'}));build.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:`export const useI18n=()=>({locale:'en'});`,loader:'js'}));}}]});
const file=join(dir,'test.mjs');writeFileSync(file,b.outputFiles[0].text);const m=await import(pathToFileURL(file));globalThis.IS_REACT_ACT_ENVIRONMENT=true;
globalThis.document={documentElement:{dataset:{}}};
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?text(node.children):'';
test('All 17 walking-family characters keep stroke geometry regardless of mapping or semantic-role coverage',async()=>{
 globalThis.fetch=async url=>({ok:true,json:async()=>JSON.parse(fs.readFileSync('public'+decodeURIComponent(url),'utf8'))});
 let root;await m.act(async()=>{root=m.renderer.create(m.createElement(m.HanziStyleProvider,null,m.createElement(m.HanziDisplayControls),m.createElement(m.CloudHighlight,{hanzi:'进过近远腿边迎运还这迟送适选遇遍道',component:'walk'})));});
 assert.equal(root.root.findAllByProps({'data-hanzi-render':'stroke-svg'}).length,17);
 assert.equal(root.root.findAllByType('path').some(p=>p.props.style.fill.includes('cloud-shared')),true);
 await m.act(async()=>root.root.findByType('input').props.onChange({target:{checked:false}}));
 assert.equal(root.root.findAllByProps({'data-hanzi-render':'stroke-svg'}).length,17);
 assert.ok(root.root.findAllByType('path').every(p=>p.props.style.fill==='currentColor'));
 await m.act(async()=>root.root.findAllByType('button').find(b=>text(b.props.children)==='Print').props.onClick());
 assert.equal(root.root.findAllByType('svg').length,0);assert.equal(root.root.findAllByProps({'data-hanzi-render':'print'}).length,17);assert.equal(document.documentElement.dataset.hanziStyle,'print');
 await m.act(async()=>root.root.findAllByType('button').find(b=>text(b.props.children)==='Stroke shapes').props.onClick());assert.equal(root.root.findAllByProps({'data-hanzi-render':'stroke-svg'}).length,17);assert.equal(root.root.findByType('input').props.checked,false);await m.act(async()=>root.unmount());
});
test('Supplemental maps preserve curated maps, add 16 direct walking highlights and do not invent nested leg mapping',()=>{
 for(const ch of '进过近远边迎运还这迟送适选遇遍道')assert.equal(m.cloudHighlightAvailability(ch,'walk'),'mapped',ch);
 assert.equal(m.cloudHighlightAvailability('腿','walk'),'none');assert.equal(m.cloudHighlightStrokes('腿','walk',13),null);
 const data=JSON.parse(fs.readFileSync('public/atlas/extended-component-strokes.json'));assert.equal(data.coverage.glyphsVerified??Object.keys(data.mappings).length,655);
 for(const [key,parts]of Object.entries(data.mappings)){const ch=String.fromCodePoint(parseInt(key.slice(1),16)),n=JSON.parse(fs.readFileSync('public/characters/'+ch+'.json')).strokes.length;for(const indices of Object.values(parts)){assert.ok(indices.length);assert.equal(new Set(indices).size,indices.length);assert.ok(indices.every(i=>Number.isInteger(i)&&i>=0&&i<n));}}
});
test('One licensed Unicode stroke font covers every HSK character and all new grammar examples',()=>{
 const font=fs.readFileSync('public/fonts/ChineseOSStroke.woff'),manifest=JSON.parse(fs.readFileSync('public/fonts/hanzi-display.json')),index=JSON.parse(fs.readFileSync('data/hanzi-structure.json'));
 assert.equal(font.toString('ascii',0,4),'wOFF');assert.equal(crypto.createHash('sha256').update(font).digest('hex'),manifest.sha256);assert.ok(manifest.glyphCount>=1011);
 for(const ch of index.characters)assert.ok(manifest.characters.includes(ch.hanzi));
 for(const path of ['data/speaking-chunks/grammar-frames.json','data/speaking-chunks/grammar-frames-advanced.json'])for(const frame of JSON.parse(fs.readFileSync(path)))for(const ex of frame.examples)for(const ch of ex.hanzi)if(/\p{Script=Han}/u.test(ch))assert.ok(manifest.characters.includes(ch),ch);
 for(const path of manifest.licenses)assert.ok(fs.existsSync('public'+path));
});
test('The stroke font covers the Practical lesson, its dictionary components and HSK 1–3 recognition',()=>{
 const read=(path)=>JSON.parse(gunzipSync(fs.readFileSync(path)).toString('utf8'));
 const dictionaryData=read('public/dictionary/characters.json.gz');
 const hsk=read('public/dictionary/hsk-levels-2025.json.gz');
 const font=fontkit.create(fs.readFileSync('public/fonts/ChineseOSStroke.woff'));
 const manifest=JSON.parse(fs.readFileSync('public/fonts/hanzi-display.json'));
 const glyphs=new Set(font.characterSet);
 const lessonFiles=[
  ...fs.readdirSync('data/practical-2026-11-16').filter(file=>file.endsWith('.json')).map(file=>'data/practical-2026-11-16/'+file),
  ...fs.readdirSync('app').filter(file=>/^practical-family-exercise.*data\.ts$/.test(file)).map(file=>'app/'+file),
  'app/practical-lesson-family-data.ts','app/practical-lesson-copy.ts',
 ];
 const ideographs=(value)=>[...(value.match(/\p{Unified_Ideograph}/gu)??[])];
 const lesson=new Set(lessonFiles.flatMap(file=>ideographs(fs.readFileSync(file,'utf8'))));
 const parts=new Set([...lesson].flatMap(ch=>ideographs(dictionaryData[ch]?.decomposition??'')));
 const dictionary=new Map(Object.entries(dictionaryData).filter(([ch])=>m.isSimplifiedHeadword(ch)).map(([ch,row])=>[ch,m.sourceCharacterEntry(ch,row)]));
 const family=['冉',...m.dictionaryCharacterFamily('冉','冉',dictionary).map(row=>row.text)];
 const official=[...'123'].flatMap(level=>[...hsk.characters[level]]);
 assert.ok(lesson.has('付')&&parts.has('寸'));
 assert.ok([...('篝耩聃苒')].every(ch=>family.includes(ch)));
 for(const ch of new Set([...lesson,...parts,...family,...official])){
  assert.ok(glyphs.has(ch.codePointAt(0)),ch);
  assert.ok(manifest.outlineSources[ch],ch);
 }
 assert.match(fs.readFileSync('app/hanzi-style.css','utf8'),new RegExp('ChineseOSStroke\\.woff\\?v='+manifest.sha256.slice(0,12)));
 const index=m.hskLevelIndex(hsk);
 assert.deepEqual(m.hskClassification(index,'付','character'),{kind:'character',levels:['4']});
 for(const ch of '冉篝耩聃苒')assert.deepEqual(m.hskClassification(index,ch,'character'),{kind:'character',levels:[]});
});
test('Practical dictionary targets respect the selected style and use the pinned stroke assets',async()=>{
 const sample='付寸冉篝耩聃苒';
 globalThis.fetch=async url=>{
  const path='public'+decodeURIComponent(url);
  assert.equal(fs.readFileSync(path,'utf8'),fs.readFileSync('node_modules/hanzi-writer-data/'+path.split('/').at(-1),'utf8'));
  return {ok:true,json:async()=>JSON.parse(fs.readFileSync(path,'utf8'))};
 };
 let root;
 await m.act(async()=>{root=m.renderer.create(m.createElement(m.HanziStyleProvider,null,m.createElement(m.HanziDisplayControls),m.createElement(m.CloudHighlight,{hanzi:sample,component:'冉'})));});
 assert.equal(root.root.findAllByProps({'data-hanzi-render':'stroke-svg'}).length,sample.length);
 await m.act(async()=>root.root.findAllByType('button').find(button=>text(button.props.children)==='Print').props.onClick());
 assert.equal(root.root.findAllByProps({'data-hanzi-render':'print'}).length,sample.length);
 await m.act(async()=>root.root.findAllByType('button').find(button=>text(button.props.children)==='Stroke shapes').props.onClick());
 assert.equal(root.root.findAllByProps({'data-hanzi-render':'stroke-svg'}).length,sample.length);
 await m.act(async()=>root.unmount());
});
test.after(()=>{for(const handle of process._getActiveHandles())if(handle.constructor.name==='MessagePort')handle.unref();});
