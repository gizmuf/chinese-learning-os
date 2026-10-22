"use client";
import { useEffect, useState } from "react";
import { ArrowRight, RotateCcw, Volume2 } from "lucide-react";
import { useI18n } from "./i18n";
import { A } from "./atlas-data";
import { atlasStories, storyPinyin, type StoryId } from "./atlas-stories";
import AtlasStory from "./atlas-story";
import { assemblies, wordBuilds, checkAssemblyChoice, type Assembly, type WordBuild, type WordScene } from "./atlas-workshop-data";
import { items } from "./content";
import { atlasByHanzi, atlasItem } from "./atlas-model";
import { speak } from "./audio";
import "./atlas-workshop.css";
import anchorWood from "../public/characters/木.json";
import anchorQing from "../public/characters/青.json";
import anchorSun from "../public/characters/日.json";
const copy = {
 title:A("Make the connection","Faites le lien","Найдите связь"),
 intro:A("Watch a shape. Move its parts. Build a word.","Observez une forme. Déplacez ses parties. Composez un mot.","Увидьте форму. Соедините части. Составьте слово."),
 story:A("Picture stories","Histoires en images","Истории в картинках"),family:A("Character families","Familles de caractères","Семейства знаков"),words:A("Whole words","Mots entiers","Целые слова"),
 join:A("Bring together","Assembler","Соединить"),split:A("Take apart","Séparer","Разобрать"),try:A("Build it yourself","À vous de composer","Соберите сами"),watch:A("Back to exploring","Retour à l’exploration","Вернуться к изучению"),
 prompt:A("Tap the components you need. Repeated parts can be used more than once.","Touchez les composants nécessaires. Une partie répétée peut servir plusieurs fois.","Нажмите нужные компоненты. Повторяющиеся части можно использовать несколько раз."),
 wordPrompt:A("Choose the characters in reading order, from left to right.","Choisissez les caractères de gauche à droite.","Выберите знаки по порядку, слева направо."),
 correct:A("Connected. Now say it aloud, then try writing it from memory.","C’est assemblé. Prononcez-le, puis essayez de l’écrire de mémoire.","Готово. Произнесите вслух, затем попробуйте написать по памяти."),
 retry:A("That piece does not fit here. Look again and try another.","Cette pièce ne convient pas ici. Regardez et essayez une autre.","Эта часть сюда не подходит. Посмотрите ещё раз и попробуйте другую."),
 picked:A("Piece placed. Keep going.","Pièce placée. Continuez.","Часть на месте. Продолжайте."),
 hint:A("Show the model","Voir le modèle","Показать образец"),hide:A("Hide the model","Masquer le modèle","Скрыть образец"),
 practice:A("Guided practice · no review credit","Pratique guidée · sans crédit de révision","Практика с подсказками · без зачёта повторения"),
 meaning:A("Meaning clue","Indice de sens","Подсказка значения"),sound:A("Sound clue","Indice sonore","Подсказка звучания"),shape:A("Modern shape","Forme moderne","Современная форма"),
 fixed:A("The shared part stays; choose what joins it.","La partie commune reste ; choisissez ce qui la rejoint.","Общая часть остаётся; выберите, что к ней присоединится."),
 wood:A("Trees","Arbres","Деревья"),qing:A("A sound family","Une famille sonore","Семейство звучаний"),light:A("Sun & moon","Soleil et lune","Солнце и луна"),
 source:A("Sources & teaching notes","Sources et notes pédagogiques","Источники и пояснения"),
 mnemonic:A("Word memory scene · learn the whole meaning","Image pour retenir le mot · apprenez son sens entier","Образ для слова · учите полное значение"),
 hear:A("Hear the word","Écouter le mot","Слушать слово"),open:A("Open character","Ouvrir le caractère","Открыть иероглиф"),
};
type Mode="story"|"family"|"words";
type Feedback = "" | "retry" | "correct" | "picked";
const storyIds=Object.keys(atlasStories) as StoryId[];
function storyFor(char:string){return storyIds.find(id=>atlasStories[id].character===char);}
function defaultMode(char:string):Mode{return storyFor(char)?"story":"family";}
export default function AtlasWorkshop({character,onComponent,onCharacter,notify}:{character:string;onComponent:(id:string)=>void;onCharacter:(hanzi:string)=>void;notify:(message:string)=>void}) {
 const {locale}=useI18n();
 const [mode,setMode]=useState<Mode>(defaultMode(character));
 const [story,setStory]=useState<StoryId>(storyFor(character)??"wood");
 const [family,setFamily]=useState<Assembly["family"]>(assemblies.find(a=>a.hanzi===character)?.family??"qing");
 const [selected,setSelected]=useState(assemblies.find(a=>a.hanzi===character)?.hanzi??"清");
 const [word,setWord]=useState(wordBuilds.find(w=>w.hanzi.includes(character))?.hanzi??"森林");
 useEffect(()=>{
   const story=storyFor(character),assembly=assemblies.find(a=>a.hanzi===character);
   if(story){setStory(story);setMode("story");}
   else if(assembly){setFamily(assembly.family);setSelected(character);setMode("family");}
   const word=wordBuilds.find(w=>w.hanzi.includes(character));if(word)setWord(word.hanzi);
 },[character]);
 const current=assemblies.find(a=>a.hanzi===selected)??assemblies[0];
 return <section className="atlas-workshop" aria-label={copy.title[locale]}>
   <header className="workshop-intro"><p className="story-kicker">CHINESE OS · ATLAS</p><h3>{copy.title[locale]}</h3><p>{copy.intro[locale]}</p></header>
   <div className="workshop-tabs" role="group" aria-label={copy.title[locale]}>{(["story","family","words"] as const).map(key=><button key={key} aria-pressed={mode===key} onClick={()=>setMode(key)}>{copy[key][locale]}</button>)}</div>
   {mode==="story"?<>
     <div className="workshop-choices">{storyIds.map(id=><button key={id} aria-pressed={story===id} onClick={()=>setStory(id)}><strong lang="zh-Hans">{atlasStories[id].character}</strong><span>{storyPinyin[id]}</span></button>)}</div>
     <AtlasStory character={atlasStories[story].character} onComponent={onComponent} notify={notify}/>
   </>:mode==="family"?<>
     <div className="workshop-families">{(["wood","qing","light"] as const).map(id=><button key={id} aria-pressed={family===id} onClick={()=>{setFamily(id);setSelected(assemblies.find(a=>a.family===id)!.hanzi);}}>{copy[id][locale]}</button>)}</div>
     <p className="workshop-instruction">{copy.fixed[locale]}</p>
     <div className="workshop-choices">{assemblies.filter(a=>a.family===family).map(a=><button key={a.hanzi} aria-pressed={selected===a.hanzi} onClick={()=>setSelected(a.hanzi)}><strong lang="zh-Hans">{a.hanzi}</strong><span>{a.pinyin}</span><small>{a.meaning[locale]}</small></button>)}</div>
     <CharacterBuild key={family} entry={current} notify={notify} onCharacter={onCharacter}/>
   </>:<>
     <div className="workshop-choices">{wordBuilds.map(w=><button key={w.hanzi} aria-pressed={word===w.hanzi} onClick={()=>setWord(w.hanzi)}><strong lang="zh-Hans">{w.hanzi}</strong><span>{w.pinyin}</span></button>)}</div>
     <WordBuilder key={word} entry={wordBuilds.find(w=>w.hanzi===word)!} notify={notify}/>
   </>}
 </section>;
}
function useReducedMotion(){const [reduced,setReduced]=useState(false);useEffect(()=>{const m=matchMedia("(prefers-reduced-motion: reduce)");const f=()=>setReduced(m.matches);f();m.addEventListener("change",f);return()=>m.removeEventListener("change",f);},[]);return reduced;}
function CharacterBuild({entry,notify,onCharacter}:{entry:Assembly;notify:(message:string)=>void;onCharacter:(hanzi:string)=>void}){
 const {locale}=useI18n();const reduced=useReducedMotion();
 const [joined,setJoined]=useState(true),[quiz,setQuiz]=useState(false),[placed,setPlaced]=useState<number[]>([]),[hint,setHint]=useState(false),[message,setMessage]=useState<Feedback>("");
 const [settled,setSettled]=useState(false);
 const [focus,setFocus]=useState<number|null>(null);const [arrived,setArrived]=useState(false);
 useEffect(()=>{setQuiz(false);setPlaced([]);setMessage("");setHint(false);setFocus(null);setJoined(true);setArrived(false);setSettled(false);const timer=setTimeout(()=>setSettled(true),950);let second=0;const first=requestAnimationFrame(()=>{second=requestAnimationFrame(()=>setArrived(true));});return()=>{clearTimeout(timer);cancelAnimationFrame(first);cancelAnimationFrame(second);};},[entry.hanzi]);
 const choices=[...new Map([...entry.parts.map(p=>({glyph:p.glyph,pinyin:p.pinyin})),{glyph:"日",pinyin:"rì"},{glyph:"月",pinyin:"yuè"}].map(p=>[p.glyph,p])).values()].sort((a,b)=>a.glyph.localeCompare(b.glyph));
 const completed=placed.length===entry.parts.length;
 function choose(glyph:string){const index=checkAssemblyChoice(entry.parts,placed,glyph);if(index<0){setMessage("retry");return;}const next=[...placed,index];setPlaced(next);setMessage(next.length===entry.parts.length?"correct":"picked");}
 const audio=atlasByHanzi.get(entry.hanzi);
 return <div className="workshop-build">
  <div className="workshop-result"><strong lang="zh-Hans">{entry.hanzi}</strong><span>{entry.pinyin}</span><p>{entry.meaning[locale]}</p></div>
  <svg viewBox="0 0 640 340" className="workshop-stage" role="img" aria-label={`${entry.hanzi} · ${entry.pinyin} · ${entry.meaning[locale]}`}>
   <rect x="187" y="34" width="266" height="266" rx="10" fill="#fffefa" stroke="#d4dfce"/>
   <path d="M320 34V300M187 167H453" stroke="#dce4d5" strokeDasharray="4 7"/>
   {entry.parts.map((part,i)=>{
     const isIn=quiz?placed.includes(i):joined&&(arrived||part.anchor);
     const x=part.anchor?0:i%2===0?-100:100,y=part.anchor?0:entry.parts.length===3&&i===2?30:0;
     const shown=!quiz||placed.includes(i)||hint;
     return <g key={part.anchor?"anchor":`${entry.hanzi}-${i}`} style={{transform:`translate(${isIn?0:x}px,${isIn?0:y}px)`,opacity:shown?focus!==null&&focus!==i?.22:1:.055,transition:reduced?"none":"transform 900ms cubic-bezier(.22,.7,.2,1), opacity 450ms"}}>
       {part.anchor && <g style={{opacity:settled||reduced?0:1,transition:reduced?"none":"opacity 200ms"}}><MovingAnchor entry={entry} indices={part.strokes} reduced={reduced}/></g>}
       <g transform="translate(187 34) scale(.259765625) translate(0 900) scale(1 -1)" fill={part.role==="sound"?"#a77740":part.anchor?"#456b55":"#719e9c"} style={{opacity:!part.anchor||settled||reduced?1:0,transition:reduced?"none":"opacity 200ms"}}>
         {part.strokes.map(j=><path key={j} d={entry.data.strokes[j]}/>)}
       </g>
     </g>;
   })}
  </svg>
  <div className="workshop-parts">{entry.parts.map((p,i)=><button key={i} aria-pressed={focus===i} onClick={()=>setFocus(focus===i?null:i)}><strong lang="zh-Hans">{p.glyph}</strong><span>{p.pinyin}</span><small>{p.name[locale]} · {copy[p.role][locale]}</small></button>)}</div>
  <p className="workshop-note">{entry.note[locale]}</p>
  <div className="workshop-actions">
   {!quiz&&<button className="workshop-primary" onClick={()=>{setJoined(!joined);setArrived(true);setFocus(null);}}>{joined?copy.split[locale]:copy.join[locale]}<ArrowRight size={16}/></button>}
   <button onClick={()=>{setQuiz(!quiz);setPlaced([]);setMessage("");setHint(false);setFocus(null);}}>{quiz?copy.watch[locale]:copy.try[locale]}</button>
   {audio&&<button onClick={()=>{const item=atlasItem(audio,locale);speak(item.sentence,notify,item);}}><Volume2 size={16}/>{copy.hear[locale]}</button>}
   {audio&&<button onClick={()=>onCharacter(entry.hanzi)}>{copy.open[locale]}<ArrowRight size={16}/></button>}
  </div>
  {quiz&&<div className="workshop-quiz"><p>{copy.prompt[locale]}</p><div className="workshop-choices">{choices.map(p=><button key={p.glyph} disabled={completed} onClick={()=>choose(p.glyph)}><strong>{p.glyph}</strong><span>{p.pinyin}</span></button>)}</div><div className="workshop-actions"><button onClick={()=>setHint(!hint)}>{hint?copy.hide[locale]:copy.hint[locale]}</button><button onClick={()=>{setPlaced([]);setMessage("");setHint(false);}}><RotateCcw size={16}/>{locale==="fr"?"Recommencer":locale==="ru"?"Сначала":"Start again"}</button><span>{placed.length} / {entry.parts.length}</span></div><p role="status">{message ? copy[message][locale] : ""}</p><small>{copy.practice[locale]}</small></div>}
  <details className="workshop-source"><summary>{copy.source[locale]}</summary><p><a href={entry.source} target="_blank" rel="noreferrer">Dong Chinese · {entry.hanzi} · {entry.pinyin} ↗</a> · <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">CC BY-SA 4.0</a></p><p>{locale==="fr"?"Notes adaptées ; illustrations pédagogiques originales.":locale==="ru"?"Адаптированные пояснения; оригинальные учебные иллюстрации.":"Adapted notes; original teaching illustrations."}</p></details>
 </div>;
}
// A stable canonical component moves/resizes between family members. Once it
// lands, the exact target outlines replace it; no font substitution is used.
function MovingAnchor({entry,indices,reduced}:{entry:Assembly;indices:number[];reduced:boolean}) {
 const data=entry.family==="qing"?anchorQing:entry.family==="wood"?anchorWood:anchorSun;
 function bounds(points:number[][]){const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);return {x:Math.min(...xs),y:Math.max(...ys),w:Math.max(...xs)-Math.min(...xs),h:Math.max(...ys)-Math.min(...ys)};}
 const from=bounds(data.medians.flat()),to=bounds(indices.flatMap(i=>entry.data.medians[i]));
 const scale=.259765625,sx=to.w/from.w*scale,sy=to.h/from.h*scale;
 return <g style={{transform:`translate(${187+to.x*scale}px,${34+(900-to.y)*scale}px) scale(${sx},${sy})`,transition:reduced?"none":"transform 900ms cubic-bezier(.22,.7,.2,1)"}} fill={entry.family==="qing"?"#a77740":"#456b55"}><g transform={`translate(${-from.x} ${from.y}) scale(1 -1)`}>{data.strokes.map((d,i)=><path key={i} d={d}/>)}</g></g>;
}
export function WordSceneArt({scene}:{scene:WordScene}){
 return <g fill="none" strokeLinecap="round" strokeLinejoin="round">
  {scene==="forest"?<g fill="#b4c4a3" stroke="#72917a" strokeWidth="3">{[180,230,285,350,410,460].map((x,i)=><g key={x} transform={`translate(${x} ${195+(i%2)*20})`}><path d="M0 0V64"/><path d="M0 -80L-36 12H36Z"/><path d="M0 -42L-45 36H45Z"/></g>)}</g>:
  scene==="volcano"?<><path d="M150 280L280 120H355L490 280Z" fill="#b8c6ad"/><path d="M280 120L300 191L325 163L341 211L355 120" fill="#d9a171"/><path d="M304 99Q272 58 299 42M333 95Q375 64 352 32" stroke="#d7ac78" strokeWidth="12"/></>:
  scene==="water"?<><path d="M247 119H393L376 274H264Z" fill="#d7e8e3" stroke="#8db3ad" strokeWidth="3"/><path d="M259 191Q289 170 319 190T383 190L376 274H264Z" fill="#a4c8c4"/><path d="M319 63Q289 99 319 113Q347 101 319 63Z" fill="#8cb5b3"/></>:
  scene==="tomorrow"?<><circle cx="320" cy="186" r="69" fill="#e9ca85"/><path d="M137 240Q226 180 320 237T503 237V294H137Z" fill="#b6c7a9"/><path d="M320 88V64M240 110L225 92M401 110L416 92" stroke="#d9b474" strokeWidth="4"/></>:
  scene==="phone"?<><path d="M238 256Q200 183 226 177L260 209V260Q276 286 326 284H360" stroke="#b5c2a4" strokeWidth="17"/><rect x="266" y="67" width="112" height="200" rx="18" fill="#e2e9da" stroke="#638973" strokeWidth="4"/><rect x="278" y="91" width="88" height="141" rx="7" fill="#b7cdc4"/><circle cx="322" cy="249" r="5" fill="#638973"/></>:
  <><rect x="218" y="89" width="204" height="146" rx="12" fill="#c3d5cc" stroke="#6a8d7d" strokeWidth="4"/><path d="M213 235L190 265Q320 282 450 265L427 235Z" fill="#aebfa6"/><path d="M322 118L294 161H322L310 203L350 150H325Z" fill="#e7c681"/></>}
 </g>;
}
function WordBuilder({entry,notify}:{entry:WordBuild;notify:(message:string)=>void}){
 const {locale}=useI18n();const reduced=useReducedMotion();
 const [joined,setJoined]=useState(false),[quiz,setQuiz]=useState(false),[placed,setPlaced]=useState(0),[message,setMessage]=useState<Feedback>("");
 const atlasAudio=[...atlasByHanzi.values()].find(c=>c.word===entry.hanzi);
 const item=items.find(i=>i.hanzi===entry.hanzi)??(atlasAudio?{...atlasItem(atlasAudio,locale),hanzi:entry.hanzi}:undefined);
 const choices=[...new Map([...entry.parts,{hanzi:"木",pinyin:"mù"},{hanzi:"日",pinyin:"rì"}].map(p=>[p.hanzi,p])).values()].sort((a,b)=>a.hanzi.localeCompare(b.hanzi));
 return <div className="workshop-build">
  <div className="workshop-result"><strong lang="zh-Hans">{entry.hanzi}</strong><span>{entry.pinyin}</span><p>{entry.meaning[locale]}</p></div>
  <svg className="workshop-stage word-stage" viewBox="0 0 640 390" role="img" aria-label={`${entry.hanzi} · ${entry.pinyin} · ${entry.meaning[locale]}`}>
   <g style={{opacity:joined||quiz&&placed===entry.parts.length?1:.12,transition:reduced?"none":"opacity 900ms"}}><WordSceneArt scene={entry.scene}/></g>
   {entry.parts.map((p,i)=>{const inPlace=quiz?placed>i:joined;return <g key={i} style={{transform:`translate(${inPlace?231+i*92:92+i*348}px,${inPlace?290:110}px) scale(${inPlace?.09:.13})`,opacity:quiz&&placed<=i?.08:1,transition:reduced?"none":"transform 950ms cubic-bezier(.22,.7,.2,1), opacity 500ms"}}><g transform="translate(0 900) scale(1 -1)" fill={i===0?"#365e4e":"#a5753c"}>{p.data.strokes.map((d,j)=><path key={j} d={d}/>)}</g></g>;})}
  </svg>
  <div className="workshop-parts word-parts">{entry.parts.map(p=><div key={p.hanzi}><strong>{p.hanzi}</strong><span>{p.pinyin}</span><small>{p.meaning[locale]}</small></div>)}</div>
  <p className="workshop-note">{entry.note[locale]}</p>
  <div className="workshop-actions"><button className="workshop-primary" onClick={()=>{setQuiz(false);setJoined(!joined);}}>{joined?copy.split[locale]:copy.join[locale]}<ArrowRight size={16}/></button><button onClick={()=>{setQuiz(!quiz);setPlaced(0);setJoined(false);setMessage("");}}>{quiz?copy.watch[locale]:copy.try[locale]}</button>{item&&<button onClick={()=>speak(item.hanzi,notify,item)}><Volume2 size={16}/>{copy.hear[locale]}</button>}</div>
  {quiz&&<div className="workshop-quiz"><p>{copy.wordPrompt[locale]}</p><div className="workshop-choices">{choices.map(p=><button key={p.hanzi} disabled={placed===entry.parts.length} onClick={()=>{if(entry.parts[placed]?.hanzi===p.hanzi){setPlaced(placed+1);setMessage(placed+1===entry.parts.length?"correct":"picked");}else setMessage("retry");}}><strong>{p.hanzi}</strong><span>{p.pinyin}</span></button>)}</div><p role="status">{message ? copy[message][locale] : ""}</p><small>{copy.practice[locale]}</small></div>}
  <details className="workshop-source"><summary>{copy.source[locale]}</summary><p>{copy.mnemonic[locale]}</p><a href={entry.source} target="_blank" rel="noreferrer">Dong Chinese · {entry.hanzi} · {entry.pinyin} ↗</a></details>
 </div>;
}
