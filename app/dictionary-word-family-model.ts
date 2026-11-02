export function dictionaryWordFamily(words:Iterable<string>,character:string,currentWords:readonly string[]=[]){
 if(Array.from(character).length!==1||!/^\p{Script=Han}$/u.test(character))return [];
 const current=new Set(currentWords),unique=new Set([...words].filter(word=>word!==character&&word.includes(character)));
 return [...unique].sort((a,b)=>Number(current.has(b))-Number(current.has(a))||Array.from(a).length-Array.from(b).length||a.localeCompare(b,'zh'));
}
export function dictionaryFamilyPage(words:readonly string[],page:number,size=18){const pages=Math.max(1,Math.ceil(words.length/size)),safe=Math.max(0,Math.min(pages-1,Math.floor(page)));return {page:safe,pages,words:words.slice(safe*size,(safe+1)*size)};}
