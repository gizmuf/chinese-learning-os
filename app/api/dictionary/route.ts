import {cedictEntry,validDictionaryText} from '../../dictionary-source-model';
export const dynamic='force-dynamic';
const sourceURL='https://raw.githubusercontent.com/gizmuf/chinese-learning-os/fff58597c6108ed7063d9b35d3a1f8bd1eed2481/resources/cc-cedict/cedict.txt.gz';
let snapshot:Promise<string>|undefined;
async function dictionarySource(){
 if(!snapshot)snapshot=(async()=>{
  const response=await fetch(sourceURL,{signal:AbortSignal.timeout(20000)});
  if(!response.ok)throw Error('Dictionary source unavailable');
  const bytes=await response.arrayBuffer();if(bytes.byteLength>8000000)throw Error('Unexpected dictionary size');
  const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),byte=>byte.toString(16).padStart(2,'0')).join('');if(digest!=='31b9443682a1c0da94f8d4d296f58c2f989313ee26e64fb862336e6d3c84c486')throw Error('Unexpected dictionary revision');
  const text=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  if(text.length>30000000||!text.includes('# CC-CEDICT'))throw Error('Invalid dictionary source');return text;
 })().catch(error=>{snapshot=undefined;throw error;});
 return snapshot;
}
export async function GET(request:Request){
 const text=new URL(request.url).searchParams.get('text')??'';
 if(!validDictionaryText(text))return Response.json({status:'invalid',error:'Enter up to 40 Chinese characters.'},{status:400});
 try{const source=await dictionarySource(),entry=cedictEntry(source,text);return Response.json(entry?{status:'found',entry}:{status:'not-found'}, {status:entry?200:404,headers:{'Cache-Control':'public, max-age=86400'}})}
 catch{return Response.json({status:'error',error:'Could not load the dictionary source. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
