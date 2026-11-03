import lesson from '../data/shuoshuo-morning.json';
import manifest from '../data/shuoshuo-morning-audio.json';
export type ShuoshuoClip={source:string;text:string;sha256:string;provider:string;voice?:string;generationRate?:string;durationSeconds?:number;synthetic?:boolean;validated?:boolean};
export type ShuoshuoAudio={words:Record<string,ShuoshuoClip>;sentences:Record<string,ShuoshuoClip>};
const audio=manifest as ShuoshuoAudio;
function exact(clip:ShuoshuoClip|undefined,text:string){
 return clip?.text===text&&/^[a-f0-9]{64}$/.test(clip.sha256)&&/^\/(?:audio|course\d{2}\/audio)\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.mp3$/.test(clip.source)?clip:undefined;
}
export function selectShuoshuoSentence(data:ShuoshuoAudio,id:string,text:string){
 const clip=exact(data.sentences[id],text);
 return clip?.validated&&clip.synthetic&&clip.voice==='zh-CN-XiaoxiaoNeural'&&clip.generationRate==='-10%'&&(clip.durationSeconds??0)>0?clip:undefined;
}
export function shuoshuoSentenceAudio(id:string,text:string){return selectShuoshuoSentence(audio,id,text);}
export function shuoshuoSentenceAudioForText(text:string){const row=lesson.sentences.find(row=>row.hanzi===text);return row?shuoshuoSentenceAudio(row.id,text):undefined;}
export function shuoshuoWordAudio(text:string){return lesson.practiceTargets.some(row=>row.text===text)?exact(audio.words[text],text):undefined;}
export const shuoshuoAudioCounts={words:lesson.practiceTargets.filter(row=>shuoshuoWordAudio(row.text)).length,sentences:lesson.sentences.filter(row=>shuoshuoSentenceAudio(row.id,row.hanzi)).length};
