'use client';
import {ArrowUp,ArrowDown} from 'lucide-react';
import {useI18n} from './i18n';
/** Explicit jumps only: scrolling the library never triggers automatic navigation. */
export default function LibraryScrollControls(){
 const {locale}=useI18n(),c={en:{nav:'Move through the library',top:'Back to top',bottom:'Last word'},fr:{nav:'Parcourir la bibliothèque',top:'Retour en haut',bottom:'Dernier mot'},ru:{nav:'Навигация по библиотеке',top:'В начало',bottom:'Последнее слово'},tr:{nav:'Kitaplıkta gezin',top:'Başa dön',bottom:'Son kelime'}}[locale];
 function jump(end:boolean){
  const target=document.getElementById(end?'library-end':'library-start');
  if(!target)return;
  if(end)target.scrollIntoView({block:'end',behavior:'instant'});
  else window.scrollTo({top:0,behavior:'instant'});
  target.focus({preventScroll:true});
 }
 return <nav className="library-scroll-controls" aria-label={c.nav}><button type="button" title={c.top} aria-label={c.top} onClick={()=>jump(false)}><ArrowUp size={17}/></button><button type="button" title={c.bottom} aria-label={c.bottom} onClick={()=>jump(true)}><ArrowDown size={17}/></button></nav>;
}
