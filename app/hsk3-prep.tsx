'use client';

import { useState } from 'react';
import { ArrowRight, BookOpen, Ear, FileText, ListChecks, Network, PenLine } from 'lucide-react';
import { StudyText } from './study-lookup-context';
import { hskPrepTasks } from './hsk3-prep-data';
import './hsk3-prep.css';

const links = [
  {name:'Hanzi checklist', detail:'655 to recognize · 250 to write', href:'/?study=library&hsk=3&level=hsk3#hsk-exam', icon:ListChecks},
  {name:'Vocabulary', detail:'1,000 syllabus entries · HSK 1–3', href:'/?study=library&hsk=3&level=hsk3', icon:BookOpen},
  {name:'Grammar', detail:'HSK 1–3 syllabus and practice', href:'/?grammar=hsk3', icon:FileText},
  {name:'Character families', detail:'Cloud Atlas · HSK 1–3', href:'/?atlas=1&cloud=1&hsk=3&layout=family', icon:Network},
  {name:'Reading Lab', detail:'Read Hanzi, with tones or Pinyin', href:'/?atlas=1&reader=1&hsk=3&aid=tones&chunks=1', icon:BookOpen},
] as const;

const taskLabels = {listen:'Listening',read:'Reading',character:'Write a character',sentence:'Write a sentence',speaking:'Speak aloud'};
type Aid = 'hanzi' | 'tones' | 'pinyin';

function ReviewLine({text,pinyin,aid}:{text:string;pinyin:string;aid:Aid}) {
  return <StudyText text={text} pinyin={pinyin} annotateTones={aid==='tones'} annotatePinyin={aid==='pinyin'}/>;
}

export default function Hsk3Prep() {
  const [position,setPosition]=useState(0);
  const [choice,setChoice]=useState<number|null>(null);
  const [draft,setDraft]=useState('');
  const [checked,setChecked]=useState(false);
  const [results,setResults]=useState<boolean[]>([]);
  const [aid,setAid]=useState<Aid>('hanzi');
  const task=hskPrepTasks[position];
  const automatic=task&&(task.type==='read'||task.type==='listen'||task.type==='character');
  const isCorrect=task&&(task.type==='read'||task.type==='listen'?choice===task.answer:task.type==='character'&&draft.trim()===task.answer);
  function move(next:number) {
    setPosition(next);
    setChoice(null);
    setDraft('');
    setChecked(false);
  }
  function check() {
    if(checked)return;
    if(automatic)setResults(current=>[...current,Boolean(isCorrect)]);
    setChecked(true);
  }

  return <div className="hsk3-prep">
    <header className="hsk3-prep-head">
      <p className="eyebrow">HSK 3.0 · Suzhou · 13 December 2026</p>
      <h1>HSK 3 Exam Prep</h1>
      <p>Review HSK 1–3, then practise the types of tasks you’ll meet on the exam.</p>
    </header>
    <nav className="hsk3-prep-links" aria-label="HSK study material">
      {links.map(({name,detail,href,icon:Icon})=><a key={name} href={href}><Icon size={18} aria-hidden="true"/><span><strong>{name}</strong><small>{detail}</small></span></a>)}
    </nav>
    <section className="panel hsk3-prep-practice" aria-labelledby="hsk3-prep-practice">
      <h2 id="hsk3-prep-practice">Short diagnostic</h2>
      {!task?<div role="status">
        <p><strong>{results.filter(Boolean).length}/{results.length}</strong> correct on automatically checked tasks.</p>
        <p>Sentence writing and speaking use example answers for self-review.</p>
        <button type="button" className="secondary" onClick={()=>{setResults([]);move(0);}}>Start again</button>
      </div>:<>
        <div className="hsk3-prep-task-label"><span>{taskLabels[task.type]}</span><span>{position+1} / {hskPrepTasks.length}</span></div>
        {task.type==='listen'&&<div className="hsk3-prep-player"><Ear size={19} aria-hidden="true"/><audio controls preload="none" src={task.audio} aria-label="Recorded Mandarin dialogue"/></div>}
        {task.type==='read'&&<div className="hsk3-prep-passage">
          {task.text.map(line=><p key={line.hanzi} lang="zh-Hans">{checked?<ReviewLine text={line.hanzi} pinyin={line.pinyin} aid={aid}/>:line.hanzi}</p>)}
        </div>}
        <p className="hsk3-prep-question" lang="zh-Hans">{task.prompt}</p>
        {(task.type==='listen'||task.type==='read')&&<fieldset className="hsk3-prep-options" disabled={checked}>
          <legend className="sr-only">Your answer</legend>
          {task.choices.map((option,index)=><label key={option} data-correct={checked&&index===task.answer}><input type="radio" name="hsk3-choice" checked={choice===index} onChange={()=>setChoice(index)}/><span lang="zh-Hans">{option}</span></label>)}
        </fieldset>}
        {(task.type==='character'||task.type==='sentence')&&<label className="hsk3-prep-input">
          <span>Your answer</span>
          {task.type==='character'?<input lang="zh-Hans" autoComplete="off" value={draft} onChange={e=>setDraft(e.target.value)} disabled={checked}/>
           :<textarea lang="zh-Hans" rows={2} value={draft} onChange={e=>setDraft(e.target.value)} disabled={checked}/>}
        </label>}
        {task.type==='speaking'&&<p>Answer aloud, then compare with the example.</p>}
        {checked&&<div className="hsk3-prep-feedback" aria-live="polite">
          {automatic&&<strong>{isCorrect?'Correct':'Review this answer'}</strong>}
          {task.type==='listen'&&<p lang="zh-Hans"><StudyText text={task.transcript}/></p>}
          {'example' in task&&<p lang="zh-Hans"><StudyText text={task.example}/></p>}
          {task.type==='read'&&<div className="hsk3-prep-aids" role="group" aria-label="Reading aid">
            {([['hanzi','Hanzi'],['tones','Tones'],['pinyin','Pinyin']] as const).map(([value,label])=><button key={value} type="button" className="secondary" aria-pressed={aid===value} onClick={()=>setAid(value)}>{label}</button>)}
          </div>}
          <p>{task.explanation}</p>
        </div>}
        {checked?<button type="button" className="secondary" onClick={()=>move(position+1)}>{position===hskPrepTasks.length-1?'See result':'Next'} <ArrowRight size={16}/></button>
          :<button type="button" className="secondary" disabled={task.type==='read'||task.type==='listen'?choice===null:task.type!=='speaking'&&!draft.trim()} onClick={check}><PenLine size={16}/> {automatic?'Check answer':'See example'}</button>}
      </>}
    </section>
    <section className="hsk3-prep-session" aria-labelledby="hsk3-prep-session">
      <h2 id="hsk3-prep-session">A 75-minute study session</h2>
      <ol>
        <li><strong>20 min</strong> · Recall yesterday’s words and characters before looking.</li>
        <li><strong>20 min</strong> · Study one grammar pattern and use it in your own sentences.</li>
        <li><strong>20 min</strong> · Read a passage and answer questions on a recorded dialogue.</li>
        <li><strong>15 min</strong> · Write from Pinyin, then answer one speaking prompt aloud.</li>
      </ol>
    </section>
    <p className="hsk3-prep-source">Try the full format on the <a href="https://www.chinesetest.cn/hsk">official HSK site</a>.</p>
  </div>;
}
