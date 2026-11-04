import source from '../data/lesson12/content.json';
import recordings from '../data/lesson12/audio.json';
import type {Copy} from './course-data';
import type {Pronunciation} from './atlas-spatial-model';
export const lesson12={id:'intensive-12' as const,number:12,date:source.date,title:source.title as Copy};
export type Lesson12Entry={id:string;family:string;hanzi:string;pinyin:string;meaning:Copy;origin:string;chunks?:string[]};
export const lesson12Words=source.words as Lesson12Entry[],lesson12Sentences=source.sentences as Lesson12Entry[];
export const lesson12All=[...lesson12Words,...lesson12Sentences],lesson12ById=new Map(lesson12All.map(v=>[v.id,v]));
export const lesson12Topics=source.topics;
export const lesson12Audio=(v:Pick<Lesson12Entry,'id'>)=>(recordings as Record<string,{source:string}>)[v.id]?.source;
export const lesson12Pronunciation=(v:Lesson12Entry):Pronunciation|undefined=>{const source=lesson12Audio(v);return source?{text:v.hanzi,pinyin:v.pinyin,source,context:false,kind:v.chunks?'sentence':'word'}:undefined;};
export const campusBuildings=[
 {id:'school',text:'学校',x:2,y:4,sentence:'c12-s035'},
 {id:'bookshop',text:'书店',x:1,y:2,sentence:'c12-s030'},
 {id:'bank',text:'银行',x:3,y:2,sentence:'c12-s022'},
 {id:'dorm1',text:'1号楼',x:1,y:1,sentence:'c12-s026'},
 {id:'dorm2',text:'2号楼',x:3,y:1,sentence:'c12-s026'},
 {id:'dorm3',text:'3号楼',x:1,y:0,sentence:'c12-s026'},
 {id:'dorm4',text:'4号楼',x:3,y:0,sentence:'c12-s027'},
];
export type Cardinal='东边'|'西边'|'北边'|'南边';
export function campusDirection(a:{x:number;y:number},b:{x:number;y:number}):Cardinal|null{if(a.y===b.y&&a.x!==b.x)return a.x>b.x?'东边':'西边';if(a.x===b.x&&a.y!==b.y)return a.y<b.y?'北边':'南边';return null;}
export function relativeDirection(direction:Cardinal,facing:'north'|'south'){const north={东边:'右边',西边:'左边',北边:'前边',南边:'后边'};const south={东边:'左边',西边:'右边',北边:'后边',南边:'前边'};return (facing==='north'?north:south)[direction];}
const word=(hz:string)=>lesson12Words.find(v=>v.hanzi===hz)!;
const dirs=['东边','西边','北边','南边'].map(word);
const pairs=[['bank','bookshop'],['bookshop','bank'],['dorm1','bookshop'],['bookshop','dorm1'],['dorm4','dorm3'],['dorm3','dorm4'],['dorm4','dorm2'],['dorm2','dorm4']];
export type Lesson12Check={id:string;targetId:string;optionIds:string[];mode:'map'|'read'|'listen'|'usage';question?:string;pair?:string[]};
export const lesson12MapChecks:Lesson12Check[]=pairs.map(([a,b],i)=>{const A=campusBuildings.find(v=>v.id===a)!,B=campusBuildings.find(v=>v.id===b)!,target=word(campusDirection(A,B)!);return {id:'c12-map-'+(i+1),targetId:target.id,optionIds:dirs.map(v=>v.id),mode:'map',question:A.text+'在'+B.text+'的哪边？',pair:[a,b]};});
export const lesson12UsageChecks:Lesson12Check[]=[
 ['sit','我___地铁回家。','坐',['坐','做','座','租']],
 ['do','下课后我___作业。','做',['坐','做','座','租']],
 ['building','那是一___楼。','座',['做','坐','租','座']],
 ['located','银行___书店东边。','在',['再','在','坐','做']],
 ['then','先复习，___做作业。','再',['在','座','再','坐']],
 ['bike','我自己___电动车去学校。','骑',['开','坐','打','骑']],
 ['find','我在___我的钱。','找',['找','千','钱','座']],
 ['chairs','我的房间有___椅子。','两把',['一张','一套','两把','一座楼']],
].map(([id,question,target,options])=>({id:'c12-usage-'+id,mode:'usage',question:question as string,targetId:word(target as string).id,optionIds:(options as string[]).map(h=>word(h).id)}));
export const lesson12Checks:Lesson12Check[]=[...lesson12MapChecks,...lesson12UsageChecks,...lesson12Words.flatMap((v,i)=>{const pool=lesson12Words.filter(w=>w.id!==v.id&&w.meaning.en!==v.meaning.en).sort((a,b)=>Number(b.family===v.family)-Number(a.family===v.family));const opts=[v,...pool.slice(0,3)];const shift=(i+1)%4,optionIds=[...opts.slice(shift),...opts.slice(0,shift)].map(w=>w.id);return (['read','listen'] as const).map(mode=>({id:'c12-check-'+v.id+'-'+mode,targetId:v.id,optionIds,mode}));})];
export const lesson12ActivityIds=[...lesson12Checks.map(q=>q.id),...lesson12Topics.map(t=>'study:c12-'+t.id)];
