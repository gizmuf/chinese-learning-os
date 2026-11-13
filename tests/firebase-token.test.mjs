import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {generateKeyPair,SignJWT} from 'jose';
const output=await build({entryPoints:['app/firebase-token.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {verifyFirebaseToken}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const {publicKey,privateKey}=await generateKeyPair('RS256');
const project='chinese-os-test';const now=Math.floor(Date.now()/1000);
async function token({aud=project,iss=`https://securetoken.google.com/${project}`,sub='alice',verified=true,exp=now+300,iat=now-5,authTime=now-10,key=privateKey}={}) {
 return new SignJWT({email:'alice@example.test',email_verified:verified,name:'Alice',auth_time:authTime}).setProtectedHeader({alg:'RS256',kid:'fixture'}).setSubject(sub).setAudience(aud).setIssuer(iss).setIssuedAt(iat).setExpirationTime(exp).sign(key);
}
const resolver=async()=>publicKey;
test('verified Firebase identity uses a namespaced immutable account ID',async()=>{
 const user=await verifyFirebaseToken(await token(),project,resolver);assert.equal(user.userId,'firebase:alice');assert.equal(user.email,'alice@example.test');
});
test('tokens for another project or issuer are rejected',async()=>{
 await assert.rejects(verifyFirebaseToken(await token({aud:'another-project'}),project,resolver));
 await assert.rejects(verifyFirebaseToken(await token({iss:'https://attacker.example'}),project,resolver));
});
test('unverified emails and invalid time claims cannot sync',async()=>{
 for(const options of [{verified:false},{exp:now-10},{iat:now+60},{authTime:now+60}])await assert.rejects(verifyFirebaseToken(await token(options),project,resolver));
});
test('a modified or incorrectly signed identity token is rejected',async()=>{
 const other=await generateKeyPair('RS256');await assert.rejects(verifyFirebaseToken(await token({key:other.privateKey}),project,resolver));
 const value=await token();const parts=value.split('.');parts[1]=Buffer.from(JSON.stringify({sub:'bob',email_verified:true})).toString('base64url');
 await assert.rejects(verifyFirebaseToken(parts.join('.'),project,resolver));
});
test('empty identities and oversized tokens are rejected',async()=>{
 await assert.rejects(verifyFirebaseToken(await token({sub:''}),project,resolver));
 await assert.rejects(verifyFirebaseToken('x'.repeat(20001),project,resolver));
});
