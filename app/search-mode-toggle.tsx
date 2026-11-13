"use client";
import type {SearchMode} from './chinese-search';
/** Pinyin is the default; Hanzi works in either mode. */
export default function SearchModeToggle({value,onChange}:{value:SearchMode;onChange:(value:SearchMode)=>void}){
 return <span role="group" aria-label="Search language" style={{display:'inline-flex',gap:4,alignItems:'center',flexShrink:0}}>{(['pinyin','english'] as const).map(mode=><button type="button" className="secondary" key={mode} aria-pressed={value===mode} onClick={()=>onChange(mode)} style={{padding:'6px 9px',fontSize:12,background:value===mode?'#e1efe7':undefined,color:value===mode?'#184d38':undefined}}>{mode==='pinyin'?'Pinyin / 汉字':'English'}</button>)}</span>;
}
