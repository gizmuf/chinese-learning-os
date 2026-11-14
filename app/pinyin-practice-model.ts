import {tonePinyin} from './dictionary-source-model';
import type {Skill} from './content';
import {appendWritingOrigin, readWritingOrigin, type WritingOrigin} from './writing-navigation';
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
export function languagePracticeHref(skill: LanguageSkill, itemId: string, runId?: string, origin?: WritingOrigin) {
 const params = new URLSearchParams({practice: skill, item: itemId});
 if (runId) params.set('run', runId);
 appendWritingOrigin(params, origin);
 return '/?' + params;
}
export function languagePracticeRoute(search: string, pool: readonly {id: string}[]) {
 const params = new URLSearchParams(search), skill = params.get('practice');
 if (!(languageSkills as readonly (string | null)[]).includes(skill)) return null;
 const item = pool.find(item => item.id === params.get('item')) ?? pool[0];
 if (!item) return null;
 const runId = params.get('run');
 const origin = readWritingOrigin(params);
 return {skill: skill as LanguageSkill, itemId: item.id,
  ...(runId && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(runId) ? {runId} : {}),
  ...(origin ? {origin} : {})};
}
