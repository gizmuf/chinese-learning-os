'use client';
import {useStudyLookup} from './study-lookup-context';
import {useI18n} from './i18n';
import {extendedComponent} from './atlas-cloud-extended';
/** Visible touch targets, separate from the decorative whole-glyph SVG. */
export default function AtlasPartExplorer({hanzi,parts,onFamily}:{hanzi:string;parts:string[];onFamily:(id:string)=>void}){
 const lookup=useStudyLookup(),{locale}=useI18n();
 const copy={en:['Explore character & parts','Tap a part to explore','Explore part'],fr:['Explorer le caractère et ses parties','Touchez une partie pour explorer','Explorer la partie'],ru:['Знак и его части','Нажмите часть для исследования','Исследовать часть'],tr:['Karakteri ve parçalarını keşfet','Keşfetmek için bir parçaya dokun','Parçayı keşfet']}[locale];
 return <div className="cloud-part-explorer" aria-label={copy[1]}>{lookup&&<button type="button" className="cloud-open-character" onClick={e=>{e.stopPropagation();lookup.open(hanzi,e.currentTarget)}}>{copy[0]} · {hanzi}</button>}<div className="cloud-part-shortcuts">{parts.map(id=>{const part=extendedComponent(id);return part&&<button type="button" key={id} aria-label={copy[2]+' '+part.glyph} onClick={e=>{e.stopPropagation();if(lookup)lookup.open(part.glyph,e.currentTarget);else onFamily(id)}}><span lang="zh-Hans">{part.glyph}</span><small>{part.label[locale]}</small></button>})}</div></div>;
}
