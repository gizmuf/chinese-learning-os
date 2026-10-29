'use client';
import {Apple,BookOpen,Bus,Clock,CloudRain,Coffee,Footprints,GraduationCap,Home,Map,MessageCircle,Music,Newspaper,PersonStanding,Smartphone,Sparkles,Store,Sun,Ticket,Utensils,Monitor,ArrowDown,ArrowUp,ArrowLeft,ArrowRight,ArrowLeftRight,GitBranch,Lightbulb,ListOrdered,Scale,Target,Volume2} from 'lucide-react';
import {useI18n} from './i18n';
import {StudyText} from './study-lookup';
import {playRecording} from './audio';
import {frameForTask,grammarChunkTasks,type ChunkTask} from './chunk-library-data';
import glossary from '../data/speaking-chunks/grammar-lookup.json';
import readings from '../data/speaking-chunks/target-readings.json';
const C=(en:string,fr:string,ru:string,tr:string)=>({en,fr,ru,tr});
export const teachingCopy={
 start:C('Learn first','Apprendre d’abord','Сначала разобраться','Önce öğren'),
 intro:C('You do not need to know what goes in a gap yet. See the situation, understand the pieces, and hear two examples before testing yourself.','Vous n’avez pas encore besoin de savoir compléter les blocs. Découvrez la situation, comprenez les éléments et écoutez deux exemples avant le test.','Пока не нужно знать, что писать в пропусках. Сначала ситуация, смысл частей и два примера с аудио; затем проверка.','Boşluklara ne yazacağını henüz bilmen gerekmiyor. Önce durumu gör, parçaları anla ve iki örneği dinle; sonra kendini dene.'),
 steps:[C('Understand','Comprendre','Понять','Anla'),C('Compare examples','Comparer les exemples','Сравнить примеры','Örnekleri karşılaştır'),C('Fill gaps','Compléter','Заполнить пропуски','Boşlukları doldur'),C('Review later','Réviser plus tard','Повторить позже','Sonra tekrar et')],
 learn:C('Learn this pattern','Comprendre cette structure','Разобрать эту модель','Bu kalıbı öğren'),
 situation:C('Picture the situation','Imaginez la situation','Представьте ситуацию','Durumu gözünde canlandır'),
 why:C('How it works','Comment ça marche','Как это устроено','Nasıl çalışır'),
 contrast:C('Notice the difference','Remarquez la différence','Обратите внимание на различие','Farka dikkat et'),
 pieces:C('Keep these pieces together','Gardez ces éléments ensemble','Запомните эти части вместе','Bu parçaları birlikte hatırla'),
 compare:C('Same frame, another situation','Même structure, autre situation','Та же рамка, другая ситуация','Aynı kalıp, başka durum'),
 ready:C('Now try the gaps','Passer aux blocs à compléter','Теперь заполнить пропуски','Şimdi boşlukları dene'),
 basic:C('First patterns · 24','Premières structures · 24','Первые модели · 24','İlk kalıplar · 24'),
 advanced:C('HSK4–5 extensions · 30','Approfondissements HSK4–5 · 30','Расширение HSK4–5 · 30','HSK4–5 ek kalıplar · 30'),
 both:C('All 54 patterns','Les 54 structures','Все 54 модели','54 kalıbın tümü'),
 connected:C('In this sentence','Dans cette phrase','В этом предложении','Bu cümlede'),
 listen:C('Listen','Écouter','Послушать','Dinle'),
 note:C('The diagram shows the relationship between ideas; it is a memory aid, not a literal word-for-word translation.','Le schéma montre le lien entre les idées ; c’est un aide-mémoire, pas une traduction mot à mot.','Схема показывает связь мыслей: это опора для памяти, а не дословный перевод.','Şema fikirlerin ilişkisini gösterir; kelimesi kelimesine çeviri değil, hatırlama desteğidir.'),
};
const sceneIcons={rain:CloudRain,sun:Sun,school:GraduationCap,tea:Coffee,cup:Coffee,bus:Bus,walk:Footprints,home:Home,book:BookOpen,clock:Clock,phone:Smartphone,music:Music,person:PersonStanding,chat:MessageCircle,food:Utensils,shop:Store,map:Map,ticket:Ticket,clean:Sparkles,computer:Monitor,apple:Apple,news:Newspaper};
const coreSceneIcons:Record<string,(keyof typeof sceneIcons)[]>={
 'compare-bi':['tea','tea'],'compare-meiyou':['map','map'],'compare-same':['cup','cup'],'distance-li':['home','bus'],'change-more':['sun','sun'],'change-correlated':['book','chat'],'time-first-then':['clean','apple'],'time-after':['school','book'],'time-before':['sun','home'],'time-simultaneous':['food','music'],'connect-cause':['rain','food'],'connect-although':['shop','food'],'connect-if':['rain','bus'],'connect-provided':['ticket','ticket'],'connect-only-if':['ticket','person'],'connect-not-only':['shop','clean'],'connect-besides':['tea','tea'],'connect-no-matter':['rain','book'],'attitude-interest':['person','book'],'complement-ba':['cup','home'],'complement-bei':['cup','person'],'complement-de':['chat','chat'],'aspect-experience':['food','person'],'time-as-soon':['home','phone'],
};
export function FrameLearningIntro({onLearn}:{onLearn:()=>void}){
 const {locale}=useI18n();return <aside className="frame-learning-intro"><div><Lightbulb size={22}/><h3>{teachingCopy.start[locale]}</h3></div><p>{teachingCopy.intro[locale]}</p><ol>{teachingCopy.steps.map((s,i)=><li key={i}><b>{i+1}</b>{s[locale]}</li>)}</ol><button className="primary" onClick={onLearn}>{teachingCopy.learn[locale]}<ArrowRight size={16}/></button></aside>;
}
export function FrameTeaching({task,notify,onPractice}:{task:ChunkTask;notify:(m:string)=>void;onPractice:(ids:string[])=>void}){
 const {locale}=useI18n(),frame=frameForTask(task),learning=frame?.learning;if(!frame||!learning)return null;
 const Icon=learning.visual==='comparison'?Scale:learning.visual==='choice'||learning.visual==='condition'?GitBranch:learning.visual==='sequence'?ListOrdered:learning.visual==='contrast'?ArrowLeftRight:Target;
 const iconNames=learning.icons??coreSceneIcons[frame.id]??['book','chat'],IconA=sceneIcons[iconNames[0] as keyof typeof sceneIcons]??Target,IconB=sceneIcons[iconNames[1] as keyof typeof sceneIcons]??Target;
 const hasBars=['compare-bi','compare-meiyou','compare-same','adv-less-than','adv-more-than'].includes(frame.id),equal=frame.id==='compare-same',lower=['compare-meiyou','adv-less-than'].includes(frame.id);
 const variants=grammarChunkTasks.filter(t=>t.frameId===frame.id);
 return <div data-grammar-frame={frame.id} className={'frame-teaching frame-visual-'+learning.visual}>
 <section className="frame-scene"><Icon size={28}/><div><small>{teachingCopy.situation[locale]}</small><p>{learning.scene[locale]}</p></div></section>
 <h4>{teachingCopy.why[locale]}</h4><p className="frame-explanation">{learning.explanation[locale]}</p>
 <div className="frame-relationship" role="group" aria-label={teachingCopy.why[locale]}><div className="frame-idea frame-idea-a"><span>A</span><IconA className="frame-scene-icon" size={44}/><strong>{learning.labels[0][locale]}</strong>{hasBars&&<div className="frame-bar frame-bar-a" style={{height:lower?28:45}}/>}</div>{frame.id==='connect-only-if'?<ArrowLeft className="frame-link" size={26}/>:learning.visual==='choice'||learning.visual==='contrast'?<ArrowLeftRight className="frame-link" size={26}/>:<ArrowRight className="frame-link" size={26}/>}{frame.id==='connect-only-if'?<ArrowUp className="frame-link-mobile" size={24}/>:<ArrowDown className="frame-link-mobile" size={24}/>}<div className="frame-idea frame-idea-b"><span>B</span><IconB className="frame-scene-icon" size={44}/><strong>{learning.labels[1][locale]}</strong>{hasBars&&<div className="frame-bar frame-bar-b" style={{height:equal||lower?45:28}}/>}</div></div><p className="frame-visual-note">{teachingCopy.note[locale]}</p>
 <h4>{teachingCopy.pieces[locale]}</h4><div className="frame-targets">{task.targets.map((target,i)=><div className="frame-target" key={target}><small>{i+1}</small><strong lang="zh-Hans"><StudyText text={task.parts[target]}/></strong><TargetReading task={task} target={target}/><button className="secondary" aria-label={teachingCopy.listen[locale]+': '+task.parts[target]} onClick={()=>playRecording(task.pieceAudio![target],notify)}><Volume2 size={18}/></button></div>)}</div>
 <h4>{teachingCopy.compare[locale]}</h4><div className="frame-example-pair">{variants.map(v=><article key={v.id}><p lang="zh-Hans">{v.parts.map((part,i)=><span className={v.targets.includes(i)?'frame-fixed-piece':undefined} key={i}><StudyText text={part}/></span>)}</p><p className="pinyin">{v.pinyin}</p><p>{v.meaning[locale]}</p><button className="secondary" onClick={()=>playRecording(v.audio,notify)}><Volume2 size={17}/>{teachingCopy.listen[locale]}</button></article>)}</div>
 <aside className="frame-contrast"><strong>{teachingCopy.contrast[locale]}</strong><p>{learning.contrast[locale]}</p></aside><button className="primary" onClick={()=>onPractice(variants.map(v=>v.id))}>{teachingCopy.ready[locale]}<ArrowRight size={17}/></button>
 </div>;
}

function TargetReading({task,target}:{task:ChunkTask;target:number}){
 const {locale}=useI18n(),connected=(readings as Record<string,Record<string,string>>)[task.id.replace('chunk-frame-','')]?.[target],lexical=glossary.find(g=>g.text===task.parts[target])?.pinyin??connected;
 return <><span className="pinyin">{lexical}</span>{lexical?.toLowerCase().replace(/\s/g,'')!==connected?.toLowerCase().replace(/\s/g,'')&&<small>{teachingCopy.connected[locale]}: {connected}</small>}</>;
}
