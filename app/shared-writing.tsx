"use client";
import {createContext,useContext,useMemo,useState,useEffect,type ReactNode} from 'react';
import type {Item,Mode} from './content';
import {items} from './content';
import type {LearningEvent} from './learning';
import {saveDraft} from './local-store';
import {useI18n} from './i18n';
import {appStudyDictionary} from './study-lookup-model';
import Writing from './writing-practice';
import {studyExamples} from './study-examples';
import {localizeItem} from './translate';

type WritingContext = {db: IDBDatabase|null; record: (event: LearningEvent)=>Promise<void>;
  penOnly: boolean; setPenOnly:(value:boolean)=>void; notify:(message:string)=>void};
const Context = createContext<WritingContext|null>(null);
export function WritingPracticeProvider({value,children}:{value:WritingContext;children:ReactNode}) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
/** Contextual entry to the existing full studio; its scores can never become recognition recall. */
export default function SharedWriting({hanzi,item: supplied,pinyin,meaning,penOnly: explicitPen,setPenOnly: explicitSetPen,notify: explicitNotify,onSave,onBack,initialMode='watch',onModeChange,audio:explicitAudio}: {
  hanzi: string; item?: Item; pinyin?: string; meaning?: string; penOnly?: boolean; setPenOnly?:(value:boolean)=>void;
  notify?:(message:string)=>void; onSave?:()=>Promise<void>; onBack?:()=>void; initialMode?:Mode; onModeChange?:(mode:Mode)=>void; audio?:{word?:string;sentence?:string};
}) {
  const context = useContext(Context), {locale,t} = useI18n();
  const [mode,setLocalMode] = useState<Mode>(initialMode);
  const setMode=(next:Mode)=>{setLocalMode(next);onModeChange?.(next);};
  useEffect(()=>setLocalMode(initialMode),[initialMode]);
  const [attemptRun,setAttemptRun] = useState(0);
  const [localPen,setLocalPen] = useState(false);
  const known = items.find(i=>i.hanzi===hanzi);
  const example=useMemo(()=>studyExamples(hanzi,locale,1)[0],[hanzi,locale]);
  const definition=useMemo(()=>appStudyDictionary(locale).get(hanzi),[hanzi,locale]);
  const item = useMemo(() => {
    const cleanHanzi = [...hanzi].filter(ch=>/\p{Script=Han}/u.test(ch)).join('');
    if (supplied) return {...supplied,hanzi:cleanHanzi};
    if (known) {const localized=localizeItem(known,locale);return {...localized,pinyin:pinyin??localized.pinyin,english:meaning??localized.english};}

    return {id:'context-writing:'+hanzi,lesson:'context-writing',hanzi:cleanHanzi,pinyin:pinyin??definition?.pinyin??'',
      english:meaning??definition?.meaning??'',sentence:example?.text??'',sentencePinyin:example?.pinyin??'',translation:example?.meaning??''} satisfies Item;
  }, [hanzi,supplied,known,definition,example,pinyin,meaning,locale]);
  const notify = explicitNotify ?? context?.notify ?? (()=>{});
  const record = async (event:LearningEvent) => {
    // The model was visible immediately before this contextual exercise, so this is supported
    // memory practice even in Recall. Independent writing reviews still use the studio directly.
    const supported = {...event,skill:'writing' as const,assisted:true};
    if (onSave) {await onSave(); return;}
    if (!context?.db) throw Error('Writing storage is not ready');
    if (known) await context.record({...supported,itemId:known.id});
    else await saveDraft(context.db,'writing-practice:'+item.id,supported);
  };
  return <section className="shared-writing-exercise">
    <p>{t('Supported memory practice · writing has its own progress.')}</p>
    <Writing key={item.id+':'+mode+':'+attemptRun} item={item} mode={mode} setMode={setMode} db={context?.db??null}
      record={record} supported audio={explicitAudio??(known||supplied?undefined:{word:definition?.audio?.source,sentence:example?.audio?.source})} nextLabel={t(onBack?'Back':'Practice again')} next={onBack??(()=>{setMode('watch');setAttemptRun(n=>n+1);})}
      penOnly={explicitPen??context?.penOnly??localPen} setPenOnly={explicitSetPen??context?.setPenOnly??setLocalPen}
      left={false} notify={notify} session={false}/>
  </section>;
}
