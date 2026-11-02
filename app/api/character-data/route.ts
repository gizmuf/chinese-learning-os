export const dynamic='force-dynamic';
export async function GET(request:Request){
 const character=new URL(request.url).searchParams.get('character')??'';
 if(Array.from(character).length!==1||!/^\p{Script=Han}$/u.test(character))return Response.json({error:'Enter one Chinese character.'},{status:400});
 try{
  const response=await fetch('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/'+encodeURIComponent(character)+'.json',{signal:AbortSignal.timeout(15000)});
  if(response.status===404)return Response.json({error:'No stroke data is available for this character.'},{status:404});if(!response.ok)throw Error('Source unavailable');
  const text=await response.text();if(text.length>1000000)throw Error('Unexpected character data');const data=JSON.parse(text);
  if(!Array.isArray(data.strokes)||!data.strokes.length||data.strokes.length>100||!data.strokes.every((s:unknown)=>typeof s==='string')||!Array.isArray(data.medians)||data.medians.length!==data.strokes.length)throw Error('Invalid character data');
  return Response.json(data,{headers:{'Cache-Control':'public, max-age=2592000'}});
 }catch{return Response.json({error:'Could not load stroke data. Please retry.'},{status:503,headers:{'Cache-Control':'no-store'}});}
}
