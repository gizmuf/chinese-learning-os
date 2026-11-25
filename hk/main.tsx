import React, {useLayoutEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import StudyApp from '../app/study-app';
import {I18nProvider} from '../app/i18n';
import {HanziStyleProvider} from '../app/hanzi-style';
import {AccountDialogContext} from '../app/account-dialog-context';
import '../app/globals.css';
import '../app/hanzi-style.css';
import '../app/study-hanzi-type.css';
import './local-notebook.css';
// HTTP staging still needs collision-resistant IDs for local learning events.
// getRandomValues is available on HTTP; no authentication uses this shim.
if (!crypto.randomUUID) Object.defineProperty(crypto, 'randomUUID', {value: () => {
  const b = crypto.getRandomValues(new Uint8Array(16)); b[6]=(b[6]&15)|64; b[8]=(b[8]&63)|128;
  const h=Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}});
function App() {
 const account = useRef<HTMLDialogElement>(null);
 const [accountOpen, setAccountOpen] = useState(false);
 const open = () => setAccountOpen(true);
 useLayoutEffect(() => {
   if (accountOpen && account.current && !account.current.open) account.current.showModal();
 }, [accountOpen]);
 return <I18nProvider><AccountDialogContext.Provider value={open}>
 <StudyApp user={null} initialView={isPronunciationLab?'pronunciation':'today'} pronunciationServerEvaluation={false} onSignIn={open} onSignOut={()=>{}} onManageAccount={open}/>
 {accountOpen && <dialog ref={account} className="hk-local-notebook" aria-labelledby="hk-notebook-title"
   onClose={() => setAccountOpen(false)}
   onClick={event => {
     if (event.target === event.currentTarget) event.currentTarget.close();
   }}>
   <form method="dialog" className="hk-local-notebook-content">
     <button type="submit" className="hk-local-notebook-close" aria-label="Close local notebook">
       <span aria-hidden="true">×</span>
     </button>
     <h2 id="hk-notebook-title">Local notebook</h2>
     <p>Your progress stays in this browser. Account sync is not available on this server.</p>
     <button type="submit" className="primary" autoFocus>Continue studying</button>
   </form>
 </dialog>}
 </AccountDialogContext.Provider></I18nProvider>;
}
const isPronunciationLab=/^\/pronunciation-lab\/?$/.test(window.location.pathname);
createRoot(document.getElementById('root')!).render(
 <HanziStyleProvider><App/></HanziStyleProvider>,
);
