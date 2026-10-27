// Runs the built Worker and tests in the same local network namespace.
import {spawn,spawnSync} from 'node:child_process';
import {mkdtempSync,readdirSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const state=mkdtempSync(join(tmpdir(),'grammar-api-d1-'));
for(const file of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort()){
 const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','site-creator-d1','--config','dist/server/wrangler.json','--local','--persist-to',state,'--file','drizzle/'+file],{encoding:'utf8'});
 if(result.status!==0)throw Error('Local migration failed: '+result.stdout+result.stderr);
}
const worker=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--local','--persist-to',state,'--ip','127.0.0.1','--port','8788','--inspector-port','0'],{stdio:['ignore','pipe','pipe']});
let output='';worker.stdout.on('data',data=>output+=data);worker.stderr.on('data',data=>output+=data);
try{
 let ready=false;
 for(let i=0;i<150;i++){
  if(worker.exitCode!==null)throw Error('Worker exited: '+output.slice(-2000));
  try{const r=await fetch('http://127.0.0.1:8788/api/course-progress');if(r.status===401){ready=true;break;}}catch{}
  await new Promise(r=>setTimeout(r,200));
 }
 if(!ready)throw Error('Worker did not become ready: '+output.slice(-2000));
 for(const file of ['tests/grammar-api-integration.py','tests/course-api-integration.py']){
  const child=spawn('python',[file],{stdio:'inherit',env:{...process.env,CHINESE_OS_TEST_BASE:'http://127.0.0.1:8788'}});
  process.exitCode=await new Promise(resolve=>child.on('exit',resolve));
  if(process.exitCode)break;
 }
}finally{worker.kill('SIGTERM');if(process.exitCode)console.error(output.slice(-5000));}
