import time from '../data/reference-lessons/time-dates.json';
import movement from '../data/reference-lessons/movement-directions.json';
import shang from '../data/reference-lessons/shang.json';
import type {ReferenceLesson,ReferenceMaterialId} from './reference-lesson-types';
export const referenceLessons=[time,movement,shang] as ReferenceLesson[];
export const referenceLessonEventIds={
 'time-dates':'reference-time-dates',
 'movement-directions':'reference-movement-directions',
 shang:'reference-shang',
} as const;
export const referenceLessonById=new Map(referenceLessons.map(lesson=>[lesson.id,lesson]));
export const referenceEntries=referenceLessons.flatMap(lesson=>[...lesson.terms,...lesson.examples]);
export const referenceEntryById=new Map(referenceEntries.map(entry=>[entry.id,entry]));
export const referenceActivityIds=Object.fromEntries(referenceLessons.map(lesson=>[referenceLessonEventIds[lesson.id],[...lesson.checks.map(check=>check.id),...lesson.topics.map(topic=>'study:'+topic.id)]])) as Record<typeof referenceLessonEventIds[ReferenceMaterialId],string[]>;
export const referenceLessonHref=(id:ReferenceMaterialId,section='overview',review?:'due'|'difficult')=>'/?'+new URLSearchParams({course:'intensive',material:'reference-'+id,section,...(review?{review}:{})});
/** Do not turn January into an example containing November (十一月). */
export function referenceWordOccurs(text:string,word:string){
 let index=text.indexOf(word);
 while(index!==-1){const before=text[index-1]??'',after=text[index+word.length]??'',number=/[零一二三四五六七八九十百千万两]/u;
  if(!(number.test(word[0])&&number.test(before))&&!(number.test(word.at(-1)??'')&&number.test(after)))return true;
  index=text.indexOf(word,index+1);
 }
 return false;
}
