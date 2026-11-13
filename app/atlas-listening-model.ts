import { wordBuilds, wordFamilies, type FamilyId } from "./atlas-workshop-data";
import { workshopAudioId, workshopRecording } from "./atlas-workshop-audio";
import type { AtlasCopy } from "./atlas-data";
import type { Locale } from "./translate";
import { atlasCards, type AtlasEvent } from "./atlas-learning";
export type ListeningKind = "word" | "sentence";
export type ListeningTarget = { id: string; kind: ListeningKind; families: FamilyId[]; hanzi: string; pinyin: string; meaning: AtlasCopy; recording: string };
export const listeningTargets: ListeningTarget[] = wordBuilds.flatMap(word => (["word", "sentence"] as const).flatMap(kind => {
 const recording = workshopRecording(word, kind);
 if (!recording) return [];
 return [{id:workshopAudioId(word.hanzi)+"-"+kind,kind,families:wordFamilies(word),hanzi:kind==="word"?word.hanzi:word.example!.hanzi,pinyin:kind==="word"?word.pinyin:word.example!.pinyin,meaning:kind==="word"?word.meaning:word.example!.meaning,recording}];
}));
function randomFor(id:string){let seed=Array.from(id).reduce((a,c)=>(Math.imul(a,31)+c.charCodeAt(0))>>>0,17);return()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
function shuffle<T>(items:readonly T[],random:()=>number){const copy=[...items];for(let i=copy.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[copy[i],copy[j]]=[copy[j],copy[i]];}return copy;}
// IDs and order are stable across language changes; discard labels duplicated in
// ANY locale so a translated question cannot silently gain two correct options.
export function listeningOptions(target:ListeningTarget,locale:Locale){
 const random=randomFor(target.id), used=new Map<string,Set<string>>(["en","fr","ru"].map(l=>[l,new Set([target.meaning[l as Locale]])]));
 const choices=[target];
 const candidates=shuffle(listeningTargets.filter(t=>t.kind===target.kind&&t.id!==target.id),random).sort((a,b)=>Number(b.families.some(f=>target.families.includes(f)))-Number(a.families.some(f=>target.families.includes(f))));
 for(const candidate of candidates){
  if(["en","fr","ru"].some(l=>used.get(l)!.has(candidate.meaning[l as Locale])))continue;
  choices.push(candidate);for(const l of ["en","fr","ru"])used.get(l)!.add(candidate.meaning[l as Locale]);if(choices.length===4)break;
 }
 return shuffle(choices,random).map(t=>({id:t.id,label:t.meaning[locale]}));
}
export function listeningPool(kind:ListeningKind,family:FamilyId|"all"){return listeningTargets.filter(t=>t.kind===kind&&(family==="all"||t.families.includes(family)));}
export function listeningQueue(pool:readonly ListeningTarget[],events:AtlasEvent[],now=Date.now(),random=Math.random){
 const cards=atlasCards(events);
 const due=pool.filter(t=>cards[t.id+":sound"]&&new Date(cards[t.id+":sound"].due).getTime()<=now);
 const fresh=pool.filter(t=>!cards[t.id+":sound"]);
 const later=pool.filter(t=>cards[t.id+":sound"]&&new Date(cards[t.id+":sound"].due).getTime()>now);
 return [...shuffle(due,random),...shuffle(fresh,random),...shuffle(later,random)].slice(0,8);
}
