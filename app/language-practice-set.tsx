'use client';
import {useState} from 'react';
import LanguagePractice from './language-practice';
import {languageSkills,type LanguageSkill} from './pinyin-practice-model';
import {skillNames,type Item} from './content';
import type {LearningEvent} from './learning';
export default function LanguagePracticeSet(props:{item:Item;db:IDBDatabase|null;record:(event:LearningEvent)=>Promise<void>;penOnly:boolean;setPenOnly:(value:boolean)=>void;notify:(text:string)=>void;supported:boolean}){
 const [skill,setSkill]=useState<LanguageSkill>('pinyin');
 return <section><div className="language-studio-tabs" role="group" aria-label="Language practice direction">{languageSkills.map(value=><button type="button" key={value} className={skill===value?'primary':'secondary'} aria-pressed={skill===value} onClick={()=>setSkill(value)}>{skillNames[value]}</button>)}</div><LanguagePractice key={props.item.id+':'+skill} {...props} skill={skill}/></section>;
}
