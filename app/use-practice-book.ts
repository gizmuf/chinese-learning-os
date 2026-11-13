'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {DictionaryEntry} from './atlas-spatial-model';
import {readDraft} from './local-store';
import {practiceBookKey,readPracticeChoices,togglePracticeChoice,type PracticeChoice} from './practice-book';
export function usePracticeBook(db:IDBDatabase|null,owner:string|null,notify:(message:string)=>void){
 const key=owner??'guest',valid=db?.name==='chinese-os-v1-'+key?db:null,current=useRef(valid);current.current=valid;
 const [state,setState]=useState<{db:IDBDatabase|null;entries:PracticeChoice[];ready:boolean;busy:boolean}>({db:null,entries:[],ready:false,busy:false}),lock=useRef<IDBDatabase|null>(null);
 const reload=useCallback(()=>{if(!valid)return;void readDraft(valid,practiceBookKey).then(rows=>{if(current.current===valid)setState({db:valid,entries:readPracticeChoices(rows),ready:true,busy:false});}).catch(()=>{if(current.current===valid)setState(s=>({...s,db:valid,ready:false}));});},[valid]);
 useEffect(()=>{reload();addEventListener('focus',reload);return()=>removeEventListener('focus',reload);},[reload]);
 const ready=state.db===valid&&!!valid&&state.ready,entries=ready?state.entries:[];
 async function toggle(entry:DictionaryEntry){if(!valid||!ready||lock.current===valid)return;lock.current=valid;setState(s=>({...s,busy:true}));try{const next=await togglePracticeChoice(valid,entry);if(current.current===valid)setState({db:valid,entries:next,ready:true,busy:false});}catch{notify('Could not save your practice selection. Please try again.');}finally{if(lock.current===valid)lock.current=null;if(current.current===valid)setState(s=>({...s,busy:false}));}}
 return {entries,ready,busy:state.db===valid&&state.busy,toggle,reload};
}
export type PracticeBook=ReturnType<typeof usePracticeBook>;
