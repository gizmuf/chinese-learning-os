import {myDaySentences} from './my-day-lesson-model';
import shuoshuo from '../data/shuoshuo-morning.json';
import {grammarFrames} from './chunk-library-data';

/** Authored meaning groups for this source version; not lexical token boundaries. */
export const myDayMeaningGroups:readonly (readonly string[])[]=[
 ['我每天','八点左右','醒来。'],
 ['二十到三十分钟后，','我起床。'],
 ['然后','我去厨房','做早饭。'],
 ['因为我不吃肉，','所以早饭','我做素菜。'],
 ['然后','我吃早饭。'],
 ['早饭后，','我准备出门，','因为我得去学校。'],
 ['我走出家门，','走路去学校。'],
 ['我家离学校很近，','走路只要十分钟。'],
 ['路上，','我用微信','点一杯咖啡。'],
 ['到学校以后，','我在楼下','取咖啡。'],
 ['然后','我走进教室。'],
 ['我的课','早上八点四十分','开始。'],
 ['十点十分，','我们休息','二十分钟。'],
 ['休息的时候，','我走出教室。'],
 ['中午十二点，','我们休息','一个小时。'],
 ['我吃午饭。'],
 ['下午一点，','我还有','一个半小时的中文课。'],
 ['下午两点半下课以后，','我回家。'],
 ['到家以后，','我进屋','开始工作。'],
 ['我在家工作，','也学中文。'],
 ['下午','我通常','出去散步。'],
 ['有时候我走半个小时，','有时候走两个小时。'],
 ['我在附近走走，','有时候买点东西。'],
 ['然后','我回到家，','继续工作。'],
 ['晚上','我练习中文。'],
 ['晚上十一点左右，','我上床睡觉。'],
];

/** Reviewed source occurrences, deliberately bounded; no automatic construction inference. */
const occurrences=[
 ['my-day-01-v2:4','connect-cause',['因为','所以']],
 ['my-day-01-v2:8','distance-li',['离','近']],
 ['my-day-01-v2:10','time-after',['以后']],
 ['my-day-01-v2:18','time-after',['以后']],
 ['my-day-01-v2:19','time-after',['以后']],
 ['shuoshuo:s007','connect-cause',['因为','所以']],
 ['shuoshuo:s013','time-simultaneous',['一边','一边']],
 ['shuoshuo:s034','connect-if',['如果','就']],
 ['shuoshuo:s035','connect-if',['如果','就']],
] as const;
export type ReaderPatternOccurrence={sourceId:string;frameId:string;text:string;markers:{text:string;start:number;end:number}[]};
function sourceText(id:string){return id.startsWith('my-day-01-v2:')?myDaySentences[Number(id.split(':')[1])-1]?.hanzi:shuoshuo.sentences.find(s=>'shuoshuo:'+s.id===id)?.hanzi;}
export const readerPatternOccurrences:ReaderPatternOccurrence[]=occurrences.map(([sourceId,frameId,markers])=>{
 const text=sourceText(sourceId),frame=grammarFrames.find(f=>f.id===frameId);if(!text||!frame)throw Error('Unknown reviewed reader occurrence: '+sourceId);
 let offset=0;return {sourceId,frameId,text,markers:markers.map(marker=>{const start=text.indexOf(marker,offset);if(start<0)throw Error('Reader construction marker missing: '+sourceId);offset=start+marker.length;return {text:marker,start,end:offset};})};
});
export function patternsForSource(sourceId:string){return readerPatternOccurrences.filter(o=>o.sourceId===sourceId);}
