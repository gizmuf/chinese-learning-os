import source from '../data/hanzi-sprint.json';
import type {Locale} from './translate';

type Meaning = {en: string} & Partial<Record<Locale, string>>;
export type SprintExample = {text: string; pinyin: string; meaning: Meaning; audio?: string; source?: string};
export type SprintCharacter = {
  hanzi: string; pinyin: string; meaning: string; level: number; part: string; clue: string;
  meanings?: Meaning; word?: SprintExample; sentence?: SprintExample;
};
export const sprintCatalog: readonly SprintCharacter[] = source;
export const sprintByHanzi = new Map(sprintCatalog.map(character => [character.hanzi, character]));
export const sprintKey = 'hanzi-sprint-v1';
export const sprintDays = 14;
export const lessonDays = 12;
export const dayInMs = 86_400_000;

export type Recall = {meaning: boolean; reading: boolean};
export type SprintRecord = {
  baseline?: Recall;
  latest?: Recall;
  due?: number;
  streak?: number;
  reviewedDay?: number;
  written?: boolean;
  studied?: boolean;
};
export type SprintState = {version: 1; started: number; records: Record<string, SprintRecord>};

export const freshSprint = (): SprintState => ({version:1, started:0, records:{}});
export function completeRecall(result: Recall | undefined) {
  return result?.meaning===true && result.reading===true;
}
export function sprintDay(state: SprintState, now: number) {
  if (!state.started) return 1;
  const calendar = (time: number) => {
    const date = new Date(time);
    return Date.UTC(date.getFullYear(),date.getMonth(),date.getDate());
  };
  return Math.min(sprintDays, Math.max(1, Math.floor((calendar(now)-calendar(state.started))/dayInMs)+1));
}
export function writeSprintRecord(state: SprintState, hanzi: string, changes: SprintRecord, now: number) {
  if (!sprintByHanzi.has(hanzi)) return state;
  return {...state, started:state.started||now, records:{...state.records,[hanzi]:{...state.records[hanzi],...changes}}};
}
export function recallSprintCharacter(state: SprintState, hanzi: string, result: Recall, now: number, baseline = false, day = 1) {
  if (baseline) return writeSprintRecord(state,hanzi,{baseline:result},now);
  const streak = completeRecall(result) ? Math.min((state.records[hanzi]?.streak??0)+1, 3) : 0;
  const due = now + [0,1,3,7][streak]*dayInMs;
  return writeSprintRecord(state,hanzi,{latest:result,streak,due,reviewedDay:day},now);
}
function mixKey(text: string) {
  return Math.imul(text.codePointAt(0)??0,2654435761)>>>0;
}
export const diagnosticOrder = [...sprintCatalog].sort((a,b)=>mixKey(a.hanzi)-mixKey(b.hanzi));
export function diagnosticQueue(state: SprintState) {
  return diagnosticOrder.filter(item=>!state.records[item.hanzi]?.baseline);
}
export function dailySprintPlan(state: SprintState) {
  const byPart = new Map<string,SprintCharacter[]>();
  for(const item of sprintCatalog) {
    if(completeRecall(state.records[item.hanzi]?.baseline)) continue;
    const key=item.clue+':'+item.part;
    const family=byPart.get(key)??[];
    family.push(item);
    byPart.set(key,family);
  }
  const order=[...byPart.values()].flat(), days:SprintCharacter[][]=Array.from({length:lessonDays},()=>[]);
  const groups=sprintGroups(order);
  let day=0, scheduled=0;
  for(const group of groups){
    const threshold=(day+1)*order.length/lessonDays;
    if(day<lessonDays-1 && days[day].length && scheduled+group.members.length/2>threshold) day++;
    days[day].push(...group.members);
    scheduled+=group.members.length;
  }
  return days;
}
export function sprintGroups(rows: readonly SprintCharacter[]) {
  const groups:{part:string; clue:string; members:SprintCharacter[]}[]=[];
  for(const item of rows){
    const last=groups.at(-1);
    if(last?.part===item.part&&last.clue===item.clue&&last.members.length<6)last.members.push(item);
    else groups.push({part:item.part,clue:item.clue,members:[item]});
  }
  return groups;
}
export function restoreSprint(value: SprintState | undefined) {
  return value?.version===1&&value.records&&Number.isFinite(value.started)?value:freshSprint();
}
export function reviewSprintQueue(state: SprintState, daily: readonly SprintCharacter[], now: number, cumulative: boolean, day: number, repeat = false) {
  const todays=new Set(daily.map(item=>item.hanzi));
  return diagnosticOrder.filter(item=>{
    const record=state.records[item.hanzi];
    if (record?.reviewedDay===day) return repeat && !completeRecall(record.latest);
    return cumulative || todays.has(item.hanzi) || (record?.due!==undefined&&record.due<=now);
  }).sort((a,b)=>{
    const due = (item:SprintCharacter) => {
      const time = state.records[item.hanzi]?.due;
      return time===undefined ? 1 : time<=now ? 0 : 2;
    };
    return due(a)-due(b);
  });
}
export function difficultSprintCharacters(state: SprintState) {
  return diagnosticOrder.filter(item=>{
    const record=state.records[item.hanzi], result=record?.latest??record?.baseline;
    return !!result && !completeRecall(result) && !record.written;
  });
}
