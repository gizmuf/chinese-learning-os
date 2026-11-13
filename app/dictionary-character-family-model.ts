import type {DictionaryEntry,StudyDictionary} from './atlas-spatial-model';

const idsArity:Readonly<Record<string,number>>={
 '⿰':2,'⿱':2,'⿲':3,'⿳':3,'⿴':2,'⿵':2,'⿶':2,'⿷':2,
 '⿸':2,'⿹':2,'⿺':2,'⿻':2,'⿼':2,'⿽':2,'⿾':1,'⿿':1
};
const singleCharacter=(value:string)=>/^\p{Script=Han}$/u.test(value);

/** Read one complete IDS expression. Explicit unknown leaves retain known siblings. */
function structureParts(ids:string):string[]{
 const parts:string[]=[];
 let pending=1;
 for(const glyph of ids){
  if(pending===0)return [];
  pending--;
  const arity=idsArity[glyph];
  if(arity!==undefined)pending+=arity;
  else if(glyph!=='?'&&glyph!=='？'){
   if(!singleCharacter(glyph))return [];
   parts.push(glyph);
  }
 }
 return pending===0?parts:[];
}

type FamilyIndex={
 size:number;
 entries:Map<string,DictionaryEntry>;
 parts:Map<string,string[]>;
 parents:Map<string,Set<string>>;
 families:Map<string,DictionaryEntry[]>;
};

// Dictionary objects are snapshots, as in the shared lookup model. Use a new Map
// for same-size structural replacements; additions/removals also invalidate here.
const indexes=new WeakMap<StudyDictionary,FamilyIndex>();
function familyIndex(dictionary:StudyDictionary):FamilyIndex{
 const cached=indexes.get(dictionary);
 if(cached?.size===dictionary.size)return cached;
 const index:FamilyIndex={size:dictionary.size,entries:new Map(),parts:new Map(),parents:new Map(),families:new Map()};
 for(const [glyph,entry] of dictionary){
  // Compounds and aliases are not additional character rows.
  if(!singleCharacter(glyph)||entry.text!==glyph)continue;
  index.entries.set(glyph,entry);
  const parts=structureParts(entry.structure?.decomposition??'');
  index.parts.set(glyph,parts);
  for(const part of parts){
   let parents=index.parents.get(part);
   if(!parents){parents=new Set();index.parents.set(part,parents);}
   parents.add(glyph);
  }
 }
 indexes.set(dictionary,index);
 return index;
}

/** Reverse reachability avoids recursive stack use and order-dependent cycle caches. */
function containingEntries(part:string,index:FamilyIndex):DictionaryEntry[]{
 const cached=index.families.get(part);
 if(cached)return cached;
 const queue=[part],visited=new Set(queue),matches=new Set<string>();
 for(let i=0;i<queue.length;i++){
  for(const parent of index.parents.get(queue[i])??[]){
   matches.add(parent);
   if(!visited.has(parent)){visited.add(parent);queue.push(parent);}
  }
 }
 const entries=[...matches].map(glyph=>index.entries.get(glyph)!);
 entries.sort((a,b)=>index.parts.get(a.text)!.length-index.parts.get(b.text)!.length
  ||a.text.codePointAt(0)!-b.text.codePointAt(0)!);
 index.families.set(part,entries);
 return entries;
}

/** Available structural selectors, without assigning semantic or phonetic roles. */
export function dictionaryFamilyParts(character:string,dictionary:StudyDictionary,preferredPart?:string):string[]{
 if(!singleCharacter(character))return [];
 const index=familyIndex(dictionary);
 if(!index.entries.has(character))return [];
 const parts:string[]=[];
 const add=(part:string)=>{
  if(!parts.includes(part)&&containingEntries(part,index).some(entry=>entry.text!==character))parts.push(part);
 };
 if(preferredPart&&singleCharacter(preferredPart)
  &&containingEntries(preferredPart,index).some(entry=>entry.text===character))add(preferredPart);
 add(character);
 for(const part of index.parts.get(character)!)add(part);
 return parts;
}

/** All attested containing character rows; pagination belongs to the caller. */
export function dictionaryCharacterFamily(character:string,part:string,dictionary:StudyDictionary,priorityWords:readonly string[]=[]):DictionaryEntry[]{
 if(!singleCharacter(character)||!singleCharacter(part))return [];
 const index=familyIndex(dictionary);
 if(!index.entries.has(character))return [];
 const family=containingEntries(part,index).filter(entry=>entry.text!==character);
 if(!priorityWords.length)return family;
 const priority=new Set(priorityWords.flatMap(word=>Array.from(word)));
 // The cached order already breaks ties by direct leaf count, then code point.
 return family.sort((a,b)=>Number(priority.has(b.text))-Number(priority.has(a.text)));
}
