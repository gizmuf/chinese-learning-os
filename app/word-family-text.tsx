import {Fragment} from 'react';
import {splitFamilyWord} from './word-family-model';
export function SharedText({text,anchor}:{text:string;anchor:string}){return <>{text.split(anchor).map((part,i)=><Fragment key={i}>{i>0&&<span className="wf-shared">{anchor}</span>}{part}</Fragment>)}</>}
export function AlignedWord({word,anchor}:{word:string;anchor:string}){const parts=splitFamilyWord(word,anchor);if(!parts)return <span lang="zh-Hans">{word}</span>;return <span className="wf-hanzi" lang="zh-Hans"><span className="wf-before"><SharedText text={parts.before} anchor={anchor}/></span><span className="wf-anchor wf-shared">{anchor}</span><span className="wf-after"><SharedText text={parts.after} anchor={anchor}/></span></span>}
