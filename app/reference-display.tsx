import {createContext,useContext} from 'react';
export const ReferenceDisplayContext=createContext({pinyin:true,english:true,chunks:true,notify:(_message:string)=>{}});
export const useReferenceDisplay=()=>useContext(ReferenceDisplayContext);
