import { PDFDocument, rgb, pushGraphicsState, popGraphicsState, translate as move, scale, type PDFPage, type PDFFont } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Item, StudyLevel } from "./content";
import { isInLevel } from "./content";
import { translate, type Locale } from "./translate";

type CharacterData = {strokes:string[]};
type Resources = {font:Uint8Array; characters:Record<string,CharacterData>};
const ink=rgb(.16,.22,.19), pale=rgb(.74,.77,.72), guide=rgb(.83,.85,.81), accent=rgb(.70,.29,.17);
const W=595.28,H=841.89,margin=38;
export function worksheetItems(items:Item[], ids:string[], level:StudyLevel):Item[]{const selected=new Set(ids);return items.filter(item=>isInLevel(item,level)&&selected.has(item.id));}
function lines(text:string,font:PDFFont,size:number,width:number){
 const result:string[]=[];let line="";
 for(const word of text.split(/\s+/)){const next=line?line+" "+word:word;if(font.widthOfTextAtSize(next,size)>width&&line){result.push(line);line=word;}else line=next;}
 if(line)result.push(line);return result;
}
export async function createNotebookPdf(items:Item[],level:StudyLevel,locale:Locale,resources?:Resources):Promise<Uint8Array>{
 if(!items.length || items.some(item=>!isInLevel(item,level)))throw Error("Choose words from one study level.");
 const t=(text:string)=>translate(text,locale);
 const chars=[...new Set(items.flatMap(item=>Array.from(item.hanzi)))];
 const load=async(url:string)=>{const r=await fetch(url);if(!r.ok)throw Error("PDF resource unavailable");return r;};
 const [fontBytes,characterPairs]=resources?[resources.font,Object.entries(resources.characters)]:await Promise.all([
  load("/fonts/NotoSans-Regular.ttf").then(r=>r.arrayBuffer()).then(b=>new Uint8Array(b)),
  Promise.all(chars.map(async char=>[char,await (await load(`/characters/${encodeURIComponent(char)}.json`)).json()] as [string,CharacterData])),
 ]);
 const characters=Object.fromEntries(characterPairs) as Record<string,CharacterData>;
 for(const char of chars)if(!characters[char]?.strokes.length)throw Error("Missing stroke order");
 const doc=await PDFDocument.create();doc.registerFontkit(fontkit);
 const font=await doc.embedFont(fontBytes,{subset:true});
 const levelName=level==='bonus'?t('Everyday extras'):level.toUpperCase();
 doc.setTitle(`Chinese OS - ${levelName} - ${t('Writing practice')}`);doc.setAuthor('Chinese OS');doc.setLanguage(locale);
 let page:PDFPage;let y=0;
 function text(value:string,x:number,at:number,size=10,color=ink){page.drawText(value,{x,y:at,size,font,color});}
 function newPage(){page=doc.addPage([W,H]);text(`Chinese OS  /  ${levelName}  /  ${t('Writing practice')}`,margin,H-35,12);text(`${t('Name')}: ____________________    ${t('Date')}: ______________`,margin,H-60,9);page.drawLine({start:{x:margin,y:H-73},end:{x:W-margin,y:H-73},color:guide,thickness:.6});y=H-94;}
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
  const first=characters[Array.from(item.hanzi)[0]];
  const firstRow=31*Math.ceil(first.strokes.length/16)+90;
  if(y-heading.length*14-firstRow<68)newPage();
  for(const line of heading){text(line,margin,y,10);y-=14;}y-=3;
  for(const [charIndex,char]of Array.from(item.hanzi).entries()){
   const data=characters[char];const stepSize=27,perLine=16,stepLines=Math.ceil(data.strokes.length/perLine);const needed=stepLines*31+68;
   if(y-needed<58){newPage();text(`${wordIndex+1}. ${item.pinyin}  (${charIndex+1}/${Array.from(item.hanzi).length})`,margin,y,10);y-=18;}
   data.strokes.forEach((_,i)=>{const x=margin+(i%perLine)*31;const top=y-Math.floor(i/perLine)*31;glyph(data,x,top-stepSize,stepSize,i,true);});
   y-=stepLines*31+4;
   const size=(W-2*margin)/9;
   for(let i=0;i<9;i++){const x=margin+i*size;box(x,y,size);if(i<3)glyph(data,x,y-size,size,data.strokes.length-1,false,i>0);}
   y-=size+13;
  }
  y-=8;
  if(wordIndex%8===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
 }
 const pages=doc.getPages();pages.forEach((p,i)=>{p.drawText(`${levelName}  |  ${t('Page')} ${i+1} / ${pages.length}`,{x:margin,y:25,size:8,font,color:ink});});
 return doc.save();
}
export async function downloadNotebookPdf(items:Item[],level:StudyLevel,locale:Locale){
 const bytes=await createNotebookPdf(items,level,locale);const blob=new Blob([new Uint8Array(bytes)],{type:"application/pdf"});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`Chinese-OS-${level.toUpperCase()}-${locale}-${items.length}-words.pdf`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60_000);
}
