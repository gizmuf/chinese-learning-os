// A no-server QA harness of the actual Atlas component, with bundled narration.
// No account, network request, or progress event is needed to inspect the change.
import { build } from 'esbuild';
import { readFileSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
const recordings = {};
for (const id of ['sun', 'wood']) for (const lang of ['en', 'fr', 'ru']) for (let step = 0; step < 3; step++) {
  const name = `/atlas/stories/${id}-${lang}-${step}.mp3`;
  recordings[name] = 'data:audio/mpeg;base64,' + readFileSync(path.join(root, 'public', name)).toString('base64');
}
for (const id of ['atlas-u6797','atlas-u68ee','atlas-u4f11','atlas-u660e','atlas-u6e05','atlas-u6674','atlas-u60c5','atlas-u8bf7','tomorrow','hsk1-189','hsk1-036']) {
 for (const kind of ['word','sentence']) {
  const name = `${id.startsWith('atlas-')?'/atlas/audio':'/audio'}/${id}-${kind}.mp3`;
  if(existsSync(path.join(root,'public',name))) recordings[name]='data:audio/mpeg;base64,'+readFileSync(path.join(root,'public',name)).toString('base64');
 }
}
const entry = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import AtlasWorkshop from './app/atlas-workshop';
import Ink from './app/ink';
import {I18nProvider, LanguagePicker} from './app/i18n';
function Preview(){
 const [character,setCharacter]=useState('木');
 const [narrow,setNarrow]=useState(false);
 const [notice,setNotice]=useState('');
 const [strokes,setStrokes]=useState([]);const [penOnly,setPenOnly]=useState(false);
 return <I18nProvider><main style={{maxWidth:narrow?375:820,margin:'32px auto',padding:'0 12px'}}>
 <nav className="preview-toolbar" aria-label="Preview controls">
 <button onClick={()=>setCharacter('木')} aria-pressed={character==='木'}>木 · mù</button>
 <button onClick={()=>setCharacter('日')} aria-pressed={character==='日'}>日 · rì</button>
 <button onClick={()=>setNarrow(!narrow)}>{narrow?'Wide view':'Phone width'}</button><LanguagePicker/>
 </nav>
 <AtlasWorkshop character={character} onComponent={()=>setNotice('In the app, this opens the related character family.')} onCharacter={setCharacter} notify={setNotice}/>
 <details style={{marginTop:24,padding:20,background:'#fffefa',borderRadius:16}}><summary>Try the new pressure-sensitive ink · Apple Pencil / finger / mouse</summary><div style={{position:'relative',height:300,marginTop:16,border:'1px solid #d4ddcb',background:'linear-gradient(transparent 49.8%,#e8edde 50%,transparent 50.2%),linear-gradient(90deg,transparent 49.8%,#e8edde 50%,transparent 50.2%)'}}><Ink strokes={strokes} onChange={setStrokes} penOnly={penOnly}/></div><div className='preview-toolbar'><button onClick={()=>setStrokes(strokes.slice(0,-1))}>Undo</button><button onClick={()=>setStrokes([])}>Clear</button><label><input type='checkbox' checked={penOnly} onChange={e=>setPenOnly(e.target.checked)}/> Pencil only</label></div></details>
 <p role="status">{notice}</p></main></I18nProvider>
}createRoot(document.getElementById('root')).render(<Preview/>);`;
const result = await build({absWorkingDir:root,stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,outfile:'preview.js',format:'iife',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{
 name:'bundled-preview-recordings',setup(b){b.onLoad({filter:/\/app\/audio\.ts$/},async({path:p})=>({loader:'ts',contents:readFileSync(p,'utf8').replace('const audio = new Audio(source);',`const recordings: Record<string,string> = ${JSON.stringify(recordings)}; const audio = new Audio(recordings[source] ?? source);`)}));}
}]});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text;
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
const escapeHtml = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const notices = ['public/licenses/hanzi-writer-data-ARPHICPL.TXT', 'node_modules/react/LICENSE', 'node_modules/react-dom/LICENSE', 'node_modules/lucide-react/LICENSE', 'app/vendor/perfect-freehand/LICENSE', 'public/licenses/atlas-teaching-notes.txt'].map(file => file+'\n'+readFileSync(path.join(root,file),'utf8')).join('\n\n');
const base=`:root{--ink:#283c33}*{box-sizing:border-box}body{margin:0;background:#f0f3eb;color:#283c33;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.ink-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}button,input,select{font:inherit}button{cursor:pointer;color:inherit;border:0;background:none;touch-action:manipulation}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #ba9971;outline-offset:4px}p,h3{margin:0}a{color:inherit}svg{flex-shrink:0}.preview-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.preview-toolbar button,.preview-toolbar select{min-height:44px;padding:10px 14px;border:1px solid #d4ddcb;border-radius:12px;background:#fffefa}.preview-toolbar button[aria-pressed=true]{background:#365e4e;color:white}.preview-toolbar select{margin-left:auto}`;
mkdirSync(path.join(root,'outputs'),{recursive:true});
const output=path.join(root,'outputs','atlas-story-preview.html');
writeFileSync(output,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chinese OS · Atlas motion preview</title><style>${base}\n${css}</style><div id="root"></div><details style="max-width:796px;margin:24px auto;padding:0 12px;color:#6f7b67;font-size:11px"><summary>Source notices · bundled character data and software</summary><pre style="white-space:pre-wrap">${escapeHtml(notices)}</pre></details><script>${js.replaceAll('</script','<\\/script')}</script></html>`);
console.log(output);
