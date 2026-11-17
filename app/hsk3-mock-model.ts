import data from '../data/hsk3-mock.json';
import type { Stroke } from './learning';

const minute = 60_000;
const pictures: Record<string,string> = {
  '🚌':'公交车','🚲':'自行车','🚇':'地铁','📚':'书','🎟️':'票','🧳':'行李','🍜':'面条','🍚':'米饭','🥟':'饺子',
  '🏥':'医院','🏫':'学校','🏨':'宾馆','💐':'花','🎂':'蛋糕','📕':'书','🚕':'出租车','❄️':'雪','☀️':'晴天','🌧️':'雨',
  '🕒':'三点','🕔':'五点','🕗':'八点','🏀':'篮球','⚽':'足球','🏓':'乒乓球','👕':'衣服','👟':'鞋','🎒':'书包','🏊':'游泳','👗':'裙子','👞':'皮鞋','🧤':'手套','🚄':'高铁','✈️':'飞机',
};
type OptionTask = {
  kind:'choice'; id:number; prompt:string; options:string[]; answer:string;
  audio?:string; transcript?:string; passage?:string; pictures?:boolean;
};
type WriteTask = { kind:'character'|'sentence'; id:number; prompt:string; answer:string; example:string };
export type MockTask = OptionTask | WriteTask;
export type MockSection = { name:string; duration:number; tasks:MockTask[] };

function rotate(options:string[], index:number) {
  const offset = (index + Math.floor(index / options.length)) % options.length;
  return [...options.slice(offset), ...options.slice(0,offset)];
}

function matchingOptions(rows:string[][], index:number, answerColumn:number, distractor:string) {
  const start=Math.floor(index/5)*5;
  return rotate([...rows.slice(start,start+5).map(row=>row[answerColumn]),distractor],start);
}

export function pictureLabel(picture:string) { return pictures[picture] ?? picture; }

export const mockSections:MockSection[] = [
  {name:'Listening',duration:23*minute,tasks:data.listening.map(([first,reply,question,answer,...wrong], index) => ({
    kind:'choice', id:index, prompt:index<10?'Choose the picture that matches the recording.':'Listen and select the best answer.',
    options:index<10?matchingOptions(data.listening,index,3,index<5?'🎟️':'🚇'):rotate([answer,...wrong],index),
    answer, pictures:index<10,
    audio:`/audio/hsk3-mock/listening-${String(index+1).padStart(2,'0')}.mp3`,
    transcript:[first,reply,question].filter(Boolean).join('\n'),
  }))},
  {name:'Reading',duration:30*minute,tasks:data.reading.map(([passage,second,third,fourth,fifth], index) => {
    const answer=index<20?second:third;
    const options=index<20?[second,third,fourth]:[third,fourth,fifth];
    const prompt=index<10?'Choose the best reply.':index<20?'Choose the word that completes the sentence.':second;
    return {kind:'choice',id:index+30,prompt,options:index<10?matchingOptions(data.reading,index,1,index<5?'我昨天去了图书馆。':'冰箱里面还有牛奶。'):rotate(options,index),answer,passage};
  })},
  {name:'Writing',duration:20*minute,tasks:data.writing.map(([prompt,answer,example],index)=>({
    kind:index<5?'character':'sentence',id:index+60,prompt,answer,example,
  }))},
];

export type Attempt = {
  section:number; position:number; deadline:number;
  answers:Record<number,string>; ink:Record<number,Stroke[]>;
};

export function beginMock(now:number):Attempt {
  return {section:0,position:0,deadline:now+mockSections[0].duration,answers:{},ink:{}};
}

export function finishMockSection(attempt:Attempt, now:number):Attempt {
  const section=attempt.section+1;
  return {...attempt,section,position:0,deadline:now+(mockSections[section]?.duration??0)};
}

export function syncMockClock(attempt:Attempt, now:number):Attempt {
  let current=attempt;
  while (current.section<mockSections.length&&now>=current.deadline) current=finishMockSection(current,current.deadline);
  return current;
}

export function hasMockInk(ink:Stroke[]|undefined) {
  return ink?.some(stroke=>stroke.length>0)??false;
}

export function scoreMockSection(section:MockSection,attempt:Attempt) {
  let correct=0, automatic=0, review=0, answered=0;
  for(const task of section.tasks) {
    const answer=attempt.answers[task.id]?.trim()??'';
    const ink=hasMockInk(attempt.ink[task.id]);
    if(answer||ink) answered++;
    if(task.kind==='sentence'||(!answer&&ink)) {
      if(answer||ink) review++;
      continue;
    }
    automatic++;
    if(answer===task.answer) correct++;
  }
  return {correct,automatic,review,answered};
}
