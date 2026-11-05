"use client";
import HskBadge from './hsk-badge';
import {writingPracticeHref,writingPracticeRoute,type WritingOrigin} from './writing-navigation';

import {usePracticeBook} from './use-practice-book';
import LibraryNotebook from './library-notebook';
import LibraryScrollControls from './library-scroll-controls';
import LanguagePractice from './language-practice';
import {isLanguageSkill,languageSkills,languagePracticeHref,languagePracticeRoute} from './pinyin-practice-model';
import ReferenceLessonLinks from './reference-lesson-links';
import {referenceLessonHref} from './reference-lessons-data';
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookmarkPlus,
  BookmarkCheck,
  LayoutGrid,
  Rows3,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Download,
  Headphones,
  Home,
  GraduationCap,
  Network,
  Leaf,
  Lightbulb,
  LoaderCircle,
  PenLine,
  Play,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Trash2,
  TrendingUp,
  Undo2,
  Volume2,
  X,
} from "lucide-react";
import {
  items as sourceItems,
  lessons as sourceLessons,
  curriculum,
  matchesItem,
  isInLevel,
  levelNames,
  type StudyLevel,
  skillNames as sourceSkillNames,
  type Item,
  type Mode,
  type Skill,
} from "./content";
import {
  compactStrokes,
  getCards,
  isReview,
  makeQueue,
  type LearningEvent,
  type Stroke,
} from "./learning";
import {
  allEvents,
  openStore,
  putEvents,
  readDraft,
  saveDraft,
} from "./local-store";
import Writing from "./writing-practice";
import SharedWriting, {WritingPracticeProvider} from "./shared-writing";
import Ratings from "./review-ratings";
import {newEvent} from "./learning-event";
import RecognitionReview, {recognitionDraftKey, validRecognitionDraft} from "./recognition-review";

import Notebook from "./notebook";
import IntensiveCourse from "./intensive-course";
import {useHanziStyle,HanziDisplayControls,type HanziStyle} from './hanzi-style';
import {buildReviewQueue,allReviewLevel,allReviewHref} from './review-queue';
import './recognition-review.css';
import StudyLookupProvider, {useDictionaryAssistance,StudyText,StudyConfusionsButton} from "./study-lookup";
import PdfExport from "./pdf-export";
import { LanguagePicker, useI18n } from "./i18n";
import { localizeItem } from "./translate";
import { progressSchema } from "./event-schema";
import { playRecording, speak, setSpeechRate, stopAudio } from "./audio";
import { authenticatedFetch } from "./auth-client";
import type { StudyUser as User } from "./auth-shell";
const HSK3Grammar = lazy(() => import("./hsk3-grammar"));
const Atlas = lazy(() => import("./atlas"));
import {sceneLab,sceneLabHref,type SceneLab} from './scene-lab-model';
import {LabNavIcon} from './scene-lab';
const SceneLabView=lazy(()=>import('./scene-lab'));
const StudyStudio = lazy(() => import("./study-studio"));
const MyDayLesson = lazy(() => import("./my-day-lesson"));
const ShuoshuoCompanion = lazy(() => import("./shuoshuo-companion"));
const ShuoshuoLesson = lazy(() => import("./shuoshuo-lesson"));
const PrivateLessons = lazy(() => import("./private-lessons"));
const TodayCourseReviews = lazy(() => import("./today-course-reviews"));
const TodayRecognition = lazy(() => import("./today-recognition"));
type View = "labs" | "shuoshuo-lesson" | "private-lessons" | "shuoshuo" | "myday" | "studio" | "grammar" | "atlas" | "course" | "today" | "lessons" | "practice" | "reviews" | "progress";
export default function StudyApp({
  user,
  onSignIn,
  onSignOut,
  onManageAccount,
}: {
  user: User;
  onSignIn: () => void;
  onSignOut: () => void;
  onManageAccount: () => void;
}) {
  const { locale, t } = useI18n();
  const allWordsCopy={en:'Practise all {0} words',fr:'Pratiquer les {0} mots',ru:'Практиковать все слова: {0}',tr:'Tüm {0} kelimeyi çalış'}[locale];
  const allWordsNote={en:'All words · extra practice. Your spaced-review schedule stays unchanged.',fr:'Tous les mots · entraînement libre. Le calendrier des révisions reste inchangé.',ru:'Все слова · дополнительная практика. Расписание интервальных повторений не меняется.',tr:'Tüm kelimeler · ek çalışma. Aralıklı tekrar programınız değişmez.'}[locale];
  const hanziAppearance=useHanziStyle();
  const items = useMemo(() => sourceItems.map(item => localizeItem(item, locale)), [locale]);
  const lessons = sourceLessons.map(lesson => ({...lesson, title: t(lesson.title), subtitle: t(lesson.subtitle)}));
  const skillNames = Object.fromEntries(Object.entries(sourceSkillNames).map(([key,value]) => [key,t(value)])) as typeof sourceSkillNames;
  const [view, setView] = useState<View>("today");
  const [shuoshuoLessonOrigin,setShuoshuoLessonOrigin] = useState<View>("lessons");
  const [companionOrigin,setCompanionOrigin] = useState<View>("lessons");
  const [myDayOrigin,setMyDayOrigin] = useState<View>("lessons");
  const [studioVisited,setStudioVisited] = useState(false);
  const [studioMenu,setStudioMenu] = useState(false);
  const [lab,setLab]=useState<SceneLab>("room");
  const [atlasReturn, setAtlasReturn] = useState<{url:string;scroll:number}|null>(null);
  useEffect(() => { if (new URLSearchParams(window.location.search).get("view")==="labs") {setView("labs");setLab(sceneLab(new URLSearchParams(window.location.search).get("lab")));} else if (new URLSearchParams(window.location.search).get("lesson") === "shuoshuo-morning") setView("shuoshuo-lesson"); else if (new URLSearchParams(window.location.search).get("private") === "1") setView("private-lessons"); else if (new URLSearchParams(window.location.search).get("companion") === "shuoshuo") setView("shuoshuo"); else if (["my-day-01-v2","voice-live-2026-11-03","my-day-full-2026-11-03"].includes(new URLSearchParams(window.location.search).get("rehearsal")??"")) setView("myday"); else if (new URLSearchParams(window.location.search).get("study") === "studio") {setView("studio");setStudioVisited(true);} else if (new URLSearchParams(window.location.search).get("grammar") === "hsk3") setView("grammar"); else if (new URLSearchParams(window.location.search).get("atlas") === "1") setView("atlas"); else if (new URLSearchParams(window.location.search).get("course") === "intensive") setView("course"); }, []);
  const [notebookEvents, setEvents] = useState<LearningEvent[]>([]);
  const [sync, setSync] = useState(t("Loading your notebook…"));
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [storageAttempt, setStorageAttempt] = useState(0);
  const retryStorage = () => setStorageAttempt(value => value + 1);
  const syncLock = useRef(false);
  const [selectedRecord, setSelected] = useState(items[0]);
  const selected = items.find(item => item.id === selectedRecord.id) ?? items[0];
  const [skill, setSkill] = useState<Skill>("writing");
  const [languageRun,setLanguageRun]=useState<string|undefined>(undefined);
  const [mode, setMode] = useState<Mode>("trace");
  const [writingLayout, setWritingLayout] = useState<"studio" | "notebook">("studio");
  useEffect(()=>{if(view==='practice'&&isLanguageSkill(skill))window.history.replaceState(null,'',languagePracticeHref(skill,selected.id,languageRun));},[view,skill,selected.id,languageRun]);
  const [search, setSearch] = useState("");
  const [lesson, setLesson] = useState("all");
  const [libraryLayout,setLibraryLayout]=useState<'cards'|'notebook'>('cards'),[practiceSelection,setPracticeSelection]=useState(false);
  const [level, setLevel] = useState<StudyLevel>("hsk1");
  const [writingOrigin,setWritingOrigin]=useState<WritingOrigin|undefined>();
  const lastWriting=useRef<{item:Item;mode:Mode;layout:'studio'|'notebook';origin?:WritingOrigin}|null>(null);

  const studyItems = useMemo(
    () => items.filter((item) => isInLevel(item, level)),
    [level, items],
  );
  const studyIds = useMemo(
    () => new Set(studyItems.map((item) => item.id)),
    [studyItems],
  );
  const events = useMemo(
    () => notebookEvents.filter((event) => studyIds.has(event.itemId)),
    [notebookEvents, studyIds],
  );
  const visibleLessons = lessons.filter((lesson) =>
    studyItems.some((item) => item.lesson === lesson.id),
  );
  function changeLevel(next: StudyLevel) {
    stopAudio();
    setLevel(next);
    setSelected(items.find((item) => isInLevel(item, next))!);
    setLesson("all");
    setSearch("");
    setSession(null);
    setFinished(false);
    if (view === "practice") setView("lessons");
  }

  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState(false);
  const [pdfSelection, setPdfSelection] = useState<string[] | null>(null);
  const [penOnly, setPenOnly] = useState(false);
  const [slowAudio, setSlowAudio] = useState(false);
  useEffect(() => {
    setSpeechRate(slowAudio ? 0.8 : 1);
  }, [slowAudio]);
  useEffect(() => () => stopAudio(), []);
  const [left, setLeft] = useState(false);
  const [minutes, setMinutes] = useState(10);
  const [session, setSession] = useState<Item[] | null>(null);
  const [sessionIndex, setSessionIndex] = useState(0);
  const [recognitionRun, setRecognitionRun] = useState("");
  const [recognitionPractice,setRecognitionPractice] = useState(false);
  const [recognitionWriting,setRecognitionWriting] = useState<Item|null>(null);
  const recognitionWriter=useRef<HTMLDialogElement>(null);
  useEffect(()=>{if(recognitionWriting) recognitionWriter.current?.showModal();else recognitionWriter.current?.close();},[recognitionWriting]);
  const [finished, setFinished] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [backup, setBackup] = useState(false);
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4500);
  }, []);
  const practiceBook=usePracticeBook(db?.name==='chinese-os-v1-'+(user?.id??'guest')?db:null,user?.id??null,notify);
  const chosenItems=practiceBook.entries.map(v=>{const known=items.find(i=>i.hanzi===v.text);return known??{id:'practice-choice:'+v.text,lesson:'selected',hanzi:v.text,pinyin:v.pinyin,english:v.meaning,sentence:v.contextual?.text??'',sentencePinyin:v.contextual?.pinyin??'',translation:v.contextual?.meaning??''} satisfies Item;});
  const libraryLessonLabel={en:'Lessons',fr:'Leçons',ru:'Уроки',tr:'Dersler'}[locale];
  const libraryCopy={en:{selected:'Selected for practice',add:'Add to practice book',remove:'Remove from practice book',cards:'Cards',notebook:'Cards with notebook',empty:'Add words and characters using the bookmark-plus icon in any definition.',ready:'Your choices are saved on this device.'},fr:{selected:'Choisis pour pratiquer',add:'Ajouter au cahier',remove:'Retirer du cahier',cards:'Cartes',notebook:'Cartes avec cahier',empty:'Ajoutez des mots et caractères avec le signet + dans une définition.',ready:'Votre sélection est enregistrée sur cet appareil.'},ru:{selected:'Выбрано для практики',add:'Добавить в тетрадь',remove:'Убрать из тетради',cards:'Карточки',notebook:'Карточки с тетрадью',empty:'Добавляйте слова и знаки кнопкой закладки с плюсом в словаре.',ready:'Ваш выбор сохранён на этом устройстве.'},tr:{selected:'Pratik için seçilenler',add:'Deftere ekle',remove:'Defterden çıkar',cards:'Kartlar',notebook:'Defterli kartlar',empty:'Sözlükteki artılı yer imiyle kelime ve karakter ekle.',ready:'Seçimlerin bu cihazda kaydedilir.'}}[locale];
  function libraryRecording(item:Item,kind:'word'|'sentence'){const chosen=practiceBook.entries.find(v=>v.text===item.hanzi);return kind==='word'?chosen?.audio&&!chosen.audio.context&&chosen.audio.text===item.hanzi?chosen.audio.source:undefined:chosen?.contextual?.audio?.text===item.sentence?chosen.contextual.audio.source:undefined;}
  function listenLibrary(item:Item,kind:'word'|'sentence'){const source=libraryRecording(item,kind);if(source)playRecording(source,notify);else speak(kind==='word'?item.hanzi:item.sentence,notify,item);}
  function libraryRoute(layout=libraryLayout,selected=practiceSelection){const p=new URLSearchParams({study:'library',layout,level});if(selected)p.set('set','selected');window.history.replaceState(null,'','/?'+p);}
  useEffect(() => {
    let alive = true;
    let opened: IDBDatabase | undefined;
    setDb(null); setIsReady(false); setStorageError(false); setSync(t("Loading your notebook…"));
    openStore(user?.id ?? "guest")
      .then(async (store) => {
        opened = store;
        if (!alive) {
          store.close();
          return;
        }
        const history = await allEvents(store);
        const prefs = await readDraft<{
          penOnly: boolean;
          hanziStyle?: HanziStyle;
          highlightComponents?: boolean;
          slowAudio?: boolean;
          level?: StudyLevel;
          left: boolean;
          minutes: number;
        }>(store, "settings");
        if (!alive) return;
        hanziAppearance.setStyle(prefs?.hanziStyle==='print'?'print':'strokes');
        hanziAppearance.setHighlight(prefs?.highlightComponents??true);
        if (prefs) {
          setPenOnly(prefs.penOnly);
          setSlowAudio(prefs.slowAudio ?? false);
          setLeft(prefs.left);
          setMinutes(prefs.minutes);
          if (prefs.level && ["hsk1", "hsk2", "hsk3", "bonus"].includes(prefs.level)) {
            setLevel(prefs.level);
            setSelected(items.find((item) => isInLevel(item, prefs.level!))!);
          }
        }
        const recognition = await readDraft(store, recognitionDraftKey);
        if (!alive) return;
        setDb(store); setEvents(history);
        setSync(user ? t("Ready to sync") : t("Guest · saved on this device"));
        const requestedAll=allReviewLevel(window.location.search),languageRoute=languagePracticeRoute(window.location.search,sourceItems);
        const writingRoute=writingPracticeRoute(window.location.search,sourceItems);
        if(alive&&writingRoute){const item=sourceItems.find(v=>v.id===writingRoute.itemId)!;setSelected(item);setLevel(item.hskLevel?('hsk'+item.hskLevel) as StudyLevel:'bonus');setMode(writingRoute.mode);setWritingLayout(writingRoute.layout);setWritingOrigin(writingRoute.origin);setSkill('writing');setSession(null);setFinished(false);setView('practice');}
        else if(alive&&new URLSearchParams(window.location.search).get('study')==='library'){const p=new URLSearchParams(window.location.search);setView('lessons');setSession(null);setLibraryLayout(p.get('layout')==='notebook'?'notebook':'cards');setPracticeSelection(p.get('set')==='selected');if(['hsk1','hsk2','hsk3','bonus'].includes(p.get('level')??''))setLevel(p.get('level') as StudyLevel);}
        else if(alive&&languageRoute){const target=sourceItems.find(item=>item.id===languageRoute.itemId)!;setLevel(target.hskLevel?('hsk'+target.hskLevel) as StudyLevel:'bonus');setSelected(target);setSkill(languageRoute.skill);setLanguageRun(languageRoute.runId);setMode('recall');setSession(null);setView('practice');
        }else if(alive&&requestedAll){
          const queue=items.filter(item=>isInLevel(item,requestedAll));
          const previous=validRecognitionDraft(recognition)&&recognition.practice&&JSON.stringify(recognition.itemIds)===JSON.stringify(queue.map(i=>i.id))?recognition:null;
          const index=Math.min(previous?.index??0,queue.length-1);
          setLevel(requestedAll);setRecognitionRun(previous?.id??crypto.randomUUID());setRecognitionPractice(true);setSession(queue);setSessionIndex(index);setSelected(queue[index]);setSkill('meaning');setMode('recall');setFinished(false);setView('practice');
        }else if (alive && validRecognitionDraft(recognition) && !window.location.search && !window.location.hash) {
          const queue = recognition.itemIds.map(id => sourceItems.find(i => i.id === id)).filter((i): i is Item => !!i);
          if (queue.length === recognition.itemIds.length) {
            const index = Math.min(recognition.index, queue.length - 1);
            setRecognitionRun(recognition.id); setRecognitionPractice(!!recognition.practice); setSession(queue); setSessionIndex(index);
            setSelected(queue[index]); setSkill("meaning"); setMode("recall"); setFinished(false); setView("practice");
          }
        }
        setIsReady(true);
      })
      .catch(() => {
        opened?.close();
        if (!alive) return;
        setStorageError(true);
        setSync(t("Device storage unavailable"));
        notify(t("Enable browser storage to save your practice."));
      });
    return () => {
      alive = false;
      opened?.close();
    };
  }, [user?.id, notify, storageAttempt]);
  useEffect(() => {
    if (db && isReady)
      saveDraft(db, "settings", {
        penOnly,
        hanziStyle:hanziAppearance.style,
        highlightComponents:hanziAppearance.highlight,
        slowAudio,
        left,
        minutes,
        level,
      }).catch(() => notify(t("Could not save preferences.")));
  }, [db, isReady, penOnly, slowAudio, left, minutes, level, notify,hanziAppearance.style,hanziAppearance.highlight]);
  const synchronize = useCallback(async () => {
    if (!db || !user || syncLock.current) return;
    syncLock.current = true;
    try {
      if (!navigator.onLine) throw Error("offline");
      setSync(t("Syncing…"));
      const local = await allEvents(db);
      const pending = local.filter((e) => !e.synced);
      for (let i = 0; i < pending.length;) {
        const batch: typeof pending = [];
        while (i < pending.length && batch.length < 20) {
          const candidate = [...batch, pending[i]];
          if (
            new TextEncoder().encode(JSON.stringify({ events: candidate }))
              .length > 900000
          ) {
            if (!batch.length) throw new Error(t("Attempt exceeds sync limit"));
            break;
          }
          batch.push(pending[i++]);
        }
        const r = await authenticatedFetch(
          "/api/progress",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ events: batch }),
          },
          user.id,
        );
        if (!r.ok) throw Error("sync");
        await putEvents(
          db,
          batch.map((e) => ({ ...e, synced: true })),
        );
      }
      const r = await authenticatedFetch(
        "/api/progress",
        {
          cache: "no-store",
        },
        user.id,
      );
      if (!r.ok) throw Error("sync");
      const data = progressSchema.parse(await r.json());
      await putEvents(
        db,
        data.events.map((e: LearningEvent) => ({ ...e, synced: true })),
      );
      setEvents(await allEvents(db));
      setSync(t("All progress synced"));
    } catch {
      setSync(
        navigator.onLine
          ? t("Saved here · sync pending")
          : t("Offline · saved on this device"),
      );
    } finally {
      syncLock.current = false;
    }
  }, [db, user?.id]);
  useEffect(() => {
    if (!db) return;
    void synchronize();
    const resume = () => {
      if (document.visibilityState === "visible") void synchronize();
    };
    window.addEventListener("online", synchronize);
    document.addEventListener("visibilitychange", resume);
    const timer = setInterval(synchronize, 30000);
    return () => {
      window.removeEventListener("online", synchronize);
      document.removeEventListener("visibilitychange", resume);
      clearInterval(timer);
    };
  }, [db, synchronize]);
  const cards = useMemo(() => getCards(events), [events]);
  const today = new Date().toLocaleDateString();
  const todays = events.filter(
    (e) => new Date(e.at).toLocaleDateString() === today,
  );
  const practiced = new Set(events.map((e) => e.itemId)).size;
  const due = Object.values(cards).filter(
    (c) => new Date(c.due).getTime() <= Date.now(),
  ).length;
  const independent = events.filter(isReview);
  const accuracy = independent.length
    ? Math.round(
        (independent.filter((e) => e.rating > 1).length / independent.length) *
          100,
      )
    : null;
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    return {
      day: isReady ? d.toLocaleDateString(locale, { weekday: "narrow" }) : "·",
      count: events.filter(
        (e) => new Date(e.at).toLocaleDateString() === d.toLocaleDateString(),
      ).length,
      today: i === 6,
    };
  });
  const record = async (e: LearningEvent) => {
    if (!db) throw Error(t("Storage is not ready."));
    await putEvents(db, [{ ...e, synced: false }]);
    setEvents(await allEvents(db));
    setSync(user ? t("Saved here · syncing…") : t("Guest · saved on this device"));
    void synchronize();
  };
  function openPractice(item: Item, practiceMode?: Mode) {
    practiceMode??=hanziAppearance.style==='print'?'copy':'trace';
    stopAudio();
    setAtlasReturn(null);
    const origin:WritingOrigin|undefined=view==='practice'?writingOrigin:{view:view as WritingOrigin['view'],url:window.location.pathname+window.location.search,scroll:window.scrollY,search,lesson,level};
    setWritingOrigin(origin);
    if(view==='practice')window.history.replaceState(history.state,'',writingPracticeHref(item.id,practiceMode,writingLayout,origin));else window.history.pushState({chineseOSWriting:true},'',writingPracticeHref(item.id,practiceMode,writingLayout,origin));
    setSession(null);
    setFinished(false);
    setSelected(item);
    setMode(practiceMode);
    setSkill("writing");
    setView("practice");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  useEffect(()=>{if(!isReady||view!=='practice'||skill!=='writing'||session)return;lastWriting.current={item:selected,mode,layout:writingLayout,origin:writingOrigin};window.history.replaceState(history.state,'',writingPracticeHref(selected.id,mode,writingLayout,writingOrigin));},[isReady,view,skill,selected.id,mode,writingLayout,writingOrigin,session]);
  function returnFromWriting(){if(history.state?.chineseOSWriting){history.back();return;}if(!writingOrigin){changeView('lessons');return;}stopAudio();setSession(null);setFinished(false);setView(writingOrigin.view);setSearch(writingOrigin.search??'');setLesson(writingOrigin.lesson??'all');if(['hsk1','hsk2','hsk3','bonus'].includes(writingOrigin.level??''))setLevel(writingOrigin.level as StudyLevel);window.history.replaceState(null,'',writingOrigin.url);const y=writingOrigin.scroll;requestAnimationFrame(()=>requestAnimationFrame(()=>window.scrollTo({top:y,behavior:'instant'})));}
  useEffect(()=>{const back=()=>{const route=writingPracticeRoute(window.location.search,sourceItems);if(route){const item=items.find(i=>i.id===route.itemId);if(item){setSelected(item);setMode(route.mode);setWritingLayout(route.layout);setWritingOrigin(route.origin);setSession(null);setSkill('writing');setView('practice');}}else if(view==='practice'&&!session&&writingOrigin)returnFromWriting();};addEventListener('popstate',back);return()=>removeEventListener('popstate',back);},[view,session,writingOrigin,items]);
  function startReview(s: Skill, extra: boolean|'all' = false) {
    const queue=buildReviewQueue(events,s,studyItems,minutes,extra==='all'?'all':extra?'extra':'scheduled');
    if (!queue.length) {
      notify(
        t("You are all caught up for this skill. Try another skill or practice a lesson."),
      );
      return;
    }
    if (s === "meaning") {setRecognitionRun(crypto.randomUUID());setRecognitionPractice(!!extra);}
    if(extra==='all'){const href=allReviewHref(level);if(href)window.history.replaceState(null,'',window.location.pathname+href);}
    if(isLanguageSkill(s))setLanguageRun(crypto.randomUUID());
    setSkill(s);
    setMode("recall");
    setSession(queue);
    setSessionIndex(0);
    setSelected(queue[0]);
    setFinished(false);
    setView("practice");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function next() {
    if (session) {
      const n = sessionIndex + 1;
      if (n >= session.length) {
        setFinished(true);
        return;
      }
      setSessionIndex(n);
      setSelected(session[n]);
    } else {
      const group = studyItems.filter((i) => i.lesson === selected.lesson);
      setSelected(
        group[
          (group.findIndex((i) => i.id === selected.id) + 1) % group.length
        ],
      );
    }
  }
  const filtered = (practiceSelection?chosenItems:studyItems).filter((item) =>
    matchesItem(item, search, practiceSelection?"all":lesson),
  );
  function returnToAtlas() {
    if (!atlasReturn) return;
    stopAudio();
    window.history.replaceState(null,"",atlasReturn.url);
    const scroll=atlasReturn.scroll;
    setView("atlas"); setAtlasReturn(null);
    requestAnimationFrame(()=>window.scrollTo({top:scroll,behavior:"instant"}));
  }
  function openAtlasWord(item: Item) {
    setWritingLayout("studio");
    const origin={url:window.location.pathname+window.location.search,scroll:window.scrollY};
    setLevel(item.hskLevel===3?"hsk3":item.hskLevel===2?"hsk2":item.hskLevel===1?"hsk1":"bonus");
    openPractice(item); setAtlasReturn(origin);
  }
  function openShuoshuoLesson(){setShuoshuoLessonOrigin(view==="studio"?"studio":"lessons");changeView("shuoshuo-lesson");}
  function openCompanion(){setCompanionOrigin(view==="studio"?"studio":"lessons");changeView("shuoshuo");}
  function openMyDay(){setMyDayOrigin(view==="studio"?"studio":"lessons");changeView("myday");}
  function changeView(v: View) {
    setStudioMenu(false);
    if(v==='practice'){const previous=lastWriting.current;if(previous)setWritingLayout(previous.layout);openPractice(previous?.item??selected,previous?.mode??mode);if(previous)setWritingOrigin(previous.origin);return;}
    if(v==="atlas"&&atlasReturn){returnToAtlas();return;}
    setAtlasReturn(null);
    if(v==="studio")setStudioVisited(true);
    window.history.replaceState(null, "", window.location.pathname + (v === "labs" ? sceneLabHref(lab).slice(1) : v === "shuoshuo-lesson" ? "?lesson=shuoshuo-morning" : v === "private-lessons" ? "?private=1" : v === "shuoshuo" ? "?companion=shuoshuo" : v === "myday" ? "?rehearsal=my-day-01-v2" : v === "studio" ? "?study=studio" : v === "grammar" ? "?grammar=hsk3" : v === "atlas" ? "?atlas=1" : v === "course" ? "?course=intensive" : v === "lessons" ? "?study=library&layout="+libraryLayout+(practiceSelection?"&set=selected":"")+"&level="+level : ""));
    stopAudio();

    setView(v);
    window.scrollTo({ top: 0, behavior: "instant" });
    setSession(null);
    setFinished(false);
  }
  async function exportBackup() {
    if (!db) return;
    const data = await allEvents(db);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { version: 1, exportedAt: new Date().toISOString(), events: data },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    a.download = "chinese-os-progress.json";
    a.click();
    URL.revokeObjectURL(a.href);
    setBackup(true);
  }
  return (
    <div className={"app-shell"+(view==="studio"?" ss-shell"+(studioMenu?" ss-menu-expanded":""):"")}>
      <aside className="sidebar">
        <a className="brand" href="/" aria-label={t("Chinese OS home")}>
          <span className="brand-mark">
            <Leaf size={23} />
          </span>
          <span>
            chinese<span className="brand-os">os</span>
            <small>{t("A LITTLE, EVERY DAY")}</small>
          </span>
        </a>
        <div className="workspace-label">{t("YOUR STUDY SPACE")}</div>
        <nav>
          {(
            [
              { id: "today", title: t("Today"), icon: Home },
              { id: "lessons", title: t("My lessons"), icon: BookOpen },
              { id: "course", title: t("Course"), icon: GraduationCap },
              { id: "atlas", title: t("Cloud Atlas"), icon: Network },
              { id: "studio", title: "StudyStudio", icon: Sparkles },
              { id: "practice", title: t("Writing studio"), icon: PenLine },
              { id: "reviews", title: t("Review"), icon: RotateCcw },
              { id: "progress", title: t("My progress"), icon: TrendingUp },
              { id: "labs", title: "3D Lab", icon: LabNavIcon },
            ] as const
          ).map((n) => (
            <button
              key={n.id}
              className={(view==='practice'&&skill==='meaning'?'reviews':view) === n.id ? "nav-item active" : "nav-item"}
              title={n.title}
              onClick={() => changeView(n.id)}
            >
              <n.icon size={19} />
              <span>{n.title}</span>
              {n.id === "reviews" && due > 0 && <b>{due}</b>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="little-spark">
            <Sparkles size={18} />
          </span>
          <h3>{t("A little adds up.")}</h3>
          <p>
            {t("One word. One stroke.")}<br />
            {t("One step closer.")}</p>
          <div className="mini-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
        <button className="settings-button" onClick={() => setSettings(true)}>
          <Settings2 size={18} /> {t("Study preferences")}</button>
        <div className="profile">
          <div className="avatar">{user?.name[0]?.toUpperCase() ?? "Y"}</div>
          <div>
            <strong>{user?.name ?? t("Your notebook")}</strong>
            <small>
              {user ? t("Personal learning account") : t("Try it as a guest")}
            </small>
          </div>
          {!user && (
            <a
              href="#account"
              onClick={(event) => {
                event.preventDefault();
                onSignIn();
              }}
              target="_top"
              aria-label={t("Sign in")}
            >
              <ArrowUpRight size={18} />
            </a>
          )}
        </div>
      </aside>
      <WritingPracticeProvider value={{db:db?.name === "chinese-os-v1-" + (user?.id??"guest") ? db : null,record,notify,penOnly,setPenOnly}}><StudyLookupProvider practiceBook={practiceBook} key={user?.id??"guest"} owner={user?.id??null} db={db?.name === "chinese-os-v1-"+(user?.id??"guest")?db:null} notify={notify} penOnly={penOnly} setPenOnly={setPenOnly}><main className="main">
        <header className="topbar">
          <span>
            <span className="breadcrumb">{t("My study space")}</span>
            <ChevronRight size={13} />
            {view === "labs" ? "3D Lab" : view === "shuoshuo-lesson" ? "A morning with Shuoshuo" : view === "private-lessons" ? "Private lessons" : view === "shuoshuo" ? "Shuoshuo · Vocabulary companion" : view === "myday" ? "My Day · Speaking" : view === "studio" ? "StudyStudio" : view === "grammar" ? t("HSK3 grammar") : view === "atlas" ? t("Cloud Atlas") : view === "course" ? t("Intensive course") : view === "practice"
              ? skill==='meaning'?t('Flashcards'):t("Writing studio")
              : view === "today"
                ? t("Today")
                : view === "lessons"
                  ? t("My lessons")
                  : view === "reviews"
                    ? t("Review")
                    : t("My progress")}
          </span>
          <div className="topbar-actions">
            <div className="topbar-language-stack"><LanguagePicker /><HanziDisplayControls compact/></div>
            {view !== "labs" && view !== "shuoshuo-lesson" && view !== "private-lessons" && view !== "shuoshuo" && view !== "myday" && view !== "studio" && view !== "grammar" && view !== "course" && view !== "atlas" && <select
              className="study-level"
              aria-label={t("Study level")}
              value={level}
              onChange={(event) =>
                changeLevel(event.target.value as StudyLevel)
              }
            >
              <option value="hsk1">HSK1 · {curriculum.hsk1}</option>
              <option value="hsk2">HSK2 · {curriculum.hsk2}</option>
              <option value="hsk3">HSK3 · {curriculum.hsk3}</option>
              <option value="bonus">{t("Extras ·")} {curriculum.extras}</option>
            </select>}
            {!user && (
              <a
                className="signin-link"
                href="#account"
                onClick={(event) => {
                  event.preventDefault();
                  onSignIn();
                }}
                target="_top"
              >
                {t("Sign in")}</a>
            )}
            <button
              className="icon-button mobile-settings"
              aria-label={t("Study preferences")}
              onClick={() => setSettings(true)}
            >
              <Settings2 size={16} />
            </button>
            <button className="sync-state" onClick={() => void synchronize()}>
              {sync.includes("pending") || sync.includes(t("Offline")) ? (
                <CloudOff size={15} />
              ) : sync === t("Syncing…") ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Cloud size={15} />
              )}
              <span>{t(sync)}</span>
            </button>
          </div>
        </header>
        <div className="page-content">
          {storageError && <section className="panel" role="alert">
            <p>{t("Device storage unavailable")}</p>
            <p>{t("Close other Chinese OS tabs and check that browser storage is enabled. Your saved progress is kept.")}</p>
            <button className="primary" onClick={retryStorage}>{t("Retry loading notebook")}</button>
          </section>}
          {view==="labs"&&<Suspense fallback={<p role="status">Opening 3D Lab…</p>}><SceneLabView selected={lab} onSelect={next=>{stopAudio();setLab(next);window.history.replaceState(null,"",window.location.pathname+sceneLabHref(next).slice(1));}}/></Suspense>}
          {view==="shuoshuo-lesson"&&<Suspense fallback={<p role="status">Opening your lesson…</p>}><ShuoshuoLesson slowAudio={slowAudio} onSlowAudio={setSlowAudio} key={user?.id??"guest"} owner={user?.id??null} db={db} record={record} notify={notify} onBack={()=>changeView(shuoshuoLessonOrigin)}/></Suspense>}
          {view==="private-lessons"&&<Suspense fallback={<p role="status">Opening local library…</p>}><PrivateLessons key={user?.id??"guest"} owner={user?.id??null} db={db} onBack={()=>changeView("lessons")} onSignIn={onSignIn}/></Suspense>}
          {view==="shuoshuo"&&<Suspense fallback={<p role="status">Opening vocabulary companion…</p>}><ShuoshuoCompanion key={user?.id??"guest"} owner={user?.id??null} db={db} notify={notify} onBack={()=>changeView(companionOrigin)}/></Suspense>}
          {view==="myday"&&<Suspense fallback={<p role="status">Opening your lesson…</p>}><MyDayLesson slowAudio={slowAudio} onSlowAudio={setSlowAudio} key={user?.id??"guest"} owner={user?.id??"guest"} db={db?.name === "chinese-os-v1-"+(user?.id??"guest")?db:null} record={record} notify={notify} onBack={()=>changeView(myDayOrigin)}/></Suspense>}
          {studioVisited&&<div hidden={view!=="studio"}><Suspense fallback={<p role="status">Opening StudyStudio…</p>}><StudyStudio key={user?.id??"guest"} owner={user?.id??null} db={db?.name === "chinese-os-v1-"+(user?.id??"guest")?db:null} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} record={record} onExit={()=>changeView("today")} onMyDay={openMyDay} onCompanion={openCompanion} onShuoshuoLesson={openShuoshuoLesson} menuOpen={studioMenu} onMenu={()=>setStudioMenu(v=>!v)}/></Suspense></div>}
          {(view === "atlas" || atlasReturn) && <div hidden={view!=="atlas"}><Suspense fallback={<p role="status">{t("Loading your notebook…")}</p>}><Atlas owner={user?.id ?? null} db={db} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} onWord={openAtlasWord}/></Suspense></div>}
          {view==='practice'&&!session&&!atlasReturn&&<button className="secondary atlas-return-button" onClick={returnFromWriting}><ChevronLeft size={16}/>{({en:'Back to learning material',fr:'Retour au cours',ru:'Назад к материалу',tr:'Ders materyaline dön'})[locale]}</button>}
          {view==="practice" && atlasReturn && <button className="secondary atlas-return-button" onClick={returnToAtlas}><ArrowRight size={16} style={{transform:"rotate(180deg)"}}/>{t("Back to Cloud Atlas")}</button>}
          {view === "grammar" && <Suspense fallback={<p>{t("Loading your notebook…")}</p>}><HSK3Grammar key={user?.id ?? "guest"} owner={user?.id ?? null} db={db?.name === "chinese-os-v1-"+(user?.id ?? "guest") ? db : null}/></Suspense>}
          {view === "course" && <IntensiveCourse onReferenceLibraryBack={()=>changeView("lessons")} owner={user?.id ?? null} db={db} penOnly={penOnly} setPenOnly={setPenOnly} recordHSK={record} notify={notify} onHSKRecall={item => { setLevel(item.hskLevel === 3 ? "hsk3" : item.hskLevel === 2 ? "hsk2" : item.hskLevel === 1 ? "hsk1" : "bonus"); openPractice(item, "recall"); }} />}
          {view === "today" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{t("YOUR DAILY PRACTICE")}</p>
                  <h1>
                    {t("A little Chinese,")}<br className="mobile-br" /> {t("every day")}<span className="orange">.</span>
                  </h1>
                  <p>{t("Build a habit. Find your rhythm. Make it yours.")}</p>
                </div>
                <div className="date-chip">
                  {isReady
                    ? new Date().toLocaleDateString(locale, {
                        month: "short",
                        day: "numeric",
                      })
                    : t("Today")}
                  <span>{t("LET’S KEEP GROWING")}</span>
                </div>
              </div>
              <div className="dashboard-grid">
                <section className="hero-card">
                  <div className="hero-copy">
                    <span className="pill">
                      <span className="status-dot" /> {t("YOUR NEXT SMALL STEP")}</span>
                    <h2>
                      {t("From seeing it")}<br />
                      {t("to knowing it.")}</h2>
                    <p>
                      {t("Give your new words a little attention.")}<br />
                      {t("Your future self will thank you.")}</p>
                    <button
                      className="primary"
                      onClick={() => startReview("meaning")}
                    >
                      {t("Start today’s practice")}<ArrowRight size={17} />
                    </button>
                    <span className="hero-caption">
                      {minutes} {t("minutes · at your own pace")}</span>
                  </div>
                  <div className="hero-art" aria-hidden="true">
                    <div className="art-orbit" />
                    <div className="art-card art-back">
                      <span>好</span>
                      <small>hǎo</small>
                    </div>
                    <div className="art-card art-front">
                      <span>你</span>
                      <small>nǐ</small>
                      <i />
                    </div>
                    <div className="art-spark">✳</div>
                    <div className="art-dot" />
                  </div>
                </section>
                <section className="week-card panel">
                  <div className="section-top">
                    <h3>{t("Your week")}</h3>
                    <span className="soft-icon">
                      <TrendingUp size={17} />
                    </span>
                  </div>
                  <div className="week-total">
                    {week.filter((d) => d.count > 0).length}
                    <span> / 7 {t("days")}</span>
                  </div>
                  <p>{t("Every practice is progress.")}</p>
                  <div className="week-chart">
                    {week.map((d, i) => (
                      <div key={i}>
                        <div
                          className={"day-bar " + (d.today ? "is-today" : "")}
                          style={{
                            height:
                              Math.max(8, Math.min(74, d.count * 8)) + "px",
                          }}
                        />
                        <span>{d.day}</span>
                      </div>
                    ))}
                  </div>
                  <small>
                    {todays.length
                      ? t("You showed up today. Keep it going.")
                      : t("Your next chapter starts today.")}
                  </small>
                </section>
              </div>
              <Suspense fallback={null}><TodayCourseReviews key={user?.id ?? "guest"} owner={user?.id ?? null} notify={notify}/></Suspense>
              <Suspense fallback={null}><TodayRecognition key={user?.id ?? "guest"} owner={user?.id ?? null}/></Suspense>
              <div className="stats-row">
                <div>
                  <span className="stat-icon sage">
                    <BookOpen size={21} />
                  </span>
                  <p>
                    <strong>
                      {practiced}
                      <small> / {studyItems.length}</small>
                    </strong>
                    <span>{t("Words explored")}</span>
                  </p>
                </div>
                <div>
                  <span className="stat-icon peach">
                    <RotateCcw size={21} />
                  </span>
                  <p>
                    <strong>{due}</strong>
                    <span>{t("Reviews due")}</span>
                  </p>
                </div>
                <div>
                  <span className="stat-icon yellow">
                    <PenLine size={21} />
                  </span>
                  <p>
                    <strong>
                      {events.filter((e) => e.skill === "writing").length}
                    </strong>
                    <span>{t("Writing attempts")}</span>
                  </p>
                </div>
                <div>
                  <span className="stat-icon blue">
                    <Check size={21} />
                  </span>
                  <p>
                    <strong>{accuracy === null ? "—" : accuracy + "%"}</strong>
                    <span>{t("Independent recall")}</span>
                  </p>
                </div>
              </div>
              <div className="section-title">
                <div>
                  <h2>{t("Pick up where you left off")}</h2>
                  <p>{t("A few useful words. A world of possibilities.")}</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => changeView("lessons")}
                >
                  {t("All lessons")}<ArrowRight size={16} />
                </button>
              </div>
              <div className="lesson-grid">
                {visibleLessons.slice(0, 3).map((l) => (
                  <button
                    key={l.id}
                    className="lesson-card panel"
                    onClick={() => {
                      setLesson(l.id);
                      changeView("lessons");
                    }}
                  >
                    <div className={"lesson-illustration " + l.color}>
                      <span>
                        {studyItems.find((i) => i.lesson === l.id)!.hanzi}
                        <small>
                          {studyItems.find((i) => i.lesson === l.id)!.pinyin}
                        </small>
                      </span>
                      <b>{l.icon}</b>
                    </div>
                    <div className="lesson-content">
                      <span className="eyebrow">
                        {t(levelNames[level])} ·{" "}
                        {
                          studyItems.filter((item) => item.lesson === l.id)
                            .length
                        }{" "}
                        {t("WORDS")}</span>
                      <h3>{l.title}</h3>
                      <p>{l.subtitle}</p>
                      <div className="lesson-progress">
                        <span
                          style={{
                            width:
                              (new Set(
                                events
                                  .filter(
                                    (e) =>
                                      items.find((i) => i.id === e.itemId)
                                        ?.lesson === l.id,
                                  )
                                  .map((e) => e.itemId),
                              ).size /
                                Math.max(
                                  1,
                                  studyItems.filter(
                                    (item) => item.lesson === l.id,
                                  ).length,
                                )) *
                                100 +
                              "%",
                          }}
                        />
                      </div>
                      <div className="lesson-bottom">
                        <span>
                          {
                            new Set(
                              events
                                .filter(
                                  (e) =>
                                    items.find((i) => i.id === e.itemId)
                                      ?.lesson === l.id,
                                )
                                .map((e) => e.itemId),
                            ).size
                          }{" "}
                          {t("of")}{" "}
                          {
                            studyItems.filter((item) => item.lesson === l.id)
                              .length
                          }{" "}
                          {t("explored")}
                        </span>
                        <ArrowRight size={17} />
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="tip-strip">
                <Lightbulb size={21} />
                <p>
                  <strong>{t("Let your hand do the remembering.")}</strong> {t("Try the writing studio with Apple Pencil, a finger, or your mouse.")}</p>
                <button onClick={() => openPractice(studyItems[0])}>
                  {t("Give it a try")}<ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {view === "lessons" && (
            <>
              <div id="library-start" className="page-heading" tabIndex={-1}>
                <div>
                  <p className="eyebrow">{t("WORDS FOR YOUR REAL LIFE")}</p>
                  {level === "hsk3" && <button className="grammar-back" onClick={() => changeView("grammar")}>{t("HSK3 grammar")} →</button>}
                  <h1>
                    {t("Your learning library")}<span className="orange">.</span>
                  </h1>
                  <p>
                    {practiceSelection?libraryCopy.selected:t(levelNames[level])} · {practiceSelection?chosenItems.length:studyItems.length} {t("words & phrases.")}{" "}
                    {!practiceSelection&&(level === "bonus"?t("Useful everyday additions."):t("HSK 2025 syllabus."))}
                  </p>
                </div>
              </div>
              <nav className="library-lesson-links" aria-label={libraryLessonLabel}>
                <span><BookOpen size={15}/>{libraryLessonLabel}</span>
                <button type="button" onClick={openShuoshuoLesson}>Shuoshuo · Morning</button>
                <button type="button" aria-label={({en:'Open My day lesson',fr:'Ouvrir Ma journée',ru:'Открыть урок «Мой день»',tr:'Günüm dersini aç'}[locale])} onClick={openMyDay}>{({en:'My day',fr:'Ma journée',ru:'Мой день',tr:'Günüm'}[locale])}</button>
                <button type="button" className="library-practice-shortcut" aria-pressed={practiceSelection} onClick={()=>{setPracticeSelection(true);libraryRoute(libraryLayout,true);}}><BookmarkCheck size={15}/>{libraryCopy.selected} · {practiceBook.entries.length}</button>
                <ReferenceLessonLinks compact onOpen={id=>{stopAudio();window.history.replaceState(null,'',referenceLessonHref(id)+'&from=lessons');setView('course');window.scrollTo({top:0,behavior:'instant'});}}/>
              </nav>
              <button hidden={practiceSelection} className="secondary pdf-library-button" onClick={() => setPdfSelection(filtered.map(item => item.id))}><Download size={16} /> {t("Print notebook PDF")}</button>
              <div className="library-controls">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    placeholder={t("Find a word, pinyin or meaning…")}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label={t("Choose lesson")}
                  value={practiceSelection?'selected':lesson}
                  onChange={(e) => {const selected=e.target.value==='selected';setPracticeSelection(selected);if(!selected)setLesson(e.target.value);libraryRoute(libraryLayout,selected);}}
                >
                  <option value="selected">{libraryCopy.selected} · {practiceBook.entries.length}</option>
                  <option value="all">
                    {t("All")} {t(levelNames[level])} {t("words ·")} {studyItems.length}
                  </option>
                  {visibleLessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>
              <StudyConfusionsButton/>
              <div className="library-results-bar"><p className="library-count" role="status">{filtered.length} {t(filtered.length===1?'word':'words')} · {practiceSelection?libraryCopy.selected:t(levelNames[level])}</p><div className="library-view-switch" role="group" aria-label="Library view"><button type="button" title={libraryCopy.cards} aria-label={libraryCopy.cards} aria-pressed={libraryLayout==='cards'} onClick={()=>{setLibraryLayout('cards');libraryRoute('cards');}}><LayoutGrid size={17}/></button><button type="button" title={libraryCopy.notebook} aria-label={libraryCopy.notebook} aria-pressed={libraryLayout==='notebook'} onClick={()=>{setLibraryLayout('notebook');libraryRoute('notebook');}}><Rows3 size={17}/></button></div><LibraryScrollControls/></div>
              {practiceSelection&&<p className="library-selection-note">{libraryCopy.ready}</p>}
              <div className={'word-grid'+(libraryLayout==='notebook'?' is-notebook':'')}>
                {filtered.map((i) => (
                  <div className="library-word-row" key={i.id}><article className="word-card panel" data-study-sentence={i.sentence} data-study-pinyin={i.sentencePinyin} data-study-meaning={i.translation}>
                    <span className="eyebrow library-word-level"><HskBadge text={i.hanzi}/></span>
                    <button type="button" className="icon-button library-add-choice" disabled={!practiceBook.ready||practiceBook.busy} aria-pressed={practiceBook.entries.some(v=>v.text===i.hanzi)} aria-label={practiceBook.entries.some(v=>v.text===i.hanzi)?libraryCopy.remove:libraryCopy.add} onClick={()=>void practiceBook.toggle({text:i.hanzi,pinyin:i.pinyin,meaning:i.english,contextual:i.sentence?{text:i.sentence,pinyin:i.sentencePinyin,meaning:i.translation}:undefined})}>{practiceBook.entries.some(v=>v.text===i.hanzi)?<BookmarkCheck size={18}/>:<BookmarkPlus size={18}/>}</button>
                    <div className="word-heading">
                      <div>
                        <span className="hanzi"><StudyText text={i.hanzi} whole/></span>
                        <p className="pinyin">{i.pinyin}</p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={t("Listen to") + " " + i.pinyin}
                        disabled={!sourceItems.some(v=>v.id===i.id)&&!libraryRecording(i,'word')} onClick={() => listenLibrary(i,'word')}
                      >
                        <Volume2 size={20} />
                      </button>
                    </div>
                    <h3>{i.english}</h3>
                    <div className="sentence" hidden={!i.sentence}>
                      <span><StudyText text={i.sentence}/></span>
                      <span className="pinyin">{i.sentencePinyin}</span>
                      <small>{i.translation}</small>
                      <button
                        className="text-button"
                        aria-label={t("Listen to example:") + " " + i.pinyin}
                        disabled={!sourceItems.some(v=>v.id===i.id)&&!libraryRecording(i,'sentence')} onClick={() => listenLibrary(i,'sentence')}
                      >
                        <Volume2 size={14} /> {t("Listen to example")}</button>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => sourceItems.some(v=>v.id===i.id)?openPractice(i):setRecognitionWriting(i)}
                    >
                      {t("Practice writing")}<ArrowRight size={16} />
                    </button>
                  </article>{libraryLayout==='notebook'&&<LibraryNotebook key={(user?.id??'guest')+':'+i.id} text={i.hanzi} db={db?.name==='chinese-os-v1-'+(user?.id??'guest')?db:null}/>}</div>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  {practiceSelection?libraryCopy.empty:t("No words found. Try another spelling or lesson.")}</div>
              )}
              <div id="library-end" className="library-boundary" tabIndex={-1}/>
            </>
          )}
          {view === "reviews" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{t("MAKE IT STICK")}</p>
                  <h1>
                    {t("A little recall goes far")}<span className="orange">.</span>
                  </h1>
                  <p>
                    {t("Your memory grows differently for every skill. Give each one its own time.")}</p>
                </div>
              </div>
              <div className="session-length">
                <span>{t("My session")}</span>
                {[5, 10, 20].map((m) => (
                  <button
                    key={m}
                    className={minutes === m ? "selected" : ""}
                    onClick={() => setMinutes(m)}
                  >
                    {m} min
                  </button>
                ))}
              </div>
              <div className="review-grid">
                {(["meaning", "listening", "writing", ...languageSkills] as Skill[]).map(
                  (s, index) => {
                    const Icon = [BookOpen, Headphones, PenLine][index%3];
                    const count = Object.entries(cards).filter(
                      ([k, c]) =>
                        k.endsWith(":" + s) &&
                        new Date(c.due).getTime() <= Date.now(),
                    ).length;
                    const fresh = studyItems.filter(
                      (i) => !cards[i.id + ":" + s],
                    ).length;
                    return (
                      <section className="panel review-option" key={s}>
                        <span
                          className={
                            "stat-icon " + ["sage", "peach", "yellow"][index%3]
                          }
                        >
                          <Icon size={26} />
                        </span>
                        <h2>{skillNames[s]}</h2>
                        <p>
                          {s === "meaning"
                            ? t("See the word. Recall what it means.")
                            : s === "listening"
                              ? t("Listen carefully. Connect sound to meaning.")
                              : isLanguageSkill(s)?(s==='pinyin'?'Recall and write the reading with every tone.':s==='ime'?'Type Pinyin and select the matching Chinese characters.':'Read the Pinyin and recall the Chinese characters.'):t("An empty grid. A word from memory.")}
                        </p>
                        <strong>
                          {count}
                          <small> {t("due ·")} {fresh} {t("new")}</small>
                        </strong>
                        <button
                          className="primary"
                          onClick={() => startReview(s)}
                        >
                          {t("Start")} {skillNames[s].toLowerCase()}{" "}
                          <ArrowRight size={17} />
                        </button>
                        {s === "meaning" && <button className="secondary" onClick={()=>startReview("meaning",true)}>{t("Extra recognition practice")}</button>}
                        {s === "meaning" && <><button className="secondary" onClick={()=>startReview('meaning','all')}>{allWordsCopy.replace('{0}',String(studyItems.length))}</button><small className="review-all-note">{allWordsNote}</small></>}
                      </section>
                    );
                  },
                )}
              </div>
              <div className="tip-strip">
                <Sparkles size={22} />
                <p>
                  {t("FSRS schedules each skill separately at a 90% retention target. Tracing and copying are practice; they do not count as independent recall.")}</p>
              </div>
            </>
          )}
          {view === "practice" &&
            (finished ? (
              <section className="completion panel">
                <span className="completion-icon">
                  <Check size={34} />
                </span>
                <p className="eyebrow">{t("SESSION COMPLETE")}</p>
                <h1>
                  {t("You showed up.")}<br />
                  {t("That’s how it starts.")}</h1>
                <p>
                  {session?.length} {t("words reviewed. Your next reviews are scheduled.")}</p>
                <button
                  className="primary"
                  onClick={() => changeView("progress")}
                >
                  {t("See my progress")}<ArrowRight size={17} />
                </button>
              </section>
            ) : (
              <>
                <div className="page-heading studio-heading">
                  <div>
                    <p className="eyebrow">
                      {session
                        ? t("YOUR REVIEW · {0} OF {1}", [sessionIndex + 1, session.length])
                        : t("THE WRITING STUDIO")}
                    </p>
                    <h1>
                      {isLanguageSkill(skill)?skillNames[skill]:skill !== "writing"
                        ? skillNames[skill] + " · " + t("Practice")
                        : hanziAppearance.style==='print'?t("Practice writing"):t("One stroke at a time")}
                      <span className="orange">.</span>
                    </h1>
                    <p>
                      {isLanguageSkill(skill)?(skill==='pinyin'?'Recall the reading. Write every tone.':skill==='hanzi-from-pinyin'?'Read the Pinyin. Recall the matching characters.':'Type the reading. Choose the characters that fit.'):session
                        ? t("Take a breath. Recall before you reveal.")
                        : hanziAppearance.style==='print'?t("Look at the reference. Write in the empty grid."):t("Watch it. Trace it. Make it yours.")}
                    </p>
                  </div>
                  {!session && (
                    <select
                      aria-label={t("Select word")}
                      value={selected.id}
                      onChange={(e) =>
                        setSelected(items.find((i) => i.id === e.target.value)!)
                      }
                    >
                      {!studyItems.some(i=>i.id===selected.id)&&<option value={selected.id}>{selected.hanzi+' · '+selected.pinyin+' · '+selected.english}</option>}
                      {studyItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {isLanguageSkill(skill)?i.english:i.hanzi+' · '+i.pinyin+' · '+i.english}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {!session&&<div className="language-studio-tabs" role="group" aria-label="Writing and language practice"><button type="button" className={skill==='writing'?'primary':'secondary'} aria-pressed={skill==='writing'} onClick={()=>{setLanguageRun(undefined);setSkill('writing');}}>Hanzi writing</button>{languageSkills.map(value=><button type="button" key={value} className={skill===value?'primary':'secondary'} aria-pressed={skill===value} onClick={()=>{setLanguageRun(undefined);setSkill(value);}}>{skillNames[value]}</button>)}</div>}
                {skill === "writing" && !session && (
                  <div className="notebook-layout-switch" role="group" aria-label={t("Writing layout")}>
                    <button className={writingLayout === "studio" ? "selected" : ""} aria-pressed={writingLayout === "studio"} onClick={() => setWritingLayout("studio")}>{t("Writing studio")}</button>
                    <button className={writingLayout === "notebook" ? "selected" : ""} aria-pressed={writingLayout === "notebook"} onClick={() => setWritingLayout("notebook")}><BookOpen size={16} /> {t("Notebook · Zeszyt")}</button>
                    <button onClick={() => setPdfSelection([selected.id])}><Download size={16} /> {t("Print notebook PDF")}</button>
                  </div>
                )}
                {isLanguageSkill(skill)?<LanguagePractice key={(user?.id??'guest')+':'+selected.id+':'+skill} item={selected} skill={skill} runId={languageRun} db={db?.name==='chinese-os-v1-'+(user?.id??'guest')?db:null} record={record} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} next={next}/>:skill === "writing" && writingLayout === "notebook" && !session ? (
                  <Notebook key={selected.id} item={selected} db={db} penOnly={penOnly} setPenOnly={setPenOnly} record={record} notify={notify} next={next}
                    onRecall={() => { setWritingLayout("studio"); setMode("recall"); }} />
                ) : skill === "writing" ? (
                  <Writing
                    key={
                      selected.id +
                      ":" +
                      mode +
                      ":" +
                      (session ? "review" : "practice")
                    }
                    item={selected}
                    mode={mode}
                    setMode={setMode}
                    db={db}
                    record={record}
                    next={next}
                    penOnly={penOnly}
                    setPenOnly={setPenOnly}
                    left={left}
                    notify={notify}
                    session={!!session}
                  />
                ) : skill === "meaning" ? (
                  <RecognitionReview key={(user?.id ?? "guest") + ":" + recognitionRun}
                    db={db?.name === "chinese-os-v1-" + (user?.id ?? "guest") ? db : null}
                    onRetryStorage={retryStorage} runId={recognitionRun} queue={(session ?? [selected]).map(i => sourceItems.find(source => source.id === i.id)!)}
                    record={record} notify={notify} practice={recognitionPractice} onWrite={setRecognitionWriting} onPosition={index => {
                      if (session) {setSessionIndex(index); if(session[index])setSelected(session[index]);}
                    }}/>
                ) : (
                  <Recall
                    key={selected.id + skill}
                    item={selected}
                    skill={skill}
                    record={record}
                    next={next}
                    notify={notify}
                  />
                )}
              </>
            ))}
          {view === "progress" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{t("YOUR EFFORT, MADE VISIBLE")}</p>
                  <h1>
                    {t("Look how far you’ve come")}<span className="orange">.</span>
                  </h1>
                  <p>
                    {t("Practice builds familiarity. Independent recall builds lasting memory.")}</p>
                </div>
                <button
                  className="secondary"
                  onClick={() => void exportBackup()}
                >
                  {backup ? t("Export again") : t("Export my history")}{" "}
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="progress-summary">
                <div className="panel">
                  <strong>{events.length}</strong>
                  <span>{t("Total attempts")}</span>
                </div>
                <div className="panel">
                  <strong>{independent.length}</strong>
                  <span>{t("Independent reviews")}</span>
                </div>
                <div className="panel">
                  <strong>{events.length - independent.length}</strong>
                  <span>{t("Guided / assisted practice")}</span>
                </div>
              </div>
              <div className="panel progress-table">
                <div className="section-title">
                  <h2>{t("Your words, by skill")}</h2>
                  <span>{practiced} {t("words explored")}</span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>{t("Word")}</th>
                        {Object.values(skillNames).map((s) => (
                          <th key={s}>{s}</th>
                        ))}
                        <th>{t("Practice")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studyItems
                        .filter((i) => events.some((e) => e.itemId === i.id))
                        .map((i) => (
                          <tr key={i.id}>
                            <td>
                              <strong>{i.hanzi}</strong>
                              <span className="pinyin">{i.pinyin}</span>
                              <small>{i.english}</small>
                            </td>
                            {(
                              ["meaning", "listening", "writing", ...languageSkills] as Skill[]
                            ).map((s) => {
                              const c = cards[i.id + ":" + s];
                              return (
                                <td key={s}>
                                  {c ? (
                                    <span
                                      className={
                                        "due-tag " +
                                        (new Date(c.due).getTime() <= Date.now()
                                          ? "due"
                                          : "")
                                      }
                                    >
                                      {new Date(c.due).getTime() <= Date.now()
                                        ? t("Due now")
                                        : new Date(c.due).toLocaleDateString(
                                            locale,
                                            { month: "short", day: "numeric" },
                                          )}
                                      <small>{c.reps} {t("reviews")}</small>
                                    </span>
                                  ) : (
                                    <span className="muted">{t("Not reviewed")}</span>
                                  )}
                                </td>
                              );
                            })}
                            <td>
                              <button
                                className="icon-button"
                                aria-label={t("Practice") + " " + i.pinyin}
                                onClick={() => openPractice(i, "recall")}
                              >
                                <PenLine size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                  {!events.length && (
                    <div className="empty-state">
                      <Leaf size={32} />
                      <h3>{t("Your notebook is ready.")}</h3>
                      <p>{t("Start with a word. Your progress will grow here.")}</p>
                      <button
                        className="primary"
                        onClick={() => openPractice(studyItems[0])}
                      >
                        {t("Try your first word")}<ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="tip-strip">
                <Cloud size={21} />
                <p>
                  {user
                    ? t("Your records are private to your account. Repeated offline uploads are deduplicated, and review order is rebuilt from your history.")
                    : t("Guest progress stays in this browser. Sign in to keep a separate notebook across your devices.")}
                </p>
                {!user && (
                  <a
                    href="#account"
                    onClick={(event) => {
                      event.preventDefault();
                      onSignIn();
                    }}
                    target="_top"
                  >
                    {t("Sign in")}<ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            </>
          )}
          <footer>
            {t("Small steps. Lasting connections.")}<span>{t("CHINESE OS · MADE FOR YOUR EVERYDAY")}</span>
          </footer>
        </div>
      <dialog ref={recognitionWriter} className="study-writing-dialog" aria-label={t("Practice writing")} onCancel={e=>{e.preventDefault();setRecognitionWriting(null);}} onClose={()=>setRecognitionWriting(null)}>
        <header><h2>{t("Practice writing")}</h2><button className="secondary" onClick={()=>setRecognitionWriting(null)} aria-label={view==='lessons'?({en:'Back to library',fr:'Retour à la bibliothèque',ru:'Назад в библиотеку',tr:'Kitaplığa dön'}[locale]):t("Back to recognition")}><X size={20}/></button></header>
        {recognitionWriting&&<SharedWriting key={recognitionWriting.id} hanzi={recognitionWriting.hanzi} item={recognitionWriting} audio={recognitionWriting.id.startsWith('practice-choice:')?{word:libraryRecording(recognitionWriting,'word'),sentence:libraryRecording(recognitionWriting,'sentence')}:undefined} onBack={()=>setRecognitionWriting(null)}/>}
      </dialog></main></StudyLookupProvider></WritingPracticeProvider>
      {pdfSelection && <PdfExport key={level} level={level} initialIds={pdfSelection} onClose={() => setPdfSelection(null)} />}
      {toast && (
        <div className="toast" role="status">
          {t(toast)}
          <button onClick={() => setToast("")} aria-label={t("Dismiss")}>
            <X size={16} />
          </button>
        </div>
      )}
      {settings && (
        <div className="modal-backdrop" onClick={() => setSettings(false)}>
          <section
            className="settings-modal panel"
            role="dialog"
            aria-modal="true"
            aria-label={t("Study preferences")}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-top">
              <h2>{t("Make yourself at home.")}</h2>
              <button
                className="icon-button"
                onClick={() => setSettings(false)}
                aria-label={t("Close settings")}
              >
                <X size={20} />
              </button>
            </div>
            <HanziDisplayControls/>
            <label className="setting-row">
              <span>
                <strong>{t("Slower pronunciation")}</strong>
                <small>{t("Take your time. Keep the same natural pitch.")}</small>
              </span>
              <input
                type="checkbox"
                checked={slowAudio}
                onChange={(e) => setSlowAudio(e.target.checked)}
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>{t("Pencil only")}</strong>
                <small>{t("Ignore finger drawing inside the writing grid.")}</small>
              </span>
              <input
                type="checkbox"
                checked={penOnly}
                onChange={(e) => setPenOnly(e.target.checked)}
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>{t("Left-handed layout")}</strong>
                <small>{t("Move writing controls to the left.")}</small>
              </span>
              <input
                type="checkbox"
                checked={left}
                onChange={(e) => setLeft(e.target.checked)}
              />
            </label>
            {user && (
              <button
                className="secondary auth-wide"
                onClick={() => {
                  setSettings(false);
                  onManageAccount();
                }}
              >
                {t("Manage learning account")}<ArrowUpRight size={16} />
              </button>
            )}
            <p className="muted">
              {t("Guest and signed-in notebooks are separate. Pronunciation uses bundled Mandarin recordings.")}</p>
            {!user ? (
              <a
                className="primary"
                href="#account"
                onClick={(event) => {
                  event.preventDefault();
                  onSignIn();
                }}
                target="_top"
              >
                {t("Sign in to sync progress")}<ArrowUpRight size={16} />
              </a>
            ) : (
              <a
                className="text-button"
                href="#signout"
                onClick={(event) => {
                  event.preventDefault();
                  onSignOut();
                }}
                target="_top"
              >
                {t("Sign out")}</a>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function Recall({
  item,
  skill,
  record,
  next,
  notify,
}: {
  item: Item;
  skill: Skill;
  record: (e: LearningEvent) => Promise<void>;
  next: () => void;
  notify: (m: string) => void;
}) {
  const { t, locale } = useI18n();
  const [revealed, setRevealed] = useState(false);
  const assisted=useRef(false);const [lookedUp,setLookedUp]=useState(false);const dictionaryHelp=useDictionaryAssistance(()=>{assisted.current=true;setLookedUp(true);});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(Date.now());
  async function rate(r: 1 | 2 | 3 | 4) {
    if (saving || done) return;
    setSaving(true);
    try {
      await record(
        newEvent(item, skill, "recall", r, assisted.current, {
          duration: Date.now() - started.current,
        }),
      );
      setDone(true);
    } catch {
      notify(t("Could not save this review. Please try again."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section ref={dictionaryHelp} data-study-assessment={revealed?"complete":"supported"} className="recall-card panel">
      <span className="pill">{t(sourceSkillNames[skill])} {t(lookedUp?"Guided / assisted practice":"· INDEPENDENT RECALL")}</span>
      {skill === "meaning" ? (
        <>
          <div className="recall-hanzi"><StudyText text={item.hanzi} whole/></div>
          <p className="pinyin">{item.pinyin}</p>
          <p>{t("What does this word mean?")}</p>
        </>
      ) : (
        <>
          <button
            className="listen-big"
            aria-label={t("Play Chinese word")}
            onClick={() => speak(item.hanzi, notify, item)}
          >
            <Volume2 size={42} />
          </button>
          <h2>{t("What did you hear?")}</h2>
          <p>{t("Play it again if you need to. Recall the meaning.")}</p>
        </>
      )}
      {!revealed ? (
        <button className="primary" onClick={() => setRevealed(true)}>
          {t("Reveal answer")}<ArrowRight size={16} />
        </button>
      ) : (
        <>
          <div className="revealed-answer">
            {skill === "listening" && (
              <>
                <strong>{item.hanzi}</strong>
                <span className="pinyin">{item.pinyin}</span>
              </>
            )}
            <h2>{item.english}</h2>
            <p>{item.sentence}</p>
            <p className="pinyin">{item.sentencePinyin}</p>
            <small>{item.translation}</small>
            <button
              className="text-button"
              onClick={() => speak(item.sentence, notify, item)}
            >
              <Volume2 size={14} /> {t("Listen to example")}</button>
          </div>
          {done ? (
            <button className="primary" onClick={next}>
              {t("Saved · next word")}<ArrowRight size={17} />
            </button>
          ) : (
            <>
              <p className="rating-instruction">
                {t("Rate what you remembered before revealing.")}</p>
              <Ratings onRate={rate} disabled={saving} />
            </>
          )}
        </>
      )}
    </section>
  );
}
