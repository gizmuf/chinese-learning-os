'use client';
import {Lesson08Practice} from './lesson08';
import {Lesson07Practice} from './lesson07';
import {CoursePractice} from './intensive-course';
import {Lesson04Practice} from './lesson04';
import {Lesson05Practice} from './lesson05';
import {Lesson06Practice} from './lesson06';
import type {CourseEvent} from './course-learning';
type Props={id:string;number:number;ids:string[];owner:string|null;ready:boolean;record:(e:CourseEvent)=>Promise<void>;notify:(s:string)=>void;onComplete:()=>void};
/** Reuse the exact lesson assessment components and event IDs; never create a second progress store. */
export default function CourseReviewSession({id,number,ids,owner,ready,record,notify,onComplete}:Props){
 return <div className={'course-space today-course-session '+(number>=6?'lesson06-space':'lesson04-space lesson04-focused')}>
 {number===3&&<CoursePractice {...{ids,record,ready,notify}} onFinish={onComplete}/>}
 {number===4&&<Lesson04Practice sessionKey={id} {...{owner,record,ready,notify,onComplete}} mode="check" checkIds={ids}/>}
 {number===5&&<Lesson05Practice sessionKey={id} {...{owner,record,ready,notify,onComplete}} mode="check" checkIds={ids}/>}
 {number===8&&<Lesson08Practice {...{ids,record,ready,notify}}/>}
 {number===7&&<Lesson07Practice {...{ids,record,ready,notify}}/>}
 {number===6&&<Lesson06Practice {...{ids,record,ready,notify}}/>}
 </div>;
}
