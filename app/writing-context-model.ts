import type {DictionaryEntry} from './atlas-spatial-model';
import type {DictionaryContext} from './dictionary-source-model';
/** A source sentence stays usable for every nested glyph; readings are selected only by the authored alignment. */
export function sourceContext(element:HTMLElement|null):DictionaryContext|undefined{
 const source=element?.closest<HTMLElement>('[data-study-sentence]');
 if(!source?.dataset.studySentence)return;
 const text=source.dataset.studySentence,pinyin=source.dataset.studyPinyin??'',clip=source.dataset.studyAudio;return {text,pinyin,meaning:source.dataset.studyMeaning??'',sourceId:source.dataset.studySourceId||source.id||undefined,...(clip?.startsWith('/often-confused/audio/')?{audio:{text,pinyin,source:clip,context:true,kind:'sentence' as const}}:{})};
}
/** Broader senses never inherit an unrelated isolated clip. Exact source audio remains separately labelled. */
export function contextualAudio(entry:DictionaryEntry,clip?:{source:string}):DictionaryEntry{
 if(!entry.contextual||!clip)return entry;
 const sentence={text:entry.contextual.text,pinyin:entry.contextual.pinyin,source:clip.source,context:true,kind:'sentence' as const};
 return {...entry,contextual:{...entry.contextual,audio:sentence},audio:entry.audio??sentence};
}

const readingKey=(value:string)=>value.normalize('NFC').toLowerCase().replace(/[^\p{Letter}\p{Mark}]/gu,'');
/** A word-kind route can still represent the same authored character sense (e.g. 电). */
export function atlasWritingEntry(origin:DictionaryEntry,item:{hanzi:string;pinyin:string;english:string},kind:'word'|'character'):DictionaryEntry{
 const value:DictionaryEntry={text:item.hanzi,pinyin:item.pinyin,meaning:item.english,...(Array.from(item.hanzi).length===1?{character:item.hanzi}:{})};
 if(item.hanzi===origin.text&&(kind==='character'||readingKey(item.pinyin)===readingKey(origin.pinyin)))return origin;
 const context=origin.contextual;if(!context?.text.includes(item.hanzi))return value;
 // A deliberate different word reading is a separate sense; do not present the origin as its example.
 if(kind==='word'&&Array.from(item.hanzi).length===1&&item.hanzi===origin.text)return value;
 return {...value,contextual:context};
}
