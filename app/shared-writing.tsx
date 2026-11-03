"use client";
import {createContext,useContext,useMemo,useState,useEffect,type ReactNode} from 'react';
import type {Item,Mode} from './content';
import {items} from './content';
import type {DictionaryContext} from './dictionary-source-model';
import type {LearningEvent} from './learning';
import {saveDraft} from './local-store';
import {useI18n} from './i18n';
import {appStudyDictionary} from './study-lookup-model';
import LanguagePracticeSet from './language-practice-set';
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
export default function SharedWriting({hanzi,item: supplied,pinyin,meaning,penOnly: explicitPen,setPenOnly: explicitSetPen,notify: explicitNotify,onSave,onBack,initialMode='watch',onModeChange,audio:explicitAudio,contextual}: {
  hanzi: string; contextual?:DictionaryContext; item?: Item; pinyin?: string; meaning?: string; penOnly?: boolean; setPenOnly?:(value:boolean)=>void;
  notify?:(message:string)=>void; onSave?:()=>Promise<void>; onBack?:()=>void; initialMode?:Mode; onModeChange?:(mode:Mode)=>void; audio?:{word?:string;sentence?:string};
}) {
  const context = useContext(Context), {locale,t} = useI18n();
  const [mode,setLocalMode] = useState<Mode>(initialMode);
  const setMode=(next:Mode)=>{setLocalMode(next);onModeChange?.(next);};
  useEffect(()=>setLocalMode(initialMode),[initialMode]);
  const [languageOpen,setLanguageOpen]=useState(false);
  const [attemptRun,setAttemptRun] = useState(0);
  const [localPen,setLocalPen] = useState(false);
  const known = supplied?items.find(i=>i.id===supplied.id&&i.hanzi===hanzi&&i.pinyin===supplied.pinyin):items.find(i=>i.hanzi===hanzi);
  const canonical = !contextual&&(!pinyin||pinyin===known?.pinyin)&&(!meaning||!known||meaning===localizeItem(known,locale).english)?known:undefined;
  const example=useMemo(()=>studyExamples(hanzi,locale,1)[0],[hanzi,locale]);
  const definition=useMemo(()=>appStudyDictionary(locale).get(hanzi),[hanzi,locale]);
  const item = useMemo(() => {
    const cleanHanzi = [...hanzi].filter(ch=>/\p{Script=Han}/u.test(ch)).join('');
    if(contextual){return {id:'context-writing:'+hanzi+':'+(contextual.sourceId??contextual.text)+':'+(pinyin??''),lesson:'context-writing',hanzi:cleanHanzi,pinyin:pinyin??definition?.pinyin??'',english:meaning??definition?.meaning??'',sentence:contextual.text,sentencePinyin:contextual.pinyin,translation:contextual.meaning} satisfies Item;}
    if (supplied) return {...supplied,hanzi:cleanHanzi};
    if (canonical) {const localized=localizeItem(canonical,locale);return {...localized,pinyin:pinyin??localized.pinyin,english:meaning??localized.english};}

    return {id:'context-writing:'+hanzi,lesson:'context-writing',hanzi:cleanHanzi,pinyin:pinyin??definition?.pinyin??'',
      english:meaning??definition?.meaning??'',sentence:pinyin||meaning?'':example?.text??'',sentencePinyin:pinyin||meaning?'':example?.pinyin??'',translation:pinyin||meaning?'':example?.meaning??''} satisfies Item;
  }, [hanzi,supplied,canonical,contextual,definition,example,pinyin,meaning,locale]);
  const notify = explicitNotify ?? context?.notify ?? (()=>{});
  const record = async (event:LearningEvent) => {
    // The model was visible immediately before this contextual exercise, so this is supported
    // memory practice even in Recall. Independent writing reviews still use the studio directly.
    const supported = {...event,skill:'writing' as const,assisted:true};
    if (onSave) {await onSave(); return;}
    if (!context?.db) throw Error('Writing storage is not ready');
    if (canonical) await context.record({...supported,itemId:canonical.id});
    else await saveDraft(context.db,'writing-practice:'+item.id,supported);
  };
  return <section className="shared-writing-exercise">
    <p>{t('Supported memory practice · writing has its own progress.')}</p>
    <Writing key={item.id+':'+mode+':'+attemptRun} item={item} mode={mode} setMode={setMode} db={context?.db??null}
      record={record} supported contextExample={!!contextual} audio={contextual?{word:explicitAudio?.word,sentence:contextual.audio?.text===contextual.text?contextual.audio.source:undefined}:explicitAudio??(canonical||supplied?undefined:{word:pinyin||meaning?undefined:definition?.audio?.source,sentence:pinyin||meaning?undefined:example?.audio?.source})} nextLabel={t(onBack?'Back':'Practice again')} next={onBack??(()=>{setMode('watch');setAttemptRun(n=>n+1);})}
      penOnly={explicitPen??context?.penOnly??localPen} setPenOnly={explicitSetPen??context?.setPenOnly??setLocalPen}
      left={false} notify={notify} session={false}/>
    <details className="shared-language-details" onToggle={event=>setLanguageOpen(event.currentTarget.open)}><summary>Pinyin, tones & Chinese keyboard practice</summary>{languageOpen&&<SharedLanguagePractice hanzi={item.hanzi} pinyin={item.pinyin} meaning={item.english} sourceId={item.id} penOnly={explicitPen??context?.penOnly??localPen} setPenOnly={explicitSetPen??context?.setPenOnly??setLocalPen}/>}</details>
  </section>;
}

/** Same contextual bridge for lessons, dictionary and Atlas; visible models stay assisted. */
export function SharedLanguagePractice({hanzi,pinyin,meaning,sourceId,penOnly,setPenOnly}:{hanzi:string;pinyin:string;meaning:string;sourceId:string;penOnly?:boolean;setPenOnly?:(value:boolean)=>void}){
 const context=useContext(Context);const canonical=items.find(item=>item.hanzi===hanzi&&item.pinyin===pinyin);
 const item:Item=canonical?{...canonical,pinyin,english:meaning}:{id:'context-language:'+sourceId,lesson:'context-language',hanzi,pinyin,english:meaning,sentence:'',sentencePinyin:'',translation:''};
 return <LanguagePracticeSet item={item} db={context?.db??null} penOnly={penOnly??context?.penOnly??false} setPenOnly={setPenOnly??context?.setPenOnly??(()=>{})} supported notify={context?.notify??(()=>{})} record={async event=>{if(!context?.db)throw Error('Storage is not ready');if(canonical)await context.record({...event,assisted:true});else await saveDraft(context.db,'language-supported:'+item.id+':'+event.id,{...event,assisted:true});}}/>;
}
