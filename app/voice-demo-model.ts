export const demoFruits=[
 ['apple','苹果','píngguǒ','apple'],['banana','香蕉','xiāngjiāo','banana'],['orange','橙子','chéngzi','orange'],['grape','葡萄','pútao','grape'],['watermelon','西瓜','xīguā','watermelon'],['pear','梨','lí','pear'],['strawberry','草莓','cǎoméi','strawberry'],['mango','芒果','mángguǒ','mango'],['peach','桃子','táozi','peach'],['pineapple','菠萝','bōluó','pineapple'],['lemon','柠檬','níngméng','lemon'],['cherry','樱桃','yīngtáo','cherry'],['blueberry','蓝莓','lánméi','blueberry'],['coconut','椰子','yēzi','coconut'],['kiwi','猕猴桃','míhóutáo','kiwifruit'],
] as const;
export function validatedFruitIds(input:unknown):string[]|null {
 if(!Array.isArray(input)||input.length<1||input.length>15||input.some(v=>typeof v!=='string'||!demoFruits.some(f=>f[0]===v)))return null;
 return [...new Set(input)];
}
export function pcm16(samples:Float32Array){const out=new Uint8Array(samples.length*2),view=new DataView(out.buffer);for(let i=0;i<samples.length;i++){const v=Math.max(-1,Math.min(1,samples[i]));view.setInt16(i*2,Math.round(v*(v<0?32768:32767)),true);}return out;}
