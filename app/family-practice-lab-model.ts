import type {CloudWord} from './atlas-cloud-model';
export type ContrastPair={place:CloudWord;person:CloudWord};
/** Editorial examples are references into the selected canonical inventory, never a vocabulary copy. */
const contrasts=[['大学','大学生'],['小学','小学生'],['中学','中学生']] as const;
export function familyContrastPairs(words:readonly CloudWord[],anchor:string):ContrastPair[]{
 if(anchor!=='学')return [];
 return contrasts.flatMap(([a,b])=>{const place=words.find(w=>w.hanzi===a),person=words.find(w=>w.hanzi===b);return place&&person?[{place,person}]:[]});
}
export type RecallPrompt={word:CloudWord;pair:ContrastPair;role:'place'|'person'};
/** Alternate both the example and the direction, reproducibly; one prompt per canonical word. */
export function familyRecallRound(pairs:readonly ContrastPair[]):RecallPrompt[]{
 return [...pairs.map((pair,i)=>({word:i%2?pair.person:pair.place,pair,role:(i%2?'person':'place') as 'place'|'person'})),...pairs.map((pair,i)=>({word:i%2?pair.place:pair.person,pair,role:(i%2?'place':'person') as 'place'|'person'}))];
}
export type RecallResult={prompt:RecallPrompt;correct:boolean;assisted:boolean;answer:string};
export function checkFamilyRecall(answer:string,word:Pick<CloudWord,'hanzi'>){return answer.normalize('NFC').trim()===word.hanzi.normalize('NFC')}
export function familyRecallResult(prompt:RecallPrompt,answer:string,assisted=false):RecallResult{return {prompt,answer,assisted,correct:!assisted&&checkFamilyRecall(answer,prompt.word)}}
export function retryFamilyMistakes(results:readonly RecallResult[]){return results.filter(r=>!r.correct).map(r=>r.prompt)}
