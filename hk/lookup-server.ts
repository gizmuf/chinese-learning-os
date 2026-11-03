// Read-only Node transport for v70's existing dictionary model and pinned data.
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {gunzipSync} from 'node:zlib';
import {join} from 'node:path';
import {cedictEntry,validDictionaryText} from '../app/dictionary-source-model';
const root=process.env.CHINESEOS_SOURCE_ROOT;
if(!root)throw Error('CHINESEOS_SOURCE_ROOT is required');
const compressed=await readFile(join(root,'resources/cc-cedict/cedict.txt.gz'));
if(compressed.length>8000000||createHash('sha256').update(compressed).digest('hex')!=='31b9443682a1c0da94f8d4d296f58c2f989313ee26e64fb862336e6d3c84c486')throw Error('Unexpected dictionary revision');
const source=gunzipSync(compressed,{maxOutputLength:30000000}).toString('utf8');
if(!source.includes('# CC-CEDICT'))throw Error('Invalid dictionary source');
const entries=new Map<string,ReturnType<typeof cedictEntry>>();
const server=createServer(async(req,res)=>{
 const send=(status:number,data:unknown,cache='no-store')=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':cache,'X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
 if(req.method!=='GET'){res.setHeader('Allow','GET');send(405,{error:'Method not allowed'});return;}
 try{
  const url=new URL(req.url??'/','http://127.0.0.1');
  if(url.pathname==='/api/dictionary'){
   const text=url.searchParams.get('text')??'';
   if(!validDictionaryText(text)){send(400,{status:'invalid',error:'Enter up to 40 Chinese characters.'});return;}
   let entry=entries.get(text);
   if(!entries.has(text)){entry=cedictEntry(source,text);if(entries.size>=512)entries.delete(entries.keys().next().value!);entries.set(text,entry);}
   send(entry?200:404,entry?{status:'found',entry}:{status:'not-found'},'public, max-age=86400');return;
  }
  if(url.pathname==='/api/character-data'){
   const character=url.searchParams.get('character')??'';
   if(Array.from(character).length!==1||!/^\p{Script=Han}$/u.test(character)){send(400,{error:'Enter one Chinese character.'});return;}
   let bytes:Buffer;
   try{bytes=await readFile(join(root,'node_modules/hanzi-writer-data',character+'.json'));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT'){send(404,{error:'No stroke data is available for this character.'});return;}throw e;}
   if(bytes.length>1000000)throw Error('Unexpected character data');
   const data=JSON.parse(bytes.toString('utf8'));
   if(!Array.isArray(data.strokes)||!data.strokes.length||data.strokes.length>100||!data.strokes.every((s:unknown)=>typeof s==='string')||!Array.isArray(data.medians)||data.medians.length!==data.strokes.length)throw Error('Invalid character data');
   send(200,data,'public, max-age=2592000');return;
  }
  send(404,{error:'Not found'});
 }catch{send(503,{status:'error',error:'Could not load dictionary data. Please retry.'});}
});
server.headersTimeout=10000;server.requestTimeout=15000;
server.listen(8788,'127.0.0.1',()=>console.log('ChineseOS v70 read-only lookup ready on 127.0.0.1:8788'));
