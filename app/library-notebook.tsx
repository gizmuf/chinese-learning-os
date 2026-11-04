'use client';
import {useEffect,useRef,useState} from 'react';
import DictionaryMiniNotebook from './dictionary-mini-notebook';
/** Keep offscreen library rows lightweight without dropping their in-memory ink. */
export default function LibraryNotebook({text,db}:{text:string;db:IDBDatabase|null}){
 const root=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{if(!root.current)return;if(typeof IntersectionObserver==='undefined'){setVisible(true);return;}const observer=new IntersectionObserver(entries=>setVisible(entries.some(e=>e.isIntersecting)),{rootMargin:'300px'});observer.observe(root.current);return()=>observer.disconnect();},[]);
 return <div ref={root} className="library-inline-notebook"><DictionaryMiniNotebook text={text} visible={visible} onClose={()=>{}} wholeWord persist db={db}/></div>;
}
