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
/** Shared, optional metadata for browsing. Never a lookup boundary or SRS hint. */
export default function HskBadge({text}:{text:string}){
 const {locale}=useI18n(),data=useSyncExternalStore(subscribe,()=>snapshot,()=>initial);
 useEffect(load,[]);
 if(!/^\p{Script=Han}+$/u.test(text))return null;
 const c={en:{word:'HSK2025 vocabulary levels for listed word senses',character:'HSK2025 recognition-character level',outside:'Not listed in the official HSK2025 table; dictionary exploration remains unrestricted.',loading:'Loading HSK level',error:'HSK information unavailable; reopen the definition to retry.'},fr:{word:'Niveaux du vocabulaire HSK2025 pour les sens répertoriés',character:'Niveau de reconnaissance du caractère HSK2025',outside:'Absent de la liste officielle HSK2025 ; exploration du dictionnaire sans restriction.',loading:'Chargement du niveau HSK',error:'Niveau HSK indisponible ; rouvrez la définition pour réessayer.'},ru:{word:'Уровни словарных значений по HSK2025',character:'Уровень распознавания иероглифа HSK2025',outside:'Нет в официальном списке HSK2025; просмотр словаря не ограничен.',loading:'Загрузка уровня HSK',error:'Уровень HSK недоступен; откройте словарь заново.'},tr:{word:'HSK2025 listelenen kelime anlamlarının seviyeleri',character:'HSK2025 karakter tanıma seviyesi',outside:'Resmî HSK2025 listesinde yok; sözlük keşfi sınırsızdır.',loading:'HSK seviyesi yükleniyor',error:'HSK bilgisi kullanılamıyor; yeniden denemek için tanımı tekrar aç.'}}[locale];
 const classification=data.state==='ready'?hskClassification(data.index,text):null;
 const levels=classification?.levels??[],label=data.state==='loading'?'HSK…':data.state==='error'?'HSK ?':levels.length?levels.map(v=>'HSK '+v.replace('-','–')).join(' · '):'HSK —';
 const title=data.state==='loading'?c.loading:data.state==='error'?c.error:!levels.length?c.outside:classification?.kind==='character'?c.character:c.word;
 return <small lang="en" className="dictionary-hsk-badge" title={title} data-hsk-kind={classification?.kind} aria-label={label}>{label}</small>;
}
