import {cloudWords,type CloudLevel,type CloudWord} from './atlas-cloud-model';
import {extendedCharacters} from './atlas-cloud-extended';
import {lessons} from './content';
import {translate,type Locale} from './translate';
import {familyWords,validWordAnchor} from './word-family-model';
import {journeyText} from './family-journey-copy';

export type JourneyWord=CloudWord&{englishMeaning:string};
export type JourneyGroup={id:string;level:1|2|3|null;kind:'character'|'topic';anchor:string;reading:string;englishTitle:string;title:string;words:JourneyWord[]};
type PlanGroup=Omit<JourneyGroup,'title'|'words'>&{wordIds:string[]};
const preferred=['学','电','天','人','家','看','生','子','上','下'];
const dictionary=new Map(extendedCharacters('en',3).map(ch=>[ch.hanzi,ch]));
const plans=new Map<CloudLevel,readonly PlanGroup[]>();
const englishVocabulary=new Map(cloudWords('en').map(word=>[word.id,word]));

/** A public-data-only plan: one canonical identity, one main location, stable across languages. */
function journeyPlan(scope:CloudLevel):readonly PlanGroup[]{
 const cached=plans.get(scope);if(cached)return cached;
 const vocabulary=cloudWords('en',scope),groups:PlanGroup[]=[];
 for(const level of [1,2,3,null] as const){
  const bucket=vocabulary.filter(w=>w.level===level);if(!bucket.length)continue;
  const remaining=new Set(bucket.map(w=>w.id));
  const candidates=[...new Set(bucket.flatMap(w=>Array.from(w.hanzi).filter(validWordAnchor)))];
  const members=new Map(candidates.map(anchor=>[anchor,bucket.filter(w=>w.hanzi.includes(anchor))]));
  const track=level??'extra';let families=0;
  function characterGroup(anchor:string){
   const node=dictionary.get(anchor),standalone=bucket.find(w=>w.hanzi===anchor);
   const reading=standalone?.pinyin??node?.reviewed?.pinyin??node?.readings.join(' / ');
   const meaning=standalone?.meaning??node?.meaning;
   const words=(members.get(anchor)??[]).filter(w=>remaining.has(w.id));
   if(words.length<3||!reading||!meaning)return false;
   const rank=new Map(familyWords(anchor,'en',scope).map((w,i)=>[w.id,i]));words.sort((a,b)=>rank.get(a.id)!-rank.get(b.id)!);
   groups.push({id:`journey-${track}-character-${anchor.codePointAt(0)!.toString(16)}`,level,kind:'character',anchor,reading,englishTitle:meaning,wordIds:words.map(w=>w.id)});
   words.forEach(w=>remaining.delete(w.id));families++;return true;
  }
  for(const anchor of preferred){if(families>=10)break;characterGroup(anchor)}
  while(families<10){
   const ranked=candidates.map(anchor=>({anchor,count:(members.get(anchor)??[]).filter(w=>remaining.has(w.id)).length})).filter(row=>row.count>=3).sort((a,b)=>b.count-a.count);
   const next=ranked.find(row=>{const node=dictionary.get(row.anchor);return node?.readings.length||bucket.some(w=>w.hanzi===row.anchor)});
   if(!next||!characterGroup(next.anchor))break;
  }
  for(const lesson of [...lessons,{id:'atlas-other',title:'More useful words'}]){
   const words=bucket.filter(w=>remaining.has(w.id)&&(lesson.id==='atlas-other'||w.item?.lesson===lesson.id));
   if(!words.length)continue;
   groups.push({id:`journey-${track}-topic-${lesson.id}`,level,kind:'topic',anchor:'',reading:'',englishTitle:lesson.title,wordIds:words.map(w=>w.id)});
   words.forEach(w=>remaining.delete(w.id));
  }
 }
 plans.set(scope,groups);return groups;
}
export function familyJourney(locale:Locale,scope:CloudLevel=3):JourneyGroup[]{
 const vocabulary=new Map(cloudWords(locale,scope).map(word=>[word.id,word]));
 return journeyPlan(scope).map(group=>{
  const {wordIds,...meta}=group;
  return {...meta,title:group.kind==='topic'?(group.englishTitle==='More useful words'?journeyText(locale,'other'):translate(group.englishTitle,locale)):group.englishTitle,
   words:wordIds.map(id=>({...vocabulary.get(id)!,englishMeaning:englishVocabulary.get(id)!.meaning}))};
 });
}
export function journeyCoverage(groups:readonly JourneyGroup[]){
 const words=groups.flatMap(group=>group.words),characters=new Set(words.flatMap(w=>Array.from(w.hanzi).filter(validWordAnchor)));
 return {words:words.length,characters:characters.size,groups:groups.length,tracks:([1,2,3,null] as const).map(level=>({level,groups:groups.filter(g=>g.level===level),count:words.filter(w=>w.level===level).length})).filter(track=>track.count>0)};
}
export function journeySelection(groups:readonly JourneyGroup[],id:string){for(const group of groups){const word=group.words.find(w=>w.id===id);if(word)return {group,word}}return null}
