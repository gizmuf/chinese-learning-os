export const referenceMaterialIds=['time-dates','movement-directions','shang'] as const;
export type ReferenceMaterialId=typeof referenceMaterialIds[number];
export type ReferenceEntry={id:string;hanzi:string;pinyin:string;en:string;sourcePages:number[];note?:string;origin?:'source'|'practice'};
export type ReferenceTopic={id:string;title:string;explanation:string;sourcePages:number[];termIds:string[];exampleIds:string[];visualIntent:string;correction?:string};
export type ReferenceCheck={id:string;kind:'meaning'|'hanzi'|'pinyin';prompt:string;targetId:string;optionIds:string[];sourcePages:number[];scene?:{kind:'movement';direction:number;speakerAtEnd:boolean}};
export type ReferenceSourcePage={page:number;topicIds:string[];summary:string;correction?:string};
export type ReferenceLesson={
 id:ReferenceMaterialId;title:string;intro:string;
 source:{filename:string;sha256:string;pages:number};
 terms:ReferenceEntry[];examples:ReferenceEntry[];topics:ReferenceTopic[];checks:ReferenceCheck[];coverage:ReferenceSourcePage[];
};
export type ReferenceDraft={choice:string;assisted:boolean;attemptId:string;submittedAt:number|null};
export type ReferenceCheckpoint={version:1;owner:string;material:ReferenceMaterialId;topicId:string;frame:number;checkId:string;review:{id:string;mode:'due'|'difficult';ids:string[]}|null;drafts:Record<string,ReferenceDraft>};
