export type MyDayView={version:1;hanzi:boolean;pinyin:boolean;english:boolean;single:boolean;chunks:boolean;index:number;scrollY:number};
export const defaultMyDayView:MyDayView={version:1,hanzi:true,pinyin:true,english:true,single:false,chunks:false,index:0,scrollY:0};
type ViewStorage=Pick<Storage,'getItem'|'setItem'>;
const viewOnly=(v:MyDayView):MyDayView=>({version:1,hanzi:v.hanzi,pinyin:v.pinyin,english:v.english,single:v.single,chunks:v.chunks,index:v.index,scrollY:v.scrollY});
export function myDayViewKey(owner:string){return 'chinese-os-my-day-view-v1:'+encodeURIComponent(owner);}
export function validMyDayView(value:unknown):value is MyDayView{
 if(!value||typeof value!=='object')return false;const v=value as MyDayView;
 return v.version===1&&['hanzi','pinyin','english','single','chunks'].every(k=>typeof v[k as keyof MyDayView]==='boolean')&&Number.isInteger(v.index)&&v.index>=0&&v.index<26&&Number.isFinite(v.scrollY)&&v.scrollY>=0&&v.scrollY<=10000000;
}
/** Session-scoped view preferences only. No sentence content or learning records. */
export function readMyDayView(storage:ViewStorage,owner:string):MyDayView{try{const v=JSON.parse(storage.getItem(myDayViewKey(owner))??'null');return validMyDayView(v)?viewOnly(v):{...defaultMyDayView};}catch{return {...defaultMyDayView};}}
export function saveMyDayView(storage:ViewStorage,owner:string,view:MyDayView){if(!validMyDayView(view))return false;try{storage.setItem(myDayViewKey(owner),JSON.stringify(viewOnly(view)));return true;}catch{return false;}}
