'use client';

import {useEffect, useRef, useState} from 'react';
import {Download, Upload} from 'lucide-react';
import type {GuestRestore, parseGuestBackup} from './guest-backup-model';

type Preview = Awaited<ReturnType<typeof parseGuestBackup>>;
const modelTimeout = 14_000;
const fileTimeout = 10_000;

function readFile(file:File, signal:AbortSignal) {
 return new Promise<string>((resolve,reject)=>{
  if(signal.aborted){reject(Error('The file read was cancelled.'));return;}
  const reader=new FileReader();
  const abort=()=>reader.abort();
  const timer=setTimeout(()=>{
   reject(Error('The backup file did not open. Choose the file again or copy it to this device first.'));
   reader.abort();
  },fileTimeout);
  signal.addEventListener('abort',abort,{once:true});
  reader.onload=()=>resolve(String(reader.result));
  reader.onerror=()=>reject(Error('The backup file could not be read.'));
  reader.onabort=()=>reject(Error('The file read was cancelled.'));
  reader.onloadend=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);};
  try{reader.readAsText(file);}catch(error){clearTimeout(timer);signal.removeEventListener('abort',abort);reject(error);}
 });
}

function loadModel() {
 return new Promise<typeof import('./guest-backup-model')>((resolve,reject)=>{
  const timer=setTimeout(()=>reject(Error('Backup tools did not load. Please retry.')),modelTimeout);
  void import('./guest-backup-model').then(resolve,reject).finally(()=>clearTimeout(timer));
 });
}
const sections = {
 notebook:'Vocabulary progress and notebook', atlas:'Hanzi Atlas', course:'Courses',
 recognition:'Recognition practice', connectionLab:'Connection Lab', preferences:'Preferences and learning checkpoints',
};
const categories:Record<keyof Preview['counts'],string> = {
 progress:'Vocabulary attempts',atlas:'Atlas attempts',course:'Course attempts',recognition:'Recognition attempts',
 connectionLab:'Connection Lab records',drafts:'Notebook records',privateLessons:'Private lesson records included above',
 preferences:'Preferences and reading checkpoints',
};

export default function GuestBackup({disabled}: {disabled:boolean}) {
 const [preview,setPreview]=useState<Preview>();
 const [result,setResult]=useState<GuestRestore>();
 const [busy,setBusy]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const lock=useRef(false);
 const pendingFile=useRef<AbortController | undefined>(undefined);
 useEffect(()=>()=>pendingFile.current?.abort(),[]);

 async function run(work:()=>Promise<void>){
  if(disabled||lock.current)return;
  lock.current=true;setBusy(true);setError('');setNotice('');
  try{await work();}
  catch(issue){setError(issue instanceof Error?issue.message:'The backup could not be opened.');}
  finally{lock.current=false;setBusy(false);}
 }

 function download(){
  return run(async()=>{
   const {exportGuestBackup}=await loadModel();
   const {file,omittedDrafts}=await exportGuestBackup({factory:indexedDB,storage:localStorage});
   const url=URL.createObjectURL(file);
   const link=document.createElement('a');
   link.href=url;
   link.download='chinese-os-guest-notebook-'+new Date().toISOString().slice(0,10)+'.json';
   try{link.click();}finally{setTimeout(()=>URL.revokeObjectURL(url),1000);}
   setNotice('Backup created. Keep the file private if it contains notes, handwriting, or private lessons.'
    +(omittedDrafts ? ' '+omittedDrafts+' unrecognized notebook record(s) were left out.' : ''));
  });
 }

 function choose(file:File){
  setPreview(undefined);setResult(undefined);
  return run(async()=>{
   const task=new AbortController();
   pendingFile.current=task;
   try {
    const {guestBackupLimit,parseGuestBackup}=await loadModel();
    if(file.size>guestBackupLimit)throw Error('Choose a backup file under 64 MiB.');
    const candidate=await parseGuestBackup(await readFile(file,task.signal));
    if(!task.signal.aborted)setPreview(candidate);
   } finally{
    if(pendingFile.current===task)pendingFile.current=undefined;
   }
  });
 }

 function restore(){
  if(!preview)return;
  return run(async()=>{
   const {restoreGuestBackup}=await loadModel();
   const next=await restoreGuestBackup({factory:indexedDB,storage:localStorage},preview);
   setResult(next);
   if(!next.failed.length)setPreview(undefined);
  });
 }

 return <details className="panel" style={{marginBlock:'1rem',padding:'1.25rem'}}>
  <summary style={{fontWeight:650,cursor:'pointer'}}>Guest notebook backup</summary>
  <p>Copy your guest notebook between browsers or devices. The file can include private lessons and handwriting. It stays on this device until you share or move it.</p>
  <div className="course-actions">
   <button type="button" className="secondary" disabled={disabled||busy} onClick={()=>void download()}><Download size={16}/> Download backup</button>
   <label><span>Choose a backup to restore</span>{' '}
    <input type="file" accept=".json,application/json" disabled={disabled||busy} onChange={event=>{
     const file=event.currentTarget.files?.[0];
     if(file){const input=event.currentTarget;void choose(file)?.finally(()=>{input.value='';});}
    }}/></label>
  </div>
  {busy&&<p role="status">Working with the notebook on this device…</p>}
  {error&&<p role="alert">{error}</p>}
  {notice&&<p role="status">{notice}</p>}
  {preview&&<section aria-label="Backup preview">
   <h3>Records in this backup</h3>
   <ul>{Object.entries(preview.counts).map(([group,count])=><li key={group}>{categories[group as keyof Preview['counts']]} · {count}</li>)}</ul>
   <p>Restore adds missing records. When the same item is already here, this device’s version stays. Close other Chinese OS tabs before restoring.</p>
   <div className="course-actions">
    <button type="button" className="primary" disabled={disabled||busy} onClick={()=>void restore()}><Upload size={16}/> {result?.failed.length?'Retry restore':'Restore to this device'}</button>
    <button type="button" className="secondary" disabled={busy} onClick={()=>setPreview(undefined)}>Cancel</button>
   </div>
  </section>}
  {result&&<section aria-label="Restore result">
   {result.failed.length?<p role="alert">Restore did not finish for {result.failed.map(group=>sections[group]).join(', ')}. Records listed below were saved or kept. Free device storage or close other tabs and retry with the same file.</p>:<p role="status">Restore finished. Reload to see your notebook and preferences.</p>}
   <ul>{Object.entries(result.groups).map(([group,counts])=><li key={group}>{sections[group as keyof typeof sections]} · {counts.added} added or merged, {counts.skipped} kept</li>)}</ul>
   {Object.keys(result.groups).length>0&&<button type="button" className="secondary" disabled={busy} onClick={()=>location.reload()}>Reload notebook</button>}
  </section>}
 </details>;
}
