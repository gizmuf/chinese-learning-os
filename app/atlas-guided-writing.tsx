"use client";
import SharedWriting from './shared-writing';
export default function AtlasGuidedWriting({character,penOnly,onSave}:{character:string;penOnly:boolean;onSave:()=>Promise<void>}) {
 return <SharedWriting hanzi={character} penOnly={penOnly} onSave={onSave}/>;
}
