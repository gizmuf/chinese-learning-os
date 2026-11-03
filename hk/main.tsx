import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import StudyApp from '../app/study-app';
import {I18nProvider} from '../app/i18n';
import {AccountDialogContext} from '../app/account-dialog-context';
import '../app/globals.css';
// HTTP staging still needs collision-resistant IDs for local learning events.
// getRandomValues is available on HTTP; no authentication uses this shim.
if (!crypto.randomUUID) Object.defineProperty(crypto, 'randomUUID', {value: () => {
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128;
  const h=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}});
function App() {
 const [account,setAccount]=useState(false);
 const open=()=>setAccount(true);
 return <I18nProvider><AccountDialogContext.Provider value={open}>
 <StudyApp user={null} onSignIn={open} onSignOut={()=>{}} onManageAccount={open}/>
 {account&&<div className="modal-backdrop" role="presentation"><section role="dialog" aria-modal="true" aria-label="Local notebook" style={{background:'white',padding:'2rem',maxWidth:420,margin:'20vh auto',borderRadius:16}}><h2>Local notebook</h2><p>Your progress stays in this browser. Account sync is not available on this test server.</p><button className="primary" onClick={()=>setAccount(false)}>Continue studying</button></section></div>}
 </AccountDialogContext.Provider></I18nProvider>;
}
createRoot(document.getElementById('root')!).render(<App/>);
