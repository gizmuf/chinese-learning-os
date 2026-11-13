import data from '../data/my-day-speaking.json';
import {qwenCurriculumClip} from './qwen-curriculum-audio';
import audio from '../data/my-day-speaking-audio.json';
export const speakingVariants=data.variants;
export type SpeakingRow={hanzi:string;pinyin:string;english:string};
export function speakingRows(id:string){return speakingVariants.find(v=>v.id===id)?.sections.flatMap(s=>s.rows.map(row=>({...row,section:s.title})))??[];}
export type SpeakingAudioClip={text:string;source:string;voice:string;generationRate:string;sha256:string;durationSeconds:number;validated:boolean};
export type SpeakingAudioManifest={status:string;voice:string;generationRate:string;recordings:SpeakingAudioClip[]};
/** Only exact, validated full sentences can fill gaps in the existing Qwen corpus. */
export function selectSpeakingFallback(manifest:SpeakingAudioManifest,text:string){
 if(manifest.status!=='validated'||manifest.voice!=='zh-CN-XiaoxiaoNeural'||manifest.generationRate!=='-10%')return;
 return manifest.recordings.find(clip=>clip.text===text&&clip.validated&&clip.voice===manifest.voice&&clip.generationRate===manifest.generationRate&&clip.durationSeconds>0&&/^[a-f0-9]{64}$/.test(clip.sha256)&&/^\/audio\/my-day-speaking\/[a-f0-9]{64}\.mp3$/.test(clip.source));
}
export function speakingClip(text:string){return qwenCurriculumClip('my-day-01-v2',text)??qwenCurriculumClip('lesson09',text)??selectSpeakingFallback(audio,text);}
export function speakingSource(id:string,index:number){return speakingRows(id)[index];}
export const speakingViewKey=(owner:string,id:string)=>'chinese-os-speaking-view-v1:'+encodeURIComponent(owner)+':'+id;
