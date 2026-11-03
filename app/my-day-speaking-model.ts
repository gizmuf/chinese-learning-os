import data from '../data/my-day-speaking.json';
import {qwenCurriculumClip} from './qwen-curriculum-audio';
export const speakingVariants=data.variants;
export type SpeakingRow={hanzi:string;pinyin:string;english:string};
export function speakingRows(id:string){return speakingVariants.find(v=>v.id===id)?.sections.flatMap(s=>s.rows.map(row=>({...row,section:s.title})))??[];}
// Reuse the approved voice only for exact complete text, across either existing material.
export function speakingClip(text:string){return qwenCurriculumClip('my-day-01-v2',text)??qwenCurriculumClip('lesson09',text);}
export function speakingSource(id:string,index:number){return speakingRows(id)[index];}
export const speakingViewKey=(owner:string,id:string)=>'chinese-os-speaking-view-v1:'+encodeURIComponent(owner)+':'+id;
