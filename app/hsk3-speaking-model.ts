import bank from '../data/hsk3-speaking.json';
import alternate from '../data/hsk3-speaking-b.json';
import type { HskExamForm } from './hsk3-form';

export type SpeakingTask = {
  kind: 'repeat' | 'picture' | 'question';
  prompt: string;
  example?: string;
  picture?: string;
  alt?: string;
};

export const speakingTasks = bank.tasks as SpeakingTask[];
const alternateSpeakingTasks = alternate as SpeakingTask[];
export const speakingTasksFor = (form:HskExamForm) => form === 'a' ? speakingTasks : alternateSpeakingTasks;
export const speakingSections = {
  repeat: { title: 'Listen and repeat', duration: 10 },
  picture: { title: 'Describe the picture', duration: 15 },
  question: { title: 'Answer the question', duration: 90 },
} as const;

type AudioStep = { phase: 'listen'; question: number; clip: string };
type TimedStep = { phase: 'prepare' | 'record'; question: number; seconds: number };
export type SpeakingStep = AudioStep | TimedStep;
export type RecordedAnswer = { question: number; audio: Blob };

export function speakingAudio(name:string, form:HskExamForm='a') {
  const question = /^question-(\d\d)$/.exec(name);
  const isSeparate = form === 'b' && question && alternateSpeakingTasks[Number(question[1])-1]?.kind !== 'picture';
  return '/audio/' + (isSeparate ? 'hsk3-speaking-b' : 'hsk3-speaking') + '/' + name + '.mp3';
}
export const questionClip = (index: number) => 'question-' + String(index+1).padStart(2, '0');

function createSpeakingSteps(tasks:SpeakingTask[]):SpeakingStep[] {
  return [
    {phase:'listen',question:0,clip:'welcome'},
    ...tasks.flatMap<SpeakingStep>((task,question)=>{
      const steps:SpeakingStep[]=[];
      if(task.kind!==tasks[question-1]?.kind) {
        steps.push({phase:'listen',question,clip:task.kind==='repeat'?'repeat':task.kind==='picture'?'pictures':'questions'});
      }
      steps.push({phase:'listen',question,clip:questionClip(question)});
      if(task.kind==='question') {
        steps.push({phase:'prepare',question,seconds:180},{phase:'listen',question,clip:'speak-now'});
      }
      steps.push({phase:'record',question,seconds:speakingSections[task.kind].duration});
      return steps;
    }),
  ];
}

export const speakingSteps = createSpeakingSteps(speakingTasks);
const alternateSpeakingSteps = createSpeakingSteps(alternateSpeakingTasks);
export const speakingStepsFor = (form:HskExamForm) => form === 'a' ? speakingSteps : alternateSpeakingSteps;

export function speakingClock(seconds: number) {
  return Math.floor(seconds/60) + ':' + String(seconds%60).padStart(2,'0');
}
