'use client';
import {useEffect,useSyncExternalStore} from 'react';
import {useI18n} from './i18n';
import {loadHskLevelResource} from './dictionary-client';
import {hskClassification,hskLevelIndex,type HskIndex} from './hsk-level-model';
import './hsk-badge.css';
type Snapshot={state:'loading'|'error';index?:never}|{state:'ready';index:HskIndex};
const initial:Snapshot={state:'loading'};let snapshot:Snapshot=initial,pending:Promise<void>|undefined;
const listeners=new Set<()=>void>();
function subscribe(fn:()=>void){listeners.add(fn);return()=>{listeners.delete(fn);};}
function load(){if(snapshot.state==='ready')return;if(!pending)pending=loadHskLevelResource().then(raw=>{snapshot={state:'ready',index:hskLevelIndex(raw)};}).catch(()=>{snapshot={state:'error'};}).finally(()=>{pending=undefined;for(const fn of listeners)fn();});}
/** The badges and related-entry ordering use the same official metadata and request. */
export function useHskLevels(){
 const data=useSyncExternalStore(subscribe,()=>snapshot,()=>initial);
 useEffect(load,[]);
 return data;
}
/** Shared, optional metadata for browsing. Never a lookup boundary or SRS hint. */
export default function HskBadge({text,kind,pinyin}:{text:string;kind?:'word'|'character';pinyin?:string}){
 const {locale}=useI18n(),data=useHskLevels();
 if(!/^\p{Script=Han}+$/u.test(text))return null;
 const c={en:{word:'HSK2025 vocabulary levels for listed word senses',character:'HSK2025 recognition-character level',outside:'Not listed in the official HSK2025 table; dictionary exploration remains unrestricted.',loading:'Loading HSK level',error:'HSK information unavailable; reopen the definition to retry.'},fr:{word:'Niveaux du vocabulaire HSK2025 pour les sens répertoriés',character:'Niveau de reconnaissance du caractère HSK2025',outside:'Absent de la liste officielle HSK2025 ; exploration du dictionnaire sans restriction.',loading:'Chargement du niveau HSK',error:'Niveau HSK indisponible ; rouvrez la définition pour réessayer.'},ru:{word:'Уровни словарных значений по HSK2025',character:'Уровень распознавания иероглифа HSK2025',outside:'Нет в официальном списке HSK2025; просмотр словаря не ограничен.',loading:'Загрузка уровня HSK',error:'Уровень HSK недоступен; откройте словарь заново.'},tr:{word:'HSK2025 listelenen kelime anlamlarının seviyeleri',character:'HSK2025 karakter tanıma seviyesi',outside:'Resmî HSK2025 listesinde yok; sözlük keşfi sınırsızdır.',loading:'HSK seviyesi yükleniyor',error:'HSK bilgisi kullanılamıyor; yeniden denemek için tanımı tekrar aç.'}}[locale];
 const classification=data.state==='ready'?hskClassification(data.index,text,kind,pinyin):null;
 const statusText={
  en:{outside:'Out of scope',absent:'Not listed in HSK 2025 levels 1–9',unresolved:'HSK unresolved',needsReading:'A specific reading is needed to identify the listed equivalent.',equivalent:'equivalent'},
  fr:{outside:'Hors programme',absent:'Absent du programme HSK 2025 des niveaux 1 à 9',unresolved:'Niveau HSK indéterminé',needsReading:'Une lecture précise est nécessaire pour identifier l’équivalent répertorié.',equivalent:'équivalent'},
  ru:{outside:'Вне программы',absent:'Не указано в программе HSK 2025 уровней 1–9',unresolved:'Уровень HSK не определён',needsReading:'Для определения эквивалента требуется конкретное чтение.',equivalent:'эквивалент'},
  tr:{outside:'Kapsam dışı',absent:'HSK 2025 seviye 1–9 listelerinde yer almıyor',unresolved:'HSK düzeyi belirsiz',needsReading:'Listelenen eşdeğeri belirlemek için okunuş gerekir.',equivalent:'eşdeğer'},
 }[locale];
 const levels=classification?.levels??[];
 const number=levels.map(value=>'HSK '+value.replace('-','–')).join(' · ');
 const equivalent=classification?.equivalent;
 const label=data.state==='loading'?'HSK…':data.state==='error'?'HSK ?':classification?.unresolved
  ? statusText.unresolved : levels.length ? number+(equivalent?' ≈':'') : statusText.outside;
 const levelTitle=classification?.kind==='character'?c.character:c.word;
 const title=data.state==='loading'?c.loading:data.state==='error'?c.error:classification?.unresolved
  ? statusText.needsReading : !levels.length ? statusText.absent : equivalent ? levelTitle+' · '+statusText.equivalent+' '+equivalent : levelTitle;
 return <small lang={locale} className="dictionary-hsk-badge" title={title} data-hsk-kind={classification?.kind}
  data-hsk-equivalent={equivalent} aria-label={equivalent?number+' · '+statusText.equivalent+' '+equivalent:label}>{label}</small>;
}
