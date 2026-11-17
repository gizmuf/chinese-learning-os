import bank from '../data/hsk3-practice.json';

type Voice = 'xiaoxiao' | 'xiaoyi' | 'yunxi';
export type ListenSpeakTask = {id:string; meaning:string; chunks:[hanzi:string,pinyin:string][]; voices:Voice[]};

type ChoiceDrill = {
  kind:'choice'; prompt:string; options:string[]; answer:string; text?:string; audio?:string; transcript?:string;
};
type CharacterDrill = {kind:'character'; text:string; answer:string; example:string; audio?:string};
type SentenceDrill = {kind:'sentence'; prompt:string; text:string; example:string};
export type MistakeDrill = ChoiceDrill | CharacterDrill | SentenceDrill;

export const listenSpeakTasks=bank.drill as ListenSpeakTask[];
export const hskMistakeDrills=bank.review as Record<string,MistakeDrill[]>;
export const practiceClip=(name:string)=>'/audio/hsk3-practice/'+name+'.mp3';
export const listenSpeakClip=(task:ListenSpeakTask,voice:Voice)=>practiceClip('drill-'+task.id+'-'+voice);

const practicePictureLabels:Record<string,string> = {
  '🧥':'外套','🌂':'雨伞','🎒':'书包','👟':'鞋','📱':'手机','👓':'眼镜','📕':'书','⏰':'闹钟',
};
export const practicePictureLabel=(option:string)=>practicePictureLabels[option];
