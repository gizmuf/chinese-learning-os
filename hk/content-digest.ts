// HTTP guest adapter: local content identity only, never authentication.
export async function contentDigest(algorithm:string,input:Uint8Array<ArrayBuffer>):Promise<ArrayBuffer>{
if(algorithm!=='SHA-256')throw Error('Only SHA-256 content hashing supported');
if(globalThis.crypto?.subtle)return crypto.subtle.digest('SHA-256',input);
const constants=new Uint32Array(64),initial:number[]=[];
for(let n=2,i=0;i<64;n++){let prime=true;for(let d=2;d*d<=n;d++)if(n%d===0){prime=false;break;}if(prime){if(i<8)initial.push((Math.sqrt(n)%1)*0x100000000>>>0);constants[i++]=(Math.cbrt(n)%1)*0x100000000>>>0;}}
const data=new Uint8Array(Math.ceil((input.length+9)/64)*64);data.set(input);data[input.length]=128;
const view=new DataView(data.buffer),bits=input.length*8;view.setUint32(data.length-8,Math.floor(bits/0x100000000));view.setUint32(data.length-4,bits>>>0);
const h=new Uint32Array(initial),w=new Uint32Array(64),rotr=(x:number,n:number)=>(x>>>n)|(x<<(32-n));
for(let offset=0;offset<data.length;offset+=64){for(let i=0;i<16;i++)w[i]=view.getUint32(offset+i*4);
for(let i=16;i<64;i++){const x=w[i-15],y=w[i-2];w[i]=(w[i-16]+(rotr(x,7)^rotr(x,18)^(x>>>3))+w[i-7]+(rotr(y,17)^rotr(y,19)^(y>>>10)))>>>0;}
let [a,b,c,d,e,f,g,k]=h;for(let i=0;i<64;i++){const t1=(k+(rotr(e,6)^rotr(e,11)^rotr(e,25))+((e&f)^(~e&g))+constants[i]+w[i])>>>0,t2=((rotr(a,2)^rotr(a,13)^rotr(a,22))+((a&b)^(a&c)^(b&c)))>>>0;k=g;g=f;f=e;e=(d+t1)>>>0;d=c;c=b;b=a;a=(t1+t2)>>>0;}[a,b,c,d,e,f,g,k].forEach((v,i)=>{h[i]=(h[i]+v)>>>0;});}
const result=new ArrayBuffer(32),out=new DataView(result);h.forEach((v,i)=>out.setUint32(i*4,v));return result;
}
