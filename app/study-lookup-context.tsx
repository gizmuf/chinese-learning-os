'use client';
import {createContext,useContext} from 'react';
import {simplifiedDisplayText} from './simplified-chinese';
import {BookOpen} from 'lucide-react';
import {useI18n} from './i18n';
import {dictionaryTokens,type StudyDictionary} from './atlas-spatial-model';
import {authoredPinyinBoundaries} from './pinyin-boundaries';
/** Lightweight shared text actions; no dependency on Atlas or writing surfaces. */
export const LookupContext=createContext<{dictionary:StudyDictionary;open:(text:string,trigger:HTMLElement)=>void}|null>(null);
export function useStudyLookup(){return useContext(LookupContext);}
export function StudyText({text,anchor='',whole=false,pinyin,sourceText,offset=0}:{text:string;anchor?:string;whole?:boolean;pinyin?:string;sourceText?:string;offset?:number}){
 text=simplifiedDisplayText(text);anchor=simplifiedDisplayText(anchor);
 const lookup=useContext(LookupContext);if(!lookup)return <>{text}</>;
 const authored=pinyin?authoredPinyinBoundaries(sourceText??text,pinyin):undefined,boundaries=authored?new Set([...authored].map(n=>n-offset)):undefined;
 const tokens=whole?[{text,chinese:/\p{Script=Han}/u.test(text)}]:dictionaryTokens(text,lookup.dictionary,undefined,boundaries);
 const marked=(value:string)=>anchor?value.split(anchor).map((part,i)=><span key={i}>{i>0&&<span className="wf-shared">{anchor}</span>}{part}</span>):value;
 return <span className="study-text">{tokens.map((token,i)=>token.chinese?<button type="button" className="study-word" key={i} lang="zh-Hans" onClick={e=>{e.stopPropagation();lookup.open(token.text,e.currentTarget);}}>{marked(token.text)}</button>:<span key={i}>{token.text}</span>)}</span>;
}
export function StudyLookupButton({text}:{text:string}){text=simplifiedDisplayText(text);const value=useContext(LookupContext),{locale}=useI18n();return value?<button type="button" className="study-lookup-button" aria-label={({en:'Definition',fr:'Définition',ru:'Значение',tr:'Anlam'})[locale]+': '+text} onClick={e=>{e.stopPropagation();value.open(text,e.currentTarget);}}><BookOpen size={17}/></button>:null;}
