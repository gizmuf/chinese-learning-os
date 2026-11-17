import { PDFDocument, rgb, pushGraphicsState, popGraphicsState, translate as move, scale, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Item, StudyLevel } from "./content";
import type { BrowseScope } from './hsk-scope';
import { globalHskLabel, knownHskInScope } from './global-hsk-model';
import { isInLevel } from "./content";
import { translate, type Locale } from "./translate";

type CharacterData = {strokes:string[]};
type Resources = {font:Uint8Array; characters:Record<string,CharacterData>};
type WorksheetWord = Pick<Item, 'hanzi' | 'pinyin' | 'english'>;
export type HanziGroupPdfEntry = Pick<Item, 'hanzi' | 'pinyin'> & {meaning:string};
const ink=rgb(.16,.22,.19), pale=rgb(.74,.77,.72), guide=rgb(.83,.85,.81), accent=rgb(.70,.29,.17);
const W=595.28,H=841.89,margin=38;
export type NotebookScope = StudyLevel | BrowseScope;
export function notebookIncludes(item:Item, level:NotebookScope) {
 return typeof level === 'number' || level === 'all' || level === '7-9' ? knownHskInScope(item.hskLevel, level) : isInLevel(item, level);
}
export function worksheetItems(items:Item[], ids:string[], level:NotebookScope):Item[]{const selected=new Set(ids);return items.filter(item=>notebookIncludes(item,level)&&selected.has(item.id));}
function lines(text:string,font:PDFFont,size:number,width:number){
 const result:string[]=[];let line="";
 for(const word of text.split(/\s+/)){const next=line?line+" "+word:word;if(font.widthOfTextAtSize(next,size)>width&&line){result.push(line);line=word;}else line=next;}
 if(line)result.push(line);return result;
}
export async function createNotebookPdf(items:Item[],level:NotebookScope,locale:Locale,resources?:Resources):Promise<Uint8Array>{
 if(!items.length || items.some(item=>!notebookIncludes(item,level)))throw Error("Choose words from one study level.");
 const levelName=level==='bonus'?translate('Everyday extras',locale):typeof level==='string'&&level.startsWith('hsk')?level.toUpperCase():globalHskLabel(level as BrowseScope);
 return createWorksheetPdf(items,levelName,locale,resources);
}
export function createHanziGroupPdf(entries:readonly HanziGroupPdfEntry[],title:string,locale:Locale,resources?:Resources):Promise<Uint8Array>{
 return createWorksheetPdf(entries.map(({hanzi,pinyin,meaning})=>({hanzi,pinyin,english:meaning})),title,locale,resources);
}
async function createWorksheetPdf(items:WorksheetWord[],title:string,locale:Locale,resources?:Resources):Promise<Uint8Array>{
 if(!items.length||items.some(item=>!item.hanzi))throw Error("Choose words for writing practice.");
 const t=(text:string)=>translate(text,locale);
 const wordGlyphs=items.map(item=>item.hanzi.match(/\p{Script=Han}/gu)??[]);
 if(wordGlyphs.some(glyphs=>!glyphs.length))throw Error("Choose words for writing practice.");
 const required=new Set(wordGlyphs.flat());
 const titleGlyphs=title.match(/\p{Script=Han}/gu)??[];
 const wanted=new Set([...required,...titleGlyphs]);
 const [fontBytes,characters]=resources?[resources.font,resources.characters]:await Promise.all([
  fetch("/fonts/NotoSans-Regular.ttf").then(async response=>{
   if(!response.ok)throw Error("PDF font unavailable");
   return new Uint8Array(await response.arrayBuffer());
  }),
  Promise.all([...wanted].map(async char=>{
   try{
    const response=await fetch(`/characters/${encodeURIComponent(char)}.json`,{cache:'force-cache'});
    if(response.ok)return [char,await response.json() as CharacterData] as const;
   }catch(error){
    if(required.has(char))throw error;
   }
   return [char,undefined] as const;
  })).then(pairs=>Object.fromEntries(pairs) as Record<string,CharacterData>),
 ]);
 for(const char of required)if(!characters[char]?.strokes?.length)throw Error(`Missing stroke order for ${char}`);
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(fontBytes,{subset:true});
 const printable=new Set(font.getCharacterSet());
 doc.setTitle(`Chinese OS - ${title} - ${t('Writing practice')}`);doc.setAuthor('Chinese OS');doc.setLanguage(locale);
 let page:PDFPage;let y=0;
 function text(value:string,x:number,at:number,size=10,color=ink){page.drawText(value,{x,y:at,size,font,color});}
 function titleLine(value:string,at:number,size:number){
  const parts=value.split(/(\p{Script=Han})/gu).filter(part=>
   part && (!/^\p{Script=Han}$/u.test(part) || characters[part]?.strokes?.length || printable.has(part.codePointAt(0)!)),
  );
  const width=parts.reduce((total,part)=>total+(characters[part]?size:font.widthOfTextAtSize(part,size)),0);
  const fittedSize=size*Math.min(1,(W-2*margin)/width);
  let x=margin;
  for(const part of parts){
   const data=characters[part];
   if(data){glyph(data,x,at-fittedSize*.15,fittedSize);x+=fittedSize;}
   else{text(part,x,at,fittedSize);x+=font.widthOfTextAtSize(part,fittedSize);}
  }
 }
 function newPage(){page=doc.addPage([W,H]);titleLine(`Chinese OS  /  ${title}  /  ${t('Writing practice')}`,H-35,12);text(`${t('Name')}: ____________________    ${t('Date')}: ______________`,margin,H-60,9);page.drawLine({start:{x:margin,y:H-73},end:{x:W-margin,y:H-73},color:guide,thickness:.6});y=H-94;}
 function glyph(data:CharacterData,x:number,bottom:number,size:number,through=data.strokes.length-1,highlight=false,ghost=false){
  // Hanzi data uses a Y-up coordinate system; cancel drawSvgPath's SVG Y flip.
  page.pushOperators(pushGraphicsState(),move(x+size*.065,bottom+size*.12),scale(1,-1));
  data.strokes.slice(0,through+1).forEach((path,i)=>page.drawSvgPath(path,{x:0,y:0,scale:size*.87/1024,color:ghost?pale:highlight&&i===through?accent:ink}));
  page.pushOperators(popGraphicsState());
 }
 function box(x:number,top:number,size:number){
  const bottom=top-size;page.drawRectangle({x,y:bottom,width:size,height:size,borderWidth:.6,borderColor:guide});
  for(const [a,b] of [[{x:x+size/2,y:bottom},{x:x+size/2,y:top}],[{x,y:bottom+size/2},{x:x+size,y:bottom+size/2}],[{x,y:bottom},{x:x+size,y:top}],[{x,y:top},{x:x+size,y:bottom}]] as const)page.drawLine({start:a,end:b,color:guide,thickness:.35,dashArray:[2,2]});
 }
 newPage();
 for(let wordIndex=0;wordIndex<items.length;wordIndex++){
  const item=items[wordIndex];const heading=lines(`${wordIndex+1}. ${item.pinyin}  -  ${item.english}`,font,10,W-2*margin);
  const glyphs=wordGlyphs[wordIndex];
  const first=characters[glyphs[0]];
  const firstRow=31*Math.ceil(first.strokes.length/16)+90;
  if(y-heading.length*14-firstRow<68)newPage();
  for(const line of heading){text(line,margin,y,10);y-=14;}y-=3;
  for(const [charIndex,char]of glyphs.entries()){
   const data=characters[char];const stepSize=27,perLine=16,stepLines=Math.ceil(data.strokes.length/perLine);const needed=stepLines*31+68;
   if(y-needed<58){newPage();text(`${wordIndex+1}. ${item.pinyin}  (${charIndex+1}/${glyphs.length})`,margin,y,10);y-=18;}
   data.strokes.forEach((_,i)=>{const x=margin+(i%perLine)*31;const top=y-Math.floor(i/perLine)*31;glyph(data,x,top-stepSize,stepSize,i,true);});
   y-=stepLines*31+4;
   const size=(W-2*margin)/9;
   for(let i=0;i<9;i++){const x=margin+i*size;box(x,y,size);if(i<3)glyph(data,x,y-size,size,data.strokes.length-1,false,i>0);}
   y-=size+13;
  }
  y-=8;
  if(wordIndex%8===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 const pages=doc.getPages();pages.forEach((p,i)=>{page=p;titleLine(`${title}  |  ${t('Page')} ${i+1} / ${pages.length}`,25,8);});
 return doc.save();
}
export async function downloadNotebookPdf(items:Item[],level:NotebookScope,locale:Locale){
 const bytes=await createNotebookPdf(items,level,locale);
 downloadPdf(bytes,`Chinese-OS-${String(level).toUpperCase()}-${locale}-${items.length}-words.pdf`);
}
export async function downloadHanziGroupPdf(entries:readonly HanziGroupPdfEntry[],title:string,locale:Locale,fileName:string){
 downloadPdf(await createHanziGroupPdf(entries,title,locale),fileName);
}
function downloadPdf(bytes:Uint8Array,fileName:string){
 const blob=new Blob([new Uint8Array(bytes)],{type:"application/pdf"});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=fileName;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
