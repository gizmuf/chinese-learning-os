import data from '../data/often-confused.json';
import type {Locale} from './translate';
import type {Pronunciation,StudyDictionary} from './atlas-spatial-model';

export const confusionGroups=data.groups;
export const confusionItems=data.items;
export function contrastCategories(group:typeof confusionGroups[number]){return group.categories;}
export function confusionRecording(id:string,kind:'word'|'sentence'):Pronunciation{
 const item=confusionItems.find(v=>v.id===id);
 if(!item)throw new Error('Unknown contrast item');
 return {text:kind==='word'?item.hanzi:item.sentence,pinyin:kind==='word'?item.pinyin:item.sentencePinyin,source:`/often-confused/audio/${id}-${kind}.mp3`,context:false,kind};
}
// The selected sense/reading belongs to this comparison, never to every use of a character.
export function confusionDictionary(base:StudyDictionary,locale:Locale):StudyDictionary{
 const dictionary=new Map(base);
 for(const item of confusionItems)dictionary.set(item.hanzi,{text:item.hanzi,pinyin:item.pinyin,meaning:item.meaning[locale],character:item.hanzi,audio:confusionRecording(item.id,'word')});
 return dictionary;
}
