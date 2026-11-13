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
import ConnectionLab from './app/connection-lab';
import {I18nProvider, LanguagePicker} from './app/i18n';
let failWrites=false; const realPut=IDBObjectStore.prototype.put; IDBObjectStore.prototype.put=function(...args){if(failWrites)throw new DOMException('QA write failure','QuotaExceededError');return realPut.apply(this,args)};
function Preview(){const [fault,setFault]=useState(false),[reset,setReset]=useState(0);const [penOnly,setPenOnly]=useState(false),[notice,setNotice]=useState(''),[owner,setOwner]=useState('lab-qa-A'),[narrow,setNarrow]=useState(false);return <I18nProvider><main style={{maxWidth:narrow?375:960,margin:'32px auto',padding:'0 16px'}}><nav className='preview-toolbar'><LanguagePicker/><button onClick={()=>setNarrow(!narrow)}>Phone width</button><button onClick={()=>setOwner(owner==='lab-qa-A'?'lab-qa-B':'lab-qa-A')}>Account: {owner}</button></nav><button onClick={()=>{failWrites=!failWrites;setFault(failWrites)}}>Writes: {fault?'blocked':'allowed'}</button><button onClick={()=>{sessionStorage.setItem('chinese-os-connections-v1-draft-'+owner,JSON.stringify({version:1,tasks:[null]}));setReset(reset+1)}}>Malformed draft</button><ConnectionLab key={owner+reset} owner={owner} penOnly={penOnly} setPenOnly={setPenOnly} notify={setNotice}/><p role='status'>{notice}</p></main></I18nProvider>;}createRoot(document.getElementById('root')).render(<Preview/>);`;
const result = await build({absWorkingDir:root,stdin:{contents:entry,resolveDir:root,loader:'tsx'},bundle:true,write:false,outfile:'preview.js',format:'iife',jsx:'automatic',minify:true,define:{'process.env.NODE_ENV':'"production"'},plugins:[{
 name:'bundled-preview-recordings',setup(b){b.onLoad({filter:/\/app\/audio\.ts$/},async({path:p})=>({loader:'ts',contents:readFileSync(p,'utf8').replace('const audio = new Audio(source);',`const recordings: Record<string,string> = ${JSON.stringify(recordings)}; const audio = new Audio(recordings[source] ?? source);`)}));}
}]});
const js=result.outputFiles.find(f=>f.path.endsWith('.js')).text;
const css=result.outputFiles.find(f=>f.path.endsWith('.css')).text;
const escapeHtml = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const notices = ['public/licenses/hanzi-writer-data-ARPHICPL.TXT', 'node_modules/react/LICENSE', 'node_modules/react-dom/LICENSE', 'node_modules/lucide-react/LICENSE', 'app/vendor/perfect-freehand/LICENSE', 'public/licenses/atlas-teaching-notes.txt'].map(file => file+'\n'+readFileSync(path.join(root,file),'utf8')).join('\n\n');
const base=`.primary,.secondary{display:inline-flex;align-items:center;justify-content:center;gap:8px;border:1px solid #c7d6c2!important;border-radius:25px;padding:12px 18px;background:#fffefa}.primary{background:#365e4e!important;color:white!important}.text-button{text-decoration:underline;padding:12px 0}.notebook-guidelines{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}.notebook-guidelines path{fill:none;stroke:#d8e2d2;stroke-width:.3;stroke-dasharray:1 1}.eyebrow{font-size:11px;letter-spacing:.1em}.pinyin{color:#936d40}h3{margin:12px 0!important} :root{--ink:#283c33}*{box-sizing:border-box}body{margin:0;background:#f0f3eb;color:#283c33;font:14px -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif}.ink-canvas{position:absolute;inset:0;width:100%;height:100%;touch-action:none}button,input,select{font:inherit}button{cursor:pointer;color:inherit;border:0;background:none;touch-action:manipulation}button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #ba9971;outline-offset:4px}p,h3{margin:0}a{color:inherit}svg{flex-shrink:0}.preview-toolbar{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.preview-toolbar button,.preview-toolbar select{min-height:44px;padding:10px 14px;border:1px solid #d4ddcb;border-radius:12px;background:#fffefa}.preview-toolbar button[aria-pressed=true]{background:#365e4e;color:white}.preview-toolbar select{margin-left:auto}`;
mkdirSync(path.join(root,'outputs'),{recursive:true});
const output=path.join(root,'outputs','connection-lab-preview.html');
writeFileSync(output,`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Chinese OS · Learning lab preview</title><style>${base}\n${css}</style><div id="root"></div><details style="max-width:796px;margin:24px auto;padding:0 12px;color:#6f7b67;font-size:11px"><summary>Source notices · bundled character data and software</summary><pre style="white-space:pre-wrap">${escapeHtml(notices)}</pre></details><script>${js.replaceAll('</script','<\\/script')}</script></html>`);
console.log(output);
