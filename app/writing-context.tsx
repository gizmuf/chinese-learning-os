'use client';
import {useMemo} from 'react';
import {Volume2} from 'lucide-react';
import {useI18n} from './i18n';
import {studyDictionary,type DictionaryEntry} from './atlas-spatial-model';
import extraContext from '../data/writing-character-context.json';
import {playRecording} from './audio';
export function WritingCharacterContext({character,entry,notify=()=>{}}:{character:string;entry?:DictionaryEntry;notify?:(s:string)=>void}){
 const {locale,t}=useI18n();const dictionary=useMemo(()=>studyDictionary(locale),[locale]);const extra=extraContext.characters.find(v=>v.text===character),base=entry??dictionary.get(character);const value=base||extra?{text:character,pinyin:base?.pinyin||extra?.pinyin||'',meaning:base?.meaning||extra?.meaning||'',audio:entry?.audio??(extra?{text:extra.text,pinyin:extra.pinyin,source:extra.audio,context:false}:base?.audio)}:undefined;
 return <div className="writing-context"><strong lang="zh-Hans">{character}</strong><div><p className="pinyin">{value?.pinyin}</p>{extra&&!dictionary.has(character)&&locale!=='en'&&<small lang="en">Source definition (English)</small>}<p>{value?.meaning??t('Not yet in this study dictionary.')}</p></div>{value?.audio&&<button type="button" className="audio-button" aria-label={t('Listen')+': '+value.audio.text} onClick={()=>playRecording(value.audio!.source,notify)}><Volume2 size={18}/>{t('Listen')}</button>}</div>;
}
