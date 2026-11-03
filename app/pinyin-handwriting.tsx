'use client';
import Ink from './ink';
import type {Stroke} from './learning';
export default function PinyinHandwriting({strokes,onChange,penOnly,disabled=false,label='Write Pinyin and tone marks here'}:{strokes:Stroke[];onChange:(strokes:Stroke[])=>void;penOnly:boolean;disabled?:boolean;label?:string}){
 return <div className="pinyin-handwriting" role="group" aria-label={label}><svg viewBox="0 0 600 170" preserveAspectRatio="none" aria-hidden="true"><path d="M0 35H600 M0 75H600 M0 115H600 M0 155H600" fill="none" stroke="#b4c8bf" strokeWidth="1"/><path d="M0 55H600 M0 95H600 M0 135H600" fill="none" stroke="#dce5dd" strokeDasharray="5 5"/></svg><Ink strokes={strokes} onChange={onChange} penOnly={penOnly} disabled={disabled}/></div>;
}
