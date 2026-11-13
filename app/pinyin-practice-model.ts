import {tonePinyin} from './dictionary-source-model';
import type {Skill} from './content';
export const languageSkills=['pinyin','hanzi-from-pinyin','ime'] as const;
export type LanguageSkill=typeof languageSkills[number];
export const isLanguageSkill=(skill:Skill):skill is LanguageSkill=>(languageSkills as readonly string[]).includes(skill);
/** Preserve ü and every tone; normalize typography and numbered input only. */
export const normalizedPinyin=(value:string)=>{const converted=tonePinyin(value.replace(/u:/gi,'ü').replace(/v/gi,'ü')).normalize('NFC');return /[0-9]/.test(converted)?'':converted.toLowerCase().replace(/[^\p{Letter}\p{Mark}]/gu,'');};
export const normalizedHanzi=(value:string)=>value.normalize('NFC').replace(/[\s\p{P}]/gu,'');
export const untonedPinyin=(value:string)=>value.toLowerCase().replace(/ü/g,'v').normalize('NFD').replace(/\p{M}/gu,'').replace(/v/g,'ü').replace(/[0-5]/g,'');
export function languageAnswerCorrect(skill:LanguageSkill,answer:string,target:{hanzi:string;pinyin:string}){
 if(skill==='pinyin')return !!normalizedPinyin(answer)&&normalizedPinyin(answer)===normalizedPinyin(target.pinyin);
 return /\p{Script=Han}/u.test(answer)&&normalizedHanzi(answer)===normalizedHanzi(target.hanzi);
}
export const canSubmitComposition=(composing:boolean,native:{isComposing?:boolean;keyCode?:number})=>!composing&&!native.isComposing&&native.keyCode!==229;
export const languagePracticeHref=(skill:LanguageSkill,itemId:string,runId?:string)=>'/?'+new URLSearchParams({practice:skill,item:itemId,...(runId?{run:runId}:{})});
export function languagePracticeRoute(search:string,pool:{id:string}[]){const p=new URLSearchParams(search),skill=p.get('practice');if(!(languageSkills as readonly (string|null)[]).includes(skill))return null;const item=pool.find(item=>item.id===p.get('item'))??pool[0];const run=p.get('run');return item?{skill:skill as LanguageSkill,itemId:item.id,...(run&&/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(run)?{runId:run}:{})}:null;}
