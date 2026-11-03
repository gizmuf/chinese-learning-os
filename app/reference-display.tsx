import {createContext,useContext} from 'react';
export const ReferenceDisplayContext=createContext({pinyin:true,english:true,notify:(_message:string)=>{}});
export const useReferenceDisplay=()=>useContext(ReferenceDisplayContext);
