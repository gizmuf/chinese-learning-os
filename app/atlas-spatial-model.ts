import {cloudWords,type CloudWord} from './atlas-cloud-model';
import {atlasByHanzi,componentById} from './atlas-model';
import {extendedCharacters,extendedComponent} from './atlas-cloud-extended';
import type {Locale} from './translate';
export type CardMode='focus'|'compare';
export type SpatialCharacter={hanzi:string;pinyin:string;meaning:Record<Locale,string>;components:string[]};
const pronunciationVocabulary=new Map<Locale,CloudWord[]>();
function pronunciationWords(locale:Locale){let words=pronunciationVocabulary.get(locale);if(!words){words=cloudWords(locale);pronunciationVocabulary.set(locale,words)}return words}
export type Pronunciation={text:string;pinyin:string;source:string;context:boolean;kind?:'word'|'sentence'};
export function spatialPage(total:number,index:number,size=12){const page=Math.floor(Math.max(0,index)/size),start=page*size;return {page,start,end:Math.min(total,start+size),pages:Math.ceil(total/size)}}
export function spatialCards(total:number,index:number,mode:CardMode){if(index<0||index>=total)return [];const start=mode==='compare'?Math.floor(index/4)*4:Math.max(0,index-2),end=mode==='compare'?Math.min(total,start+4):Math.min(total,index+3);return Array.from({length:end-start},(_,i)=>start+i)}
export function spatialNext(total:number,index:number,mode:CardMode,direction:-1|1){if(!total)return -1;if(index<0)return 0;const next=mode==='compare'?Math.floor(index/4)*4+direction*4:index+direction;return next<0||next>=total?index:next}
/** A horizontal gesture is independent of solving questions and never awards credit. */
export function spatialSwipe(dx:number,dy:number):-1|0|1{return Math.abs(dx)>=54&&Math.abs(dx)>Math.abs(dy)*1.3?(dx<0?1:-1):0}
export function wordPronunciation(word:CloudWord):Pronunciation{
 const id=word.item?.id??'atlas-'+word.atlasCharacterId;
 const prefix=id.startsWith('atlas-')?'/atlas/audio':id.startsWith('course05-')?'/course05/audio':id.startsWith('course04-')?'/course04/audio':id.startsWith('course03-')?'/course03/audio':'/audio';
 return {text:word.hanzi,pinyin:word.pinyin,source:prefix+'/'+encodeURIComponent(id)+'-word.mp3',context:false,kind:'word'};
}
export function sentencePronunciation(word:CloudWord):Pronunciation|undefined{if(!word.item)return;const audio=wordPronunciation(word);return {text:word.item.sentence,pinyin:word.item.sentencePinyin,source:audio.source.replace(/-word\.mp3$/,'-sentence.mp3'),context:false,kind:'sentence'}}
/** Use a real word recording for polyphonic/unrecorded isolated characters, labelled as context. */
export function characterPronunciation(hanzi:string,locale:Locale):Pronunciation|undefined{
 const words=pronunciationWords(locale).filter(w=>w.hanzi.includes(hanzi)),reviewed=atlasByHanzi.get(hanzi);
 const word=words.find(w=>w.hanzi===hanzi)??words.find(w=>w.hanzi===reviewed?.word)??words.find(w=>w.item)??words[0];
 return word?{...wordPronunciation(word),context:word.hanzi!==hanzi}:undefined;
}
export function componentPronunciation(id:string,locale:Locale):Pronunciation|undefined{const part=extendedComponent(id);if(!part)return;for(const h of [part.glyph,...part.variants,...(componentById.get(id)?.aliases??[])]){const audio=characterPronunciation(h,locale);if(audio)return audio}}
export type DictionaryEntry={phrase?:boolean;text:string;pinyin:string;meaning:string;word?:CloudWord;character?:string;audio?:Pronunciation};
export type StudyDictionary=Map<string,DictionaryEntry>;
export function studyDictionary(locale:Locale):StudyDictionary{
 const dictionary:StudyDictionary=new Map();
 for(const ch of extendedCharacters(locale)){dictionary.set(ch.hanzi,{text:ch.hanzi,pinyin:ch.reviewed?.pinyin??ch.readings.join(' / '),meaning:ch.reviewed?.meaning[locale]??ch.meaning,character:ch.hanzi,audio:characterPronunciation(ch.hanzi,locale)})}
 for(const ch of atlasByHanzi.values())if(!dictionary.has(ch.hanzi))dictionary.set(ch.hanzi,{text:ch.hanzi,pinyin:ch.pinyin,meaning:ch.meaning[locale],character:ch.hanzi,audio:characterPronunciation(ch.hanzi,locale)});
 // Keep a canonical word over an Atlas duplicate; separate homographs in the actual word list retain IDs/readings.
 for(const word of cloudWords(locale)){const existing=dictionary.get(word.hanzi);if(existing?.word)continue;dictionary.set(word.hanzi,{text:word.hanzi,pinyin:word.pinyin,meaning:word.meaning,word,character:Array.from(word.hanzi).length===1?word.hanzi:undefined,audio:wordPronunciation(word)})}
 return dictionary;
}
export function dictionaryTokens(text:string,dictionary:StudyDictionary){const tokens:{text:string;chinese:boolean}[]=[];let pos=0;const max=Math.max(1,...Array.from(dictionary.keys(),s=>s.length));while(pos<text.length){const point=String.fromCodePoint(text.codePointAt(pos)!);if(!/[\p{Script=Han}]/u.test(point)){const last=tokens.at(-1);if(last&&!last.chinese)last.text+=point;else tokens.push({text:point,chinese:false});pos+=point.length;continue}let found='';for(let length=Math.min(max,text.length-pos);length>0;length--){const candidate=text.slice(pos,pos+length);if(dictionary.has(candidate)&&!dictionary.get(candidate)?.phrase){found=candidate;break}}const token=found||point;tokens.push({text:token,chinese:true});pos+=token.length}return tokens}

export type RecognitionQuestion={id:string;target:string;word:CloudWord;masked:string;choices:string[]};
/** Short local recognition only: no server target IDs or independent-recall grades. */
export function recognitionQuestions(family:readonly {hanzi:string}[],locale:Locale):RecognitionQuestion[]{
 if(family.length<2)return [];
 const vocabulary=pronunciationWords(locale),questions:RecognitionQuestion[]=[];
 for(let i=0;i<family.length;i++){
  const target=family[i].hanzi,reviewed=atlasByHanzi.get(target);
  const words=vocabulary.filter(word=>word.hanzi.includes(target));
  const word=words.find(w=>w.hanzi===reviewed?.word)??words.find(w=>w.hanzi===target)??words.find(w=>w.item)??words[0];
  if(!word)continue;
  const start=Math.floor(i/4)*4,choices=family.slice(start,start+4).map(ch=>ch.hanzi);
  // The final group still has four alternatives when the family is large enough.
  for(let j=start-1;choices.length<Math.min(4,family.length)&&j>=0;j--)choices.push(family[j].hanzi);
  for(let j=start+4;choices.length<Math.min(4,family.length)&&j<family.length;j++)choices.push(family[j].hanzi);
  // Stable rotation breaks the link between answer position and prompt order.
  const shift=target.codePointAt(0)!%choices.length;
  questions.push({id:target+'|'+word.id,target,word,masked:word.hanzi.split(target).join('□'),choices:[...choices.slice(shift),...choices.slice(0,shift)]});
 }
 // Interleave the questions inside each four-character block, rather than exposing list order.
 return questions.sort((a,b)=>Math.floor(family.findIndex(ch=>ch.hanzi===a.target)/4)-Math.floor(family.findIndex(ch=>ch.hanzi===b.target)/4)||a.target.codePointAt(0)!%7-b.target.codePointAt(0)!%7);
}
export type RecognitionAnswer={choice:string;correct:boolean};
export function checkRecognition(question:RecognitionQuestion,choice:string,previous:RecognitionAnswer|undefined):RecognitionAnswer|undefined{
 return previous??(question.choices.includes(choice)?{choice,correct:choice===question.target}:undefined);
}
export function pronunciationPresentation(recording:Pronunciation,target?:string){return {kind:recording.kind==='sentence'?'sentence':recording.context?'word':target&&recording.text===target?'character':'word',text:recording.text,pinyin:recording.pinyin,target:recording.context?target:undefined} as const}
export type FamilyDirectoryEntry={id:string;glyph:string;label:string;members:string[]};
/** Every recursive source part is browsable; unsplit forms are valid singleton families. */
export function spatialFamilyDirectory(locale:Locale):FamilyDirectoryEntry[]{
 const nodes=extendedCharacters(locale,3),keys=new Set(nodes.flatMap(ch=>ch.components.length?ch.components:[ch.hanzi]));
 const canonical=(glyph:string)=>[...componentById.values()].find(p=>p.glyph===glyph||p.aliases.includes(glyph))?.id??glyph;
 const ids=[...new Set([...keys].map(canonical))];
 return ids.map(id=>{const part=extendedComponent(id)!;const members=nodes.filter(ch=>part.variants.some(h=>ch.hanzi===h||ch.components.includes(h))).map(ch=>ch.hanzi);return {id,glyph:part.glyph,label:part.label[locale],members}}).filter(group=>group.members.length).sort((a,b)=>b.members.length-a.members.length||a.glyph.localeCompare(b.glyph,'zh'));
}
