import {hanziStyles} from './hanzi-style-preference';
import {z} from 'zod';
import {atlasEventSchema} from './atlas-learning';
import {courseEventSchema} from './course-learning';
import {eventSchema} from './event-schema';
import {feedbackSchema, labEventSchema} from './connection-lab-model';
import {recognitionAttemptSchema} from './recognition-history';
import {privateLibraryKey, privateLessonKey, privateLessonSchema, parsePrivateLesson, stablePrivateJson, validReader, type LocalLesson} from './private-lessons-model';
import {lesson11PracticeKey, restoreLesson11Practice} from './lesson11-practice-state';
import {lesson12PracticeKey, restoreLesson12Practice} from './lesson12-practice-state';
import {referenceLessonById, referenceLessons} from './reference-lessons-data';
import {referenceCheckpointKey, restoreReferenceCheckpoint} from './reference-lesson-state';
import {readingLabGuestKey, validateReadingLabSession} from './reading-lab-session';
import {readingReviewGuestKey, validateReadingReviewStore} from './reading-lab-review-model';
import {companionDraftKey, validCompanion} from './shuoshuo-companion-model';
import {studioDraftKey, validStudio} from './study-studio-model';
import {practiceBookKey} from './practice-book';
import {guestBackupDigest} from './guest-backup-digest';

export const eventStores = ['progress', 'atlas', 'course', 'recognition', 'connectionLab'] as const;
export type EventStore = typeof eventStores[number];
const schemas = {progress: eventSchema, atlas: atlasEventSchema, course: courseEventSchema, recognition: recognitionAttemptSchema,
 connectionLab: z.union([feedbackSchema, labEventSchema])};
const int = z.number().int().nonnegative().safe();
const uuid = z.string().uuid();
const hash = z.string().regex(/^[a-f0-9]{64}$/);
const hanzi = z.string().regex(/^[\p{Script=Han}]{1,12}$/u);
const text = z.string().max(16_000);
const modes = ['watch','trace','copy','recall'] as const;
const levels = ['hsk1','hsk2','hsk3','bonus'] as const;
const point = z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),p:z.number().min(0).max(1),t:z.number().nonnegative()}).strict();
const strokes = z.array(z.array(point).max(1501)).max(50);
const wordStrokes = z.array(strokes).max(100);
const localAudio = z.object({
 text, pinyin:text.optional(), context:z.boolean(), kind:z.enum(['word','character','sentence']).optional(),
 source:z.string().max(700).regex(/^\/(?!\/)[^\s\\]*\.mp3(?:\?v=[\w.-]+)?$/i),
}).strict();
const contextual = z.object({text,pinyin:text,meaning:text,sourceId:text.optional(),audio:localAudio.optional()}).strict();
const plainEvent = z.object({id:uuid,itemId:text,skill:z.enum(['meaning','writing','listening','pinyin','hanzi-from-pinyin','ime']),
 mode:z.enum(modes),rating:z.number().int().min(0).max(4),assisted:z.boolean(),at:int,timezone:z.string().max(100),
 detail:z.object({strokes:wordStrokes.optional(),hints:int.optional(),mistakes:int.optional(),duration:z.number().nonnegative().optional(),input:text.optional()}).strict()}).strict();
const recognitionDraft = z.object({
 version:z.literal(1),id:text,itemIds:z.array(text).min(1).max(10_000),index:int,practice:z.boolean().optional(),
 attempts:z.record(z.string(),z.object({phase:z.union([z.literal(1),z.literal(2),z.literal(3)]),assisted:z.boolean(),started:int,
  event:eventSchema.optional(),saved:z.boolean().optional(),due:text.optional()}).strict()),
 last:z.object({hanzi:text,due:text.optional()}).strict().optional(),
}).strict().refine(value=>value.index<=value.itemIds.length && new Set(value.itemIds).size===value.itemIds.length);
const practiceChoice = z.object({text:hanzi,pinyin:text,meaning:text,addedAt:int,
 contextual:contextual.optional(),audio:localAudio.optional()}).strict();
const practiceChoices = z.array(practiceChoice).refine(choices=>new Set(choices.map(choice=>choice.text)).size===choices.length);
const privateLibrary = z.object({
 version:z.literal(1),revision:int,selected:hash.nullable(),
 entries:z.array(z.object({title:z.string().max(180),sourceHash:hash,contentHash:hash,revision:int,sourceCount:int,sentenceCount:int}).strict()).max(50),
}).strict().refine(value=>new Set(value.entries.map(entry=>entry.sourceHash)).size===value.entries.length
 && (value.selected===null || value.entries.some(entry=>entry.contentHash===value.selected)));

const exactDrafts = new Map<string,z.ZodType>([
 ['settings',z.object({penOnly:z.boolean(),hanziStyle:z.enum(hanziStyles).optional(),highlightComponents:z.boolean().optional(),
  slowAudio:z.boolean().optional(),level:z.enum(levels).optional(),hskScope:z.union([z.literal(1),z.literal(2),z.literal(3),z.literal(4),z.literal(5),z.literal(6),z.literal('7-9'),z.literal('all')]).optional(),left:z.boolean(),minutes:int}).strict()],
 [studioDraftKey,z.custom(validStudio)],
 [companionDraftKey,z.custom(validCompanion)],
 [practiceBookKey,practiceChoices],
 [privateLibraryKey,privateLibrary],
 ['grammar-hsk3-v1',z.record(z.string(),z.object({picked:int,checked:z.boolean()}).strict())],
]);
const practiceInk = z.record(z.string().regex(/^(?:word:)?[\p{Script=Han}]{1,12}$/u),z.array(strokes.nullish()).max(64));
const readerRecord=z.object({index:int,phases:z.array(z.union([z.literal(1),z.literal(2),z.literal(3)])).max(200),
 showRaw:z.boolean(),written:z.array(text).max(40).optional(),lessonWritten:z.array(text).max(40).optional(),
 chunks:z.boolean().optional(),scrollY:z.number().nonnegative().optional(),layout:z.enum(['full','focus']).optional(),
 showPinyin:z.boolean().optional(),showEnglish:z.boolean().optional(),
 practice:z.object({runId:z.string().max(80),open:z.boolean()}).strict().optional(),
}).strict();
const archive = z.object({version:z.literal(1),lesson:privateLessonSchema,revision:int,lease:z.string().max(128),reader:readerRecord}).strict();
const draftRules: [RegExp,z.ZodType][] = [
 [/^(?:recognition-review-v1|shuoshuo-morning-recognition-v1)(?::recovery:[\w-]+)?$/,recognitionDraft],
 [/^writing:.+:(?:watch|trace|copy|recall)$/u,z.object({strokes:wordStrokes,index:int,assisted:z.boolean(),hints:int,
  revealed:z.boolean().optional(),completed:z.array(int).max(100).optional(),attemptId:uuid.optional()}).strict().refine(row=>row.index<row.strokes.length && (row.completed??[]).every(i=>i<row.strokes.length))],
 [/^notebook:.+/u,z.object({cells:z.record(z.string().regex(/^\d+:\d+$/),strokes),hidden:z.boolean(),attemptId:uuid}).strict()],
 [/^practice-book-ink:[\p{Script=Han}]{1,12}$/u,practiceInk],
 [/^atlas-recall:[\w-]+$/,z.object({ink:strokes,revealed:z.boolean(),readingShown:z.boolean().optional(),id:uuid}).strict()],
 [/^course-recall:[\w-]+$/,z.object({strokes:wordStrokes,revealed:z.boolean(),id:uuid}).strict()],
 [/^language-recall:v1:\[/u,z.object({version:z.literal(1),id:uuid,answer:text,strokes,input:z.enum(['keyboard','handwriting']),
  surface:z.literal('hanzi-grid').optional(),assisted:z.boolean(),compared:z.boolean(),event:plainEvent.nullable(),saved:z.boolean()}).strict()],
 [/^(?:writing-practice:context-writing:|language-supported:).+/u,plainEvent],
];
const forbidden = /^(?:__proto__|prototype|constructor|password|passphrase|secret|clientsecret|apikey|accesskey|privatekey|access_token|accesstoken|refresh_token|refreshtoken|idtoken|token|cookie|authorization|credentials?)$/i;

/** Validate JSON-shaped values before any schema sees untrusted keys. */
export function checkBackupTree(root: unknown) {
 const stack: {value:unknown; depth:number}[] = [{value:root,depth:0}];
 while(stack.length) {
  const {value,depth}=stack.pop()!;
  if (depth>36) throw Error('The backup contains an unsupported nested record.');
  if (value===null || typeof value==='boolean' || typeof value==='string' || value===undefined) continue;
  if (typeof value==='number' && Number.isFinite(value)) continue;
  if (typeof value!=='object' || !value || ![Object.prototype,Array.prototype,null].includes(Object.getPrototypeOf(value))) throw Error('The backup contains a non-JSON record.');
  for (const [key,child] of Object.entries(value)) {
   if (forbidden.test(key)) throw Error('The backup contains a reserved or credential field.');
   stack.push({value:child,depth:depth+1});
  }
 }
}

export function validateEvent(group: EventStore, value: unknown) {
 if(!value || typeof value!=='object' || Array.isArray(value))throw Error('Invalid '+group+' event in the backup.');
 const {synced,...event}=value as {synced?:unknown};
 const parsed=schemas[group].safeParse(event);
 if(!parsed.success)throw Error('Invalid '+group+' event in the backup.');
 if(group==='connectionLab')return parsed.data;
 if(typeof synced!=='boolean')throw Error('A progress backup is missing its save status.');
 return {...parsed.data,synced};
}

export function validateLibrary(value: unknown) {
 return privateLibrary.parse(value);
}

export async function validateDraft(key: string, value: unknown) {
 if (key.length>8000) throw Error('A backup draft key is too long.');
 if (key.startsWith('private-lessons:content:v1:')) {
  const row=archive.parse(value) as LocalLesson;
  if (key!==privateLessonKey(row.lesson.contentHash) || !validReader(row.reader,row.lesson.sentences.length)) throw Error('Invalid private lesson checkpoint.');
  const json=JSON.stringify(row.lesson);
  if(globalThis.crypto?.subtle)await parsePrivateLesson(json);
  else {
   const {sourceHash,contentHash,...content}=row.lesson;
   if(new TextEncoder().encode(json).length>1_000_000
     || guestBackupDigest(stablePrivateJson(row.lesson.sources))!==sourceHash
     || guestBackupDigest(stablePrivateJson(content))!==contentHash)throw Error('Private lesson integrity check failed.');
  }
  return row;
 }
 const schema=exactDrafts.get(key)??draftRules.find(([rule])=>rule.test(key))?.[1];
 if (!schema) throw Error('Unknown notebook record in the backup.');
 return schema.parse(value);
}

export const isKnownDraft = (key: string) => exactDrafts.has(key) || /^private-lessons:content:v1:[a-f0-9]{64}$/.test(key)
 || draftRules.some(([rule])=>rule.test(key));

const appearance=z.object({style:z.enum(hanziStyles),highlight:z.boolean()}).strict();
const position=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1)}).strict();
const windowState=z.object({version:z.literal(2),position,size:z.object({width:z.number().positive(),height:z.number().positive()}).strict()}).strict();
const lesson12Review=/^chineseos:lesson12-practice:v1:guest:review:[\da-f-]{36}$/i;
const sceneId=z.string().regex(/^[a-z][a-z0-9_-]{0,80}$/i).refine(id=>!forbidden.test(id));
const sceneProgress=z.object({objects:z.array(sceneId).max(300),actions:z.array(sceneId).max(300)}).strict();
const sceneKeys=['scene-lab-discovery-v1','scene-lab-teacher-discovery-v1'];
const referenceKeys=new Map(referenceLessons.map(lesson=>[referenceCheckpointKey(null,lesson.id),lesson.id]));
export function isKnownPreference(key:string) {
 return ['chinese-os-language','chinese-os-appearance','chinese-os:hanzi-appearance:v1','chinese-os:dictionary-window-v2','chinese-os:dictionary-position-v1',readingLabGuestKey,readingReviewGuestKey,
  lesson11PracticeKey(null),lesson12PracticeKey(null),...sceneKeys].includes(key) || referenceKeys.has(key) || lesson12Review.test(key);
}

export function validatePreference(key:string, raw:string) {
 if (key==='chinese-os-language') return z.enum(['en','fr','ru','tr']).parse(raw);
 if (key==='chinese-os-appearance') return z.enum(['light','dark','system']).parse(raw);
 const value:unknown=JSON.parse(raw);
 checkBackupTree(value);
 if (sceneKeys.includes(key))return JSON.stringify(sceneProgress.parse(value));
 if (key==='chinese-os:hanzi-appearance:v1') return JSON.stringify(appearance.parse(value));
 if (key==='chinese-os:dictionary-window-v2') return JSON.stringify(windowState.parse(value));
 if (key==='chinese-os:dictionary-position-v1') return JSON.stringify(position.parse(value));
 const sanitized=key===readingLabGuestKey?validateReadingLabSession(value):
  key===readingReviewGuestKey?validateReadingReviewStore(value):
  key===lesson11PracticeKey(null)?restoreLesson11Practice(raw,null):
  key===lesson12PracticeKey(null)||lesson12Review.test(key)?restoreLesson12Practice(raw,null):
  referenceKeys.has(key)?restoreReferenceCheckpoint(raw,null,referenceLessonById.get(referenceKeys.get(key)!)!):undefined;
 if (!sanitized || !sameBackupValue(value,sanitized)) throw Error('Invalid guest checkpoint in the backup.');
 return JSON.stringify(sanitized);
}

export function sameBackupValue(left:unknown,right:unknown):boolean {
 if (left===right) return true;
 if (!left || !right || typeof left!=='object' || typeof right!=='object' || Array.isArray(left)!==Array.isArray(right)) return false;
 const entries=Object.entries(left).filter(([,value])=>value!==undefined);
 const object=right as Record<string,unknown>;
 return entries.length===Object.values(object).filter(value=>value!==undefined).length
  && entries.every(([key,value])=>Object.hasOwn(object,key) && sameBackupValue(value,object[key]));
}
