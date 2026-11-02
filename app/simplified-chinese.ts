import raw from '../data/simplified-dictionary-policy.json';
const aliases:Readonly<Record<string,string>>=raw.aliases;
const ambiguous:Readonly<Record<string,{canonical:boolean;readings:Record<string,string[]>}>>=raw.ambiguous;
const canonicalWords=new Set<string>(raw.canonicalWords);
const sharedCharacters=new Set<string>(raw.sharedCharacters);
const traditionalCharacters=new Set(Object.keys(aliases).filter(text=>Array.from(text).length===1&&!sharedCharacters.has(text)));
function readingKey(value:string){return value.replace(/u:/gi,'v').normalize('NFD').replace(/u\u0308/gi,'v').toLowerCase().split(/[\s’'·-]+/).filter(Boolean).map(syllable=>{const digit=syllable.match(/[1-5]/)?.[0],mark=syllable.match(/[\u0304\u0301\u030c\u0300]/)?.[0];return syllable.replace(/[\u0300-\u036f1-5]/g,'')+(digit??(mark?String(['\u0304','\u0301','\u030c','\u0300'].indexOf(mark)+1):'5'));}).join('');}
/** Lexical aliases only. Actual parts, radicals, IDS and stroke paths must not pass through this adapter. */
export function canonicalDictionaryText(text:string,pinyin?:string):string|undefined{
 const choices=ambiguous[text];
 if(choices&&pinyin){const key=readingKey(pinyin),matches=new Set(Object.entries(choices.readings).filter(([reading])=>readingKey(reading)===key).flatMap(([,values])=>values));if(matches.size===1)return [...matches][0];}
 if(choices&&!choices.canonical)return;
 if(sharedCharacters.has(text))return text;
 if(Object.hasOwn(aliases,text))return aliases[text];
 if(canonicalWords.has(text))return text;
 const glyphs=Array.from(text);
 for(let i=0;i<glyphs.length;){let known=false;for(let end=Math.min(glyphs.length,i+raw.maxWordLength);end>i;end--)if(canonicalWords.has(glyphs.slice(i,end).join(''))){i=end;known=true;break;}
  if(!known){const glyph=glyphs[i++];if(traditionalCharacters.has(glyph)||(ambiguous[glyph]&&!ambiguous[glyph].canonical))return;}
 }
 return text;
}
export function isSimplifiedHeadword(text:string){return canonicalDictionaryText(text)===text;}
function lexicalRun(run:string){
 if(sharedCharacters.has(run))return run;
 if(Object.hasOwn(aliases,run))return aliases[run];if(canonicalWords.has(run))return run;
 const glyphs=Array.from(run);let result='';
 for(let i=0;i<glyphs.length;){let found=false;for(let end=Math.min(glyphs.length,i+Math.max(raw.maxAliasLength,raw.maxWordLength));end>i;end--){const part=glyphs.slice(i,end).join('');if(Object.hasOwn(aliases,part)||canonicalWords.has(part)){result+=sharedCharacters.has(part)?part:aliases[part]??part;i=end;found=true;break;}}
  if(!found){const glyph=glyphs[i++];result+=canonicalDictionaryText(glyph)??'[unresolved variant]';}
 }
 return result;
}
/** For learner-facing lexical prose; never used to rewrite stored IDs or source files. */
export function simplifiedDisplayText(text:string){return text.replace(/[\p{Script=Han}]+/gu,lexicalRun).replace(/([\p{Script=Han}]+)\|([\p{Script=Han}]+)/gu,(original,left:string,right:string)=>left===right?right:original);}
