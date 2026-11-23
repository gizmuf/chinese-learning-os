import early from '../data/practical-2026-11-17/sections-01-07.json';
import late from '../data/practical-2026-11-17/sections-08-14.json';
import practice from '../data/practical-2026-11-17/exercises.json';
import audio from '../data/practical-2026-11-17/audio.json';
import prepared from '../data/lesson-sentence-audio.json';

export const practicalLesson17Id = 'practical-2026-11-17';
export const practicalLesson17Href = '/?course=intensive&material='+practicalLesson17Id;
export const practicalLesson17Title = 'From the market to everyday life';
export const practicalLesson17Date = 'Classroom material · 17 November 2026';

export const practicalLesson17Sections = [...early,...late];
export const practicalLesson17Exercises = practice.exercises;
export const practicalLesson17Review = practice.review;
export const practicalLesson17Audio: Readonly<Record<string,{text:string;source:string} | undefined>> = {...prepared.practice, ...audio};
export type Practical17Entry = {hanzi:string;pinyin:string;english:string};

export function practicalLesson17View(search:string) {
 const params = new URLSearchParams(search);
 const view = params.get('view');
 const topic = practicalLesson17Sections.find(section => section.id===params.get('topic'))?.id ?? practicalLesson17Sections[0].id;
 const requested = Number(params.get('question'));
 const question = Number.isInteger(requested)&&requested>=1&&requested<=practicalLesson17Exercises.length?requested:1;
 return {view:view==='recall'||view==='review'?view:'examples' as const,topic,question};
}
