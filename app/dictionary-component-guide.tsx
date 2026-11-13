'use client';
import {ArrowRight} from 'lucide-react';
import HskBadge from './hsk-badge';
import {useI18n} from './i18n';
import type {StudyDictionary} from './atlas-spatial-model';
import {dictionaryStructureParts,dictionaryComponentReading} from './dictionary-structure';
import {describeStructure} from './dictionary-source-model';
import {simplifiedDisplayText} from './simplified-chinese';
import './dictionary-component-guide.css';
const copy={
 en:{title:'Explore the parts',tap:'Tap either part to open its own definition and parts. Use the path above to come back.',radical:'Dictionary radical',terminal:'No smaller parts are recorded in this source. This does not mean the character has no history.',source:'Modern written structure from the dataset, not a historical explanation.',open:'Open component'},
 fr:{title:'Explorer les composants',tap:'Touchez un composant pour ouvrir sa définition et ses parties. Le chemin ci-dessus permet de revenir.',radical:'Clé du dictionnaire',terminal:'Cette source ne donne pas de parties plus petites. Cela ne signifie pas que le caractère n’a pas d’histoire.',source:'Structure écrite moderne issue des données, pas une explication historique.',open:'Ouvrir le composant'},
 ru:{title:'Исследовать части',tap:'Нажмите на любую часть: откроются её значение и состав. Чтобы вернуться, используйте путь выше.',radical:'Словарный ключ',terminal:'В этом источнике более мелкие части не указаны. Это не значит, что у знака нет истории.',source:'Современная письменная структура из набора данных, не историческое объяснение.',open:'Открыть компонент'},
 tr:{title:'Parçaları keşfet',tap:'Anlamını ve parçalarını açmak için bir parçaya dokun. Geri dönmek için yukarıdaki yolu kullan.',radical:'Sözlük kökü',terminal:'Bu kaynakta daha küçük parçalar kayıtlı değil. Bu, karakterin geçmişi olmadığı anlamına gelmez.',source:'Veri kümesindeki modern yazı yapısı; tarihsel açıklama değil.',open:'Parçayı aç'}
};
export default function DictionaryComponentGuide({text,structure,dictionary,onLookup}:{text:string;structure:{decomposition:string;radical:string};dictionary:StudyDictionary;onLookup:(text:string,trigger:HTMLButtonElement)=>void}){
 const {locale}=useI18n(),c=copy[locale],parts=dictionaryStructureParts(structure.decomposition,locale).filter(part=>part.glyph!==text),shape=describeStructure(structure.decomposition);
 return <section className="sp-dictionary-structure" aria-label={c.title}>
  <h3>{c.title}</h3>
  {parts.length>0?<><p className="sp-component-instruction">{c.tap}</p><div className="sp-component-equation" lang="zh-Hans"><span>{text}</span><span aria-hidden="true">→</span>{parts.map((part,i)=><span className="sp-component-equation-part" key={i}>{i>0&&<span aria-hidden="true">+</span>}<button type="button" aria-label={`${c.open} ${part.glyph}`} onClick={e=>onLookup(part.glyph,e.currentTarget)}>{part.glyph}</button></span>)}</div><p className="sp-dictionary-layout">{shape?.description}</p><div className="sp-dictionary-entries">{parts.map((part,i)=>{const recorded=dictionaryComponentReading(part.glyph),known=dictionary.get(part.glyph);return <button type="button" key={i} aria-label={`${c.open} ${part.glyph} · ${part.position}`} onClick={e=>onLookup(part.glyph,e.currentTarget)}><strong lang="zh-Hans">{part.glyph}</strong><span><small>{part.position}</small><span className="sp-reading">{recorded?.pinyin??known?.pinyin}</span><span>{simplifiedDisplayText(recorded?.meaning||known?.meaning||'')}</span><HskBadge text={part.glyph}/></span><ArrowRight size={15}/></button>})}</div></>:<p className="sp-component-instruction">{c.terminal}</p>}
  <div className="sp-dictionary-radical">{c.radical}: {structure.radical===text?<span lang="zh-Hans">{structure.radical}</span>:<button type="button" lang="zh-Hans" aria-label={`${c.open} ${structure.radical}`} onClick={e=>onLookup(structure.radical,e.currentTarget)}>{structure.radical}</button>}</div><small>{c.source}</small>
 </section>;
}
