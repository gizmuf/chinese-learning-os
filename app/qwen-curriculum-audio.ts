import manifest from '../data/qwen-curriculum-audio.json';

export type QwenCurriculumClip={material:'my-day-01-v2'|'lesson09';id:string;text:string;source:string;sha256:string;durationSeconds:number;validated:boolean};
export type QwenCurriculumManifest={model:string;voice:string;region:string;status:string;recordings:QwenCurriculumClip[]};
const audio=manifest as QwenCurriculumManifest;
/** A pending, mismatched, or incomplete clip must never replace a known recording. */
export function selectQwenCurriculumClip(data:QwenCurriculumManifest,material:QwenCurriculumClip['material'],text:string,id?:string):QwenCurriculumClip|undefined {
  if(data.status!=='validated'||data.model!=='qwen-audio-3.1-tts-plus'||data.voice!=='longanhuan_v3.1'||data.region!=='cn-beijing')return;
  return data.recordings.find(clip=>clip.material===material&&clip.text===text&&(id===undefined||clip.id===id)&&clip.validated&&clip.durationSeconds>0&&/^[a-f0-9]{64}$/.test(clip.sha256)&&/^\/audio\/qwen-curriculum\/[a-f0-9]{64}\.wav$/.test(clip.source));
}
export const qwenCurriculumClip=(material:QwenCurriculumClip['material'],text:string,id?:string)=>selectQwenCurriculumClip(audio,material,text,id);
export const hasQwenCurriculumAudio=(material:QwenCurriculumClip['material'])=>audio.recordings.some(clip=>!!qwenCurriculumClip(material,clip.text,clip.id));
export const qwenSyntheticLabel={en:'Synthetic study voice · Qwen',fr:'Voix de synthèse pour l’étude · Qwen',ru:'Синтезированный голос для учёбы · Qwen',tr:'Sentetik çalışma sesi · Qwen'};
