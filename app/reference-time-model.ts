export type ReferenceCaption={hanzi:string;pinyin:string;en:string};
const digits=['零','一','二','三','四','五','六','七','八','九'];
const readings=['líng','yī','èr','sān','sì','wǔ','liù','qī','bā','jiǔ'];
export function referenceNumber(n:number){
 if(!Number.isInteger(n)||n<0||n>99)throw Error('Number is outside this lesson');
 if(n<10)return {hanzi:digits[n],pinyin:readings[n]};
 const tens=Math.floor(n/10),ones=n%10;
 return {hanzi:(tens===1?'':digits[tens])+'十'+(ones?digits[ones]:''),pinyin:(tens===1?'shí':readings[tens]+'shí')+(ones?(ones===2?"'":'')+readings[ones]:'')};
}
export const referenceClockPresets=[420,485,495,510,520,525,610,870] as const;
export function referenceClockCaption(total:number,formal=false):ReferenceCaption{
 if(!Number.isInteger(total)||total<0||total>=1440)throw Error('Invalid practice clock');
 const hour=Math.floor(total/60),minute=total%60,spoken=hour%12||12;
 const h=formal?referenceNumber(hour):spoken===2?{hanzi:'两',pinyin:'liǎng'}:spoken===1?{hanzi:'一',pinyin:'yì'}:referenceNumber(spoken);
 let end={hanzi:'',pinyin:''};
 if(minute){
  if(!formal&&minute===15)end={hanzi:'一刻',pinyin:'yí kè'};
  else if(!formal&&minute===30)end={hanzi:'半',pinyin:'bàn'};
  else if(!formal&&minute===45)end={hanzi:'三刻',pinyin:'sān kè'};
  else {const m=referenceNumber(minute);end={hanzi:(minute<10?'零':'')+m.hanzi+'分',pinyin:(minute<10?'líng ':'')+m.pinyin+' fēn'};}
 }
 const prefix=formal?{hanzi:'',pinyin:''}:hour===0?{hanzi:'半夜',pinyin:'bànyè '}:hour<5?{hanzi:'凌晨',pinyin:'língchén '}:hour<8?{hanzi:'早上',pinyin:'zǎoshang '}:hour<12?{hanzi:'上午',pinyin:'shàngwǔ '}:hour===12?{hanzi:'中午',pinyin:'zhōngwǔ '}:hour<18?{hanzi:'下午',pinyin:'xiàwǔ '}:hour===18?{hanzi:'傍晚',pinyin:'bàngwǎn '}:{hanzi:'晚上',pinyin:'wǎnshang '};
 return {hanzi:prefix.hanzi+h.hanzi+'点'+end.hanzi,pinyin:prefix.pinyin+h.pinyin+' diǎn'+(end.pinyin?' '+end.pinyin:''),en:String(hour).padStart(2,'0')+':'+String(minute).padStart(2,'0')};
}
export function referenceCalendarCaption(iso:string):ReferenceCaption{
 const value=new Date(iso+'T12:00:00Z');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(iso)||!Number.isFinite(value.getTime())||value.toISOString().slice(0,10)!==iso)throw Error('Invalid practice date');
 const year=iso.slice(0,4),month=referenceNumber(value.getUTCMonth()+1),day=referenceNumber(value.getUTCDate()),weekday=value.getUTCDay()||7;
 const weekdayText=weekday===7?{hanzi:'日',pinyin:'rì'}:referenceNumber(weekday);
 return {hanzi:'今天是'+[...year].map(n=>digits[Number(n)]).join('')+'年'+month.hanzi+'月'+day.hanzi+'号，星期'+weekdayText.hanzi+'。',pinyin:'Jīntiān shì '+[...year].map(n=>readings[Number(n)]).join(' ')+' nián '+month.pinyin+' yuè '+day.pinyin+' hào, xīngqī '+weekdayText.pinyin+'.',en:'In this practice example, today is '+value.toLocaleDateString('en-GB',{timeZone:'UTC',weekday:'long',day:'numeric',month:'long',year:'numeric'})+'.'};
}
export function referenceCalendarMonth(iso:string,delta:number){
 const current=new Date(iso+'T12:00:00Z'),day=current.getUTCDate();
 current.setUTCDate(1);current.setUTCMonth(current.getUTCMonth()+delta);
 const last=new Date(Date.UTC(current.getUTCFullYear(),current.getUTCMonth()+1,0)).getUTCDate();current.setUTCDate(Math.min(day,last));return current.toISOString().slice(0,10);
}
export const referenceDayparts=[
 {hanzi:'凌晨',pinyin:'língchén',en:'very early morning',hour:2},
 {hanzi:'早上',pinyin:'zǎoshang',en:'morning',hour:7},
 {hanzi:'上午',pinyin:'shàngwǔ',en:'before noon',hour:10},
 {hanzi:'中午',pinyin:'zhōngwǔ',en:'noon',hour:12},
 {hanzi:'下午',pinyin:'xiàwǔ',en:'afternoon',hour:15},
 {hanzi:'傍晚',pinyin:'bàngwǎn',en:'dusk / early evening',hour:18},
 {hanzi:'晚上',pinyin:'wǎnshang',en:'evening / night',hour:21},
 {hanzi:'半夜',pinyin:'bànyè',en:'middle of the night',hour:0},
] as const;
