'use client';
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {useI18n} from './i18n';
import {hanziStyles,isHanziStyle,type HanziStyle} from './hanzi-style-preference';
export type {HanziStyle} from './hanzi-style-preference';
const Context=createContext({style:'strokes' as HanziStyle,highlight:true,setStyle:(_:HanziStyle)=>{},setHighlight:(_:boolean)=>{}});
export function HanziStyleProvider({children}:{children:ReactNode}){
 const preferenceKey='chinese-os:hanzi-appearance:v1';
 const [style,setStyle]=useState<HanziStyle>('strokes'),[highlight,setHighlight]=useState(true),[ready,setReady]=useState(false);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(preferenceKey)??'null');if(isHanziStyle(saved?.style))setStyle(saved.style);if(typeof saved?.highlight==='boolean')setHighlight(saved.highlight);}catch{}setReady(true);},[]);
 useEffect(()=>{if(!ready)return;document.documentElement.dataset.hanziStyle=style;document.documentElement.dataset.hanziHighlight=String(highlight);try{if(style!=='strokes'||!highlight||localStorage.getItem(preferenceKey)!==null)localStorage.setItem(preferenceKey,JSON.stringify({style,highlight}));}catch{}},[style,highlight,ready]);
 const value=useMemo(()=>({style,highlight,setStyle,setHighlight}),[style,highlight]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useHanziStyle=()=>useContext(Context);
const copy={
 title:{en:'Hanzi appearance',fr:'Apparence des caractères',ru:'Вид иероглифов',tr:'Karakter görünümü'},
 print:{en:'Screen',fr:'Écran',ru:'Экран',tr:'Ekran'},
 book:{en:'Book',fr:'Livre',ru:'Книга',tr:'Kitap'},
 strokes:{en:'Brush',fr:'Pinceau',ru:'Кисть',tr:'Fırça'},
 highlight:{en:'Highlight the selected component',fr:'Surligner le composant sélectionné',ru:'Выделять выбранный компонент',tr:'Seçili bileşeni vurgula'},
 partial:{en:'Individual strokes are highlighted in Brush when their component is mapped.',fr:'En mode Pinceau, les traits sont surlignés pour les composants répertoriés.',ru:'В режиме «Кисть» подсвечиваются штрихи размеченных компонентов.',tr:'Fırça görünümünde, eşlemesi olan bileşenlerin çizgileri vurgulanır.'},
};
export function HanziDisplayControls({compact=false,showHighlight=true}:{compact?:boolean;showHighlight?:boolean}){
 const {locale}=useI18n(),p=useHanziStyle();
 return <fieldset className={'hanzi-display-controls'+(compact?' is-compact':'')}>
  <legend>{copy.title[locale]}</legend>
  <div role="group" aria-label={copy.title[locale]}>
   {hanziStyles.map(value=><button type="button" key={value} className="secondary" aria-pressed={p.style===value}
    aria-label={copy[value][locale]} title={copy[value][locale]} onClick={()=>p.setStyle(value)}>
    <span lang="zh-Hans" aria-hidden="true" className={'hanzi-style-sample '+value}>{compact?'玩':'好玩儿'}</span>
    {!compact&&<span>{copy[value][locale]}</span>}
   </button>)}
  </div>
  {showHighlight&&<label title={copy.partial[locale]}>
   <input type="checkbox" aria-label={copy.highlight[locale]} checked={p.highlight} onChange={e=>p.setHighlight(e.target.checked)}/>
   {compact?<span aria-hidden="true">◧</span>:copy.highlight[locale]}
  </label>}
  {showHighlight&&!compact&&<small>{copy.partial[locale]}</small>}
 </fieldset>;
}
