import {z} from 'zod';
import {createEmptyCard,fsrs,generatorParameters,type Card} from 'ts-fsrs';
import {atlasCharacters} from './atlas-model';
import {cloudWords,familyForComponents} from './atlas-cloud-model';
import {extendedCharacters,extendedComponent,extendedFamily} from './atlas-cloud-extended';
import {cloudComponentIds} from './atlas-cloud-connections';
import type {RecognitionQuestion} from './atlas-spatial-model';
import type {Locale} from './translate';
const targets=new Set([...extendedCharacters('en',3).map(c=>c.hanzi),...atlasCharacters.map(c=>c.hanzi)]);
const words=new Map(cloudWords('en').map(w=>[w.id,w]));
const localizedWords=new Map<Locale,Map<string,ReturnType<typeof cloudWords>[number]>>([['en',words]]);
function wordMap(locale:Locale){let result=localizedWords.get(locale);if(!result){result=new Map(cloudWords(locale).map(word=>[word.id,word]));localizedWords.set(locale,result)}return result}
const families=new Map<string,Set<string>>();
function members(part:string){let set=families.get(part);if(!set){set=new Set([...extendedFamily([part],'en',3).map(c=>c.hanzi),...cloudComponentIds(part).flatMap(id=>familyForComponents([id]).map(c=>c.hanzi))]);families.set(part,set)}return set}
export const recognitionAttemptSchema=z.object({version:z.literal(1),id:z.string().uuid(),target:z.string().refine(h=>targets.has(h)),partId:z.string().max(40).refine(id=>!!extendedComponent(id)),wordId:z.string().max(100),choices:z.array(z.string()).min(2).max(4),choice:z.string(),correct:z.boolean(),at:z.number().int().nonnegative()}).strict().superRefine((e,ctx)=>{const word=words.get(e.wordId),set=members(e.partId);if(!word?.hanzi.includes(e.target)||new Set(e.choices).size!==e.choices.length||!e.choices.includes(e.target)||!e.choices.includes(e.choice)||e.choices.some(h=>!set.has(h))||e.correct!==(e.choice===e.target))ctx.addIssue({code:'custom',message:'Invalid recognition attempt context or result'})});
export type RecognitionAttempt=z.infer<typeof recognitionAttemptSchema>;
export type StoredRecognitionAttempt=RecognitionAttempt&{synced:boolean};
export type PracticeQuestion=RecognitionQuestion&{partId:string};
export function plainRecognitionAttempt(row:RecognitionAttempt|StoredRecognitionAttempt){const {synced:_,...event}=row as StoredRecognitionAttempt;return recognitionAttemptSchema.parse(event)}
export function sameRecognitionAttempt(a:RecognitionAttempt|StoredRecognitionAttempt,b:RecognitionAttempt|StoredRecognitionAttempt){return JSON.stringify(plainRecognitionAttempt(a))===JSON.stringify(plainRecognitionAttempt(b))}
export function newRecognitionAttempt(question:PracticeQuestion,choice:string,at=Date.now()):RecognitionAttempt{return recognitionAttemptSchema.parse({version:1,id:crypto.randomUUID(),target:question.target,partId:question.partId,wordId:question.word.id,choices:question.choices,choice,correct:choice===question.target,at})}
const scheduler=fsrs(generatorParameters({request_retention:.9,enable_fuzz:false}));
export type RecognitionCharacter={target:string;checked:number;correct:number;wrong:number;dueAt:number;latest:RecognitionAttempt;card:Card};
export function recognitionSummary(events:readonly RecognitionAttempt[],now=Date.now()){
 const seen=new Set<string>(),characters=new Map<string,RecognitionCharacter>();let correct=0,wrong=0;
 for(const event of [...events].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id))){if(seen.has(event.id))continue;seen.add(event.id);const previous=characters.get(event.target),card=scheduler.next(previous?.card??createEmptyCard(new Date(event.at)),new Date(event.at),event.correct?3:1).card;
  characters.set(event.target,{target:event.target,checked:(previous?.checked??0)+1,correct:(previous?.correct??0)+(event.correct?1:0),wrong:(previous?.wrong??0)+(event.correct?0:1),dueAt:new Date(card.due).getTime(),latest:event,card});if(event.correct)correct++;else wrong++;
 }
 const all=[...characters.values()].sort((a,b)=>a.dueAt-b.dueAt||a.target.localeCompare(b.target));return {checked:seen.size,correct,wrong,characters:all,difficult:all.filter(ch=>!ch.latest.correct),due:all.filter(ch=>ch.dueAt<=now)};
}
export function recognitionReviewQuestions(events:readonly RecognitionAttempt[],kind:'difficult'|'due',locale:Locale,now=Date.now()):PracticeQuestion[]{
 const summary=recognitionSummary(events,now),localized=wordMap(locale);return summary[kind].flatMap(ch=>{const e=ch.latest,word=localized.get(e.wordId);return word?[{id:e.target+'|'+e.wordId,target:e.target,partId:e.partId,word,masked:word.hanzi.split(e.target).join('□'),choices:e.choices}]:[]});
}
export function localizeRecognitionQuestion(question:PracticeQuestion,locale:Locale):PracticeQuestion{const word=wordMap(locale).get(question.word.id);return word?{...question,word}:question}
