import test from 'node:test';import assert from 'node:assert/strict';import {build} from 'esbuild';import {mkdtemp,writeFile} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';import {pathToFileURL} from 'node:url';
const b=await build({stdin:{contents:"export * from './lib/voice-demo';export * from './app/voice-demo-model';export * from './app/scene-lab-model';",resolveDir:process.cwd(),loader:'ts'},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});const p=join(await mkdtemp(join(tmpdir(),'voice-demo-test-')),'bundle.mjs');await writeFile(p,b.outputFiles[0].text);const m=await import(pathToFileURL(p));
const env={QWEN_REALTIME_API_KEY:'test-placeholder',QWEN_REALTIME_WORKSPACE:'ws-example',VOICE_DEMO_ALLOWED_USER_ID:'test-user',VOICE_DEMO_FREE_ONLY_CONFIRMED:'1',VOICE_DEMO_EXPIRES_AT:new Date(Date.now()+20*60000).toISOString()};
const request=(path='/api/voice-demo/status',headers={})=>new Request('https://example.com'+path,{headers:{'oai-authenticated-user-id':'test-user',...headers}});
test('voice fails closed without credentials, quota confirmation, approved identity and short activation window',async()=>{
 assert.equal(m.voiceDemoReadiness(request(),{}).ready,false);assert.equal(m.voiceDemoReadiness(new Request('https://example.com'),{}).userId,null);assert.equal(m.voiceDemoReadiness(request(),{}).userId,'test-user');assert.equal(m.voiceDemoReadiness(request(),env).ready,true);
 for(const [key,value] of [['VOICE_DEMO_FREE_ONLY_CONFIRMED','0'],['QWEN_REALTIME_API_KEY',''],['VOICE_DEMO_EXPIRES_AT',new Date(0).toISOString()],['VOICE_DEMO_EXPIRES_AT',new Date(Date.now()+2*3600000).toISOString()]])assert.equal(m.voiceDemoReadiness(request(),{...env,[key]:value}).ready,false);
 assert.equal(m.voiceDemoReadiness(request('/api/voice-demo/status',{'oai-authenticated-user-id':'other'}),env).ready,false);
 assert.equal((await m.handleVoiceDemo(request('/api/voice-demo/stream'),{})).status,403);
 assert.equal((await m.handleVoiceDemo(request('/api/voice-demo/stream',{Origin:'https://attacker.example',Upgrade:'websocket'}),env)).status,403);
});
test('only catalogue cards and known Lab routes; PCM clips safely and preserves little-endian signed samples',()=>{
 assert.deepEqual(m.validatedFruitIds(['banana','apple','banana']),['banana','apple']);assert.equal(m.validatedFruitIds(['<script>']),null);assert.equal(m.validatedFruitIds([]),null);assert.equal(m.sceneLab('https://attacker.example'),'room');assert.equal(m.sceneLabHref('voice'),'/?view=labs&lab=voice');
 const bytes=m.pcm16(new Float32Array([-2,-1,0,1,2]));assert.deepEqual([...new Int16Array(bytes.buffer)],[-32768,-32768,0,32767,32767]);
});
test('relay fixes model/session; denies client reconfiguration, limits turns and closes upstream on stop',async()=>{
 class Socket{sent=[];listeners={};closed=false;accept(){}send(v){this.sent.push(JSON.parse(v));}close(){this.closed=true;}addEventListener(n,fn){(this.listeners[n]??=[]).push(fn);}emit(n,data){for(const fn of this.listeners[n]??[])fn({data:JSON.stringify(data)});}}
 const oldFetch=globalThis.fetch,oldPair=globalThis.WebSocketPair,OldResponse=globalThis.Response;let pair;const upstream=new Socket();
 globalThis.fetch=async(url,init)=>{assert.match(url,/model=qwen3\.8-omni-flash-realtime$/);assert.equal(init.headers.Authorization,'Bearer test-placeholder');return {webSocket:upstream};};
 globalThis.WebSocketPair=class{constructor(){this[0]=new Socket();this[1]=new Socket();pair=this;}};
 globalThis.Response=class extends OldResponse{constructor(body,init){super(body,{...init,status:init.status===101?200:init.status});if(init.status===101)Object.defineProperty(this,'status',{value:101});this.webSocket=init.webSocket;}};
 try{
  const response=await m.handleVoiceDemo(request('/api/voice-demo/stream',{Origin:'https://example.com',Upgrade:'websocket'}),env);assert.equal(response.status,101);
  upstream.emit('message',{type:'session.created'});assert.equal(upstream.sent[0].type,'session.update');assert.equal(upstream.sent[0].session.turn_detection,null);
  upstream.emit('message',{type:'session.updated'});assert.equal(pair[1].sent[0].type,'demo.ready');
  pair[1].emit('message',{type:'session.update',session:{model:'expensive-other-model'}});assert.equal(upstream.sent.length,1);
  const clip=Buffer.alloc(320000);for(let start=0;start<clip.length;start+=24000)pair[1].emit('message',{type:'audio',audio:clip.subarray(start,start+24000).toString('base64')});assert.equal(pair[1].closed,false);pair[1].emit('message',{type:'commit'});upstream.emit('message',{type:'response.done'});
  for(let i=0;i<4;i++){pair[1].emit('message',{type:'text',text:'Hello'});upstream.emit('message',{type:'response.done'});}
  assert.equal(upstream.sent.filter(e=>e.type==='response.create').length,3);
  upstream.emit('message',{type:'response.output_item.done',item:{type:'function_call',name:'show_fruits',arguments:JSON.stringify({ids:['banana']}),call_id:'call1'}});assert.ok(pair[1].sent.some(e=>e.type==='demo.cards'&&e.ids[0]==='banana'));
  pair[1].emit('message',{type:'stop'});assert.equal(upstream.closed,true);assert.equal(pair[1].closed,true);
 }finally{globalThis.fetch=oldFetch;globalThis.WebSocketPair=oldPair;globalThis.Response=OldResponse;}
});
