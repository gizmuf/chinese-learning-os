'use client';
import {createContext,useContext,useEffect,useMemo,useState,type ReactNode} from 'react';
import {useI18n} from './i18n';
export type HanziStyle='print'|'strokes';
const Context=createContext({style:'strokes' as HanziStyle,highlight:true,setStyle:(_:HanziStyle)=>{},setHighlight:(_:boolean)=>{}});
export function HanziStyleProvider({children}:{children:ReactNode}){
 const [style,setStyle]=useState<HanziStyle>('strokes'),[highlight,setHighlight]=useState(true);
 useEffect(()=>{document.documentElement.dataset.hanziStyle=style;document.documentElement.dataset.hanziHighlight=String(highlight);},[style,highlight]);
 const value=useMemo(()=>({style,highlight,setStyle,setHighlight}),[style,highlight]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useHanziStyle=()=>useContext(Context);
const copy={
 title:{en:'Hanzi appearance',fr:'Apparence des caractères',ru:'Вид иероглифов',tr:'Karakter görünümü'},
 print:{en:'Print',fr:'Caractères imprimés',ru:'Печатные',tr:'Baskı'},
 strokes:{en:'Stroke shapes',fr:'Formes par traits',ru:'Формы штрихов',tr:'Çizgi biçimleri'},
 highlight:{en:'Highlight the selected component',fr:'Surligner le composant sélectionné',ru:'Выделять выбранный компонент',tr:'Seçili bileşeni vurgula'},
 note:{en:'One reading style across Chinese OS. Component colour is separate from meaning/sound review status. Writing animations and historical drawings keep their teaching shapes.',fr:'Un style de lecture pour Chinese OS. La couleur du composant est indépendante du statut de vérification du sens ou du son. Les animations d’écriture et dessins historiques gardent leurs formes pédagogiques.',ru:'Единый стиль чтения во всём Chinese OS. Цвет компонента не зависит от проверки его смысловой или звуковой роли. Анимации письма и исторические рисунки сохраняют учебные формы.',tr:'Chinese OS genelinde tek okuma biçimi. Bileşen rengi, anlam veya ses rolünün incelenme durumundan ayrıdır. Yazı animasyonları ve tarihî çizimler öğretim biçimlerini korur.'},
 unavailable:{en:'Partial-stroke colour is available in Stroke shapes. Unmapped components keep the same shape without guessed colouring.',fr:'La couleur partielle est disponible avec les formes par traits. Sans correspondance, la forme reste identique, sans coloration supposée.',ru:'Частичное выделение доступно в режиме штрихов. Без разметки форма не меняется и цвет не угадывается.',tr:'Kısmi çizgi rengi, çizgi biçimlerinde kullanılabilir. Eşleştirmesi olmayan bileşenlerin şekli korunur; renk tahmin edilmez.'},
};
export function HanziDisplayControls({compact=false}:{compact?:boolean}){
 const {locale}=useI18n(),p=useHanziStyle();
 return <fieldset className={'hanzi-display-controls'+(compact?' is-compact':'')}><legend>{copy.title[locale]}</legend><div role="group" aria-label={copy.title[locale]}>{(['print','strokes'] as const).map(value=><button type="button" key={value} className="secondary" aria-pressed={p.style===value} onClick={()=>p.setStyle(value)}>{copy[value][locale]}</button>)}</div><label><input type="checkbox" checked={p.highlight} onChange={e=>p.setHighlight(e.target.checked)}/>{copy.highlight[locale]}</label>{!compact&&<p>{copy.note[locale]}</p>}{(p.style==='print'||!compact)&&<small>{copy.unavailable[locale]}</small>}</fieldset>;
}
