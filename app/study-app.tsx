"use client";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
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
import Ink from "./ink";
import Guided from "./guided";
import Notebook from "./notebook";
import IntensiveCourse from "./intensive-course";
import PdfExport from "./pdf-export";
import { LanguagePicker, useI18n } from "./i18n";
import { localizeItem } from "./translate";
import { progressSchema } from "./event-schema";
import { speak, setSpeechRate, stopAudio } from "./audio";
import { authenticatedFetch } from "./auth-client";
import type { StudyUser as User } from "./auth-shell";
const Atlas = lazy(() => import("./atlas"));
type View = "atlas" | "course" | "today" | "lessons" | "practice" | "reviews" | "progress";
type Draft = {
  strokes: Stroke[][];
  index: number;
  assisted: boolean;
  hints: number;
  revealed?: boolean;
  completed?: number[];
  attemptId?: string;
};
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
  const items = useMemo(() => sourceItems.map(item => localizeItem(item, locale)), [locale]);
  const lessons = sourceLessons.map(lesson => ({...lesson, title: t(lesson.title), subtitle: t(lesson.subtitle)}));
  const skillNames = Object.fromEntries(Object.entries(sourceSkillNames).map(([key,value]) => [key,t(value)])) as typeof sourceSkillNames;
  const [view, setView] = useState<View>("today");
  useEffect(() => { if (new URLSearchParams(window.location.search).get("atlas") === "1") setView("atlas"); else if (new URLSearchParams(window.location.search).get("course") === "intensive") setView("course"); }, []);
  const [notebookEvents, setEvents] = useState<LearningEvent[]>([]);
  const [sync, setSync] = useState(t("Loading your notebook…"));
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const syncLock = useRef(false);
  const [selectedRecord, setSelected] = useState(items[0]);
  const selected = items.find(item => item.id === selectedRecord.id) ?? items[0];
  const [skill, setSkill] = useState<Skill>("writing");
  const [mode, setMode] = useState<Mode>("trace");
  const [writingLayout, setWritingLayout] = useState<"studio" | "notebook">("studio");
  const [search, setSearch] = useState("");
  const [lesson, setLesson] = useState("all");
  const [level, setLevel] = useState<StudyLevel>("hsk1");
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
  const [finished, setFinished] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [backup, setBackup] = useState(false);
  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(""), 4500);
  }, []);
  useEffect(() => {
    let alive = true;
    openStore(user?.id ?? "guest")
      .then(async (store) => {
        if (!alive) {
          store.close();
          return;
        }
        setDb(store);
        setEvents(await allEvents(store));
        setSync(user ? t("Ready to sync") : t("Guest · saved on this device"));
        const prefs = await readDraft<{
          penOnly: boolean;
          slowAudio?: boolean;
          level?: StudyLevel;
          left: boolean;
          minutes: number;
        }>(store, "settings");
        if (prefs) {
          setPenOnly(prefs.penOnly);
          setSlowAudio(prefs.slowAudio ?? false);
          setLeft(prefs.left);
          setMinutes(prefs.minutes);
          if (prefs.level && ["hsk1", "hsk2", "bonus"].includes(prefs.level)) {
            setLevel(prefs.level);
            setSelected(items.find((item) => isInLevel(item, prefs.level!))!);
          }
        }
        setIsReady(true);
      })
      .catch(() => {
        setSync(t("Device storage unavailable"));
        notify(t("Enable browser storage to save your practice."));
      });
    return () => {
      alive = false;
    };
  }, [user?.id, notify]);
  useEffect(() => {
    if (db && isReady)
      saveDraft(db, "settings", {
        penOnly,
        slowAudio,
        left,
        minutes,
        level,
      }).catch(() => notify(t("Could not save preferences.")));
  }, [db, isReady, penOnly, slowAudio, left, minutes, level, notify]);
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
  function openPractice(item: Item, practiceMode: Mode = "trace") {
    window.history.replaceState(null, "", window.location.pathname);
    setSession(null);
    setFinished(false);
    setSelected(item);
    setMode(practiceMode);
    setSkill("writing");
    setView("practice");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function startReview(s: Skill) {
    const count = Math.max(
      1,
      Math.floor((minutes * 60) / (s === "writing" ? 90 : 25)),
    );
    const queue = makeQueue(events, s, studyItems).slice(0, count);
    if (!queue.length) {
      notify(
        t("You are all caught up for this skill. Try another skill or practice a lesson."),
      );
      return;
    }
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
  const filtered = studyItems.filter((item) =>
    matchesItem(item, search, lesson),
  );
  function changeView(v: View) {
    window.history.replaceState(null, "", window.location.pathname + (v === "atlas" ? "?atlas=1" : v === "course" ? "?course=intensive" : ""));
    stopAudio();
    if (v === "practice") {
      setSkill("writing");
      setMode("trace");
    }
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
    <div className="app-shell">
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
              { id: "atlas", title: "Atlas", icon: Network },
              { id: "practice", title: t("Writing studio"), icon: PenLine },
              { id: "reviews", title: t("Review"), icon: RotateCcw },
              { id: "progress", title: t("My progress"), icon: TrendingUp },
            ] as const
          ).map((n) => (
            <button
              key={n.id}
              className={view === n.id ? "nav-item active" : "nav-item"}
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
      <main className="main">
        <header className="topbar">
          <span>
            <span className="breadcrumb">{t("My study space")}</span>
            <ChevronRight size={13} />
            {view === "atlas" ? "Atlas chmur" : view === "course" ? t("Intensive course") : view === "practice"
              ? t("Writing studio")
              : view === "today"
                ? t("Today")
                : view === "lessons"
                  ? t("My lessons")
                  : view === "reviews"
                    ? t("Review")
                    : t("My progress")}
          </span>
          <div className="topbar-actions">
            <LanguagePicker />
            {view !== "course" && view !== "atlas" && <select
              className="study-level"
              aria-label={t("Study level")}
              value={level}
              onChange={(event) =>
                changeLevel(event.target.value as StudyLevel)
              }
            >
              <option value="hsk1">HSK1 · {curriculum.hsk1}</option>
              <option value="hsk2">HSK2 · {curriculum.hsk2}</option>
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
          {view === "atlas" && <Suspense fallback={<p role="status">{t("Loading your notebook…")}</p>}><Atlas owner={user?.id ?? null} db={db} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} onWord={item=>{setLevel(item.hskLevel===2?"hsk2":item.hskLevel===1?"hsk1":"bonus");openPractice(item);}}/></Suspense>}
          {view === "course" && <IntensiveCourse owner={user?.id ?? null} db={db} penOnly={penOnly} setPenOnly={setPenOnly} recordHSK={record} notify={notify} onHSKRecall={item => { setLevel(item.hskLevel === 2 ? "hsk2" : item.hskLevel === 1 ? "hsk1" : "bonus"); openPractice(item, "recall"); }} />}
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
              <div className="page-heading">
                <div>
                  <p className="eyebrow">{t("WORDS FOR YOUR REAL LIFE")}</p>
                  <h1>
                    {t("Your learning library")}<span className="orange">.</span>
                  </h1>
                  <p>
                    {t(levelNames[level])} · {studyItems.length} {t("words & phrases.")}{" "}
                    {level === "bonus"
                      ? t("Useful everyday additions.")
                      : t("HSK 2025 syllabus.")}
                  </p>
                </div>
              </div>
              <button className="secondary pdf-library-button" onClick={() => setPdfSelection(filtered.map(item => item.id))}><Download size={16} /> {t("Print notebook PDF")}</button>
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
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                >
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
              <p className="library-count" role="status">
                {filtered.length} {t(filtered.length === 1 ? "word" : "words")} ·{" "}
                {t(levelNames[level])}
              </p>
              <div className="word-grid">
                {filtered.map((i) => (
                  <article className="word-card panel" key={i.id}>
                    <span className="eyebrow">
                      {i.hskLevel ? `HSK${i.hskLevel}` : t("EXTRA")} ·{" "}
                      {lessons.find((l) => l.id === i.lesson)?.title}
                    </span>
                    <div className="word-heading">
                      <div>
                        <span className="hanzi">{i.hanzi}</span>
                        <p className="pinyin">{i.pinyin}</p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={t("Listen to") + " " + i.pinyin}
                        onClick={() => speak(i.hanzi, notify, i)}
                      >
                        <Volume2 size={20} />
                      </button>
                    </div>
                    <h3>{i.english}</h3>
                    <div className="sentence">
                      <span>{i.sentence}</span>
                      <span className="pinyin">{i.sentencePinyin}</span>
                      <small>{i.translation}</small>
                      <button
                        className="text-button"
                        aria-label={t("Listen to example:") + " " + i.pinyin}
                        onClick={() => speak(i.sentence, notify, i)}
                      >
                        <Volume2 size={14} /> {t("Listen to example")}</button>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => openPractice(i)}
                    >
                      {t("Practice writing")}<ArrowRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  {t("No words found. Try another spelling or lesson.")}</div>
              )}
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
                {(["meaning", "listening", "writing"] as Skill[]).map(
                  (s, index) => {
                    const Icon = [BookOpen, Headphones, PenLine][index];
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
                            "stat-icon " + ["sage", "peach", "yellow"][index]
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
                              : t("An empty grid. A word from memory.")}
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
                      {session && skill !== "writing"
                        ? skillNames[skill] + " · " + t("Practice")
                        : t("One stroke at a time")}
                      <span className="orange">.</span>
                    </h1>
                    <p>
                      {session
                        ? t("Take a breath. Recall before you reveal.")
                        : t("Watch it. Trace it. Make it yours.")}
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
                      {studyItems.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.hanzi} · {i.pinyin} · {i.english}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {skill === "writing" && !session && (
                  <div className="notebook-layout-switch" role="group" aria-label={t("Writing layout")}>
                    <button className={writingLayout === "studio" ? "selected" : ""} aria-pressed={writingLayout === "studio"} onClick={() => setWritingLayout("studio")}>{t("Single character")}</button>
                    <button className={writingLayout === "notebook" ? "selected" : ""} aria-pressed={writingLayout === "notebook"} onClick={() => setWritingLayout("notebook")}><BookOpen size={16} /> {t("Notebook · Zeszyt")}</button>
                    <button onClick={() => setPdfSelection([selected.id])}><Download size={16} /> {t("Print notebook PDF")}</button>
                  </div>
                )}
                {skill === "writing" && writingLayout === "notebook" && !session ? (
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
                              ["meaning", "listening", "writing"] as Skill[]
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
      </main>
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

function newEvent(
  item: Item,
  skill: Skill,
  mode: Mode,
  rating: LearningEvent["rating"],
  assisted: boolean,
  detail: LearningEvent["detail"] = {},
): LearningEvent {
  return {
    id: crypto.randomUUID(),
    itemId: item.id,
    skill,
    mode,
    rating,
    assisted,
    at: Date.now(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    detail,
  };
}
function Ratings({
  onRate,
  disabled,
}: {
  onRate: (r: 1 | 2 | 3 | 4) => void;
  disabled: boolean;
}) {
  const { t, locale } = useI18n();
  return (
    <div className="ratings">
      {(
        [
          { r: 1, title: t("Again"), help: t("Could not recall") },
          { r: 2, title: t("Hard"), help: t("Correct, with effort") },
          { r: 3, title: t("Good"), help: t("Recalled correctly") },
          { r: 4, title: t("Easy"), help: t("Quick & confident") },
        ] as const
      ).map((b) => (
        <button
          key={b.r}
          disabled={disabled}
          className={"rating rating-" + b.r}
          onClick={() => onRate(b.r)}
        >
          <strong>{b.title}</strong>
          <small>{b.help}</small>
        </button>
      ))}
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
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const started = useRef(Date.now());
  async function rate(r: 1 | 2 | 3 | 4) {
    if (saving || done) return;
    setSaving(true);
    try {
      await record(
        newEvent(item, skill, "recall", r, false, {
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
    <section className="recall-card panel">
      <span className="pill">{t(sourceSkillNames[skill])} {t("· INDEPENDENT RECALL")}</span>
      {skill === "meaning" ? (
        <>
          <div className="recall-hanzi">{item.hanzi}</div>
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

function Writing({
  item,
  mode,
  setMode,
  db,
  record,
  next,
  penOnly,
  setPenOnly,
  left,
  notify,
  session,
}: {
  item: Item;
  mode: Mode;
  setMode: (m: Mode) => void;
  db: IDBDatabase | null;
  record: (e: LearningEvent) => Promise<void>;
  next: () => void;
  penOnly: boolean;
  setPenOnly: (v: boolean) => void;
  left: boolean;
  notify: (m: string) => void;
  session: boolean;
}) {
  const { t, locale } = useI18n();
  const [strokes, setStrokes] = useState<Stroke[][]>(
    Array.from(item.hanzi, () => []),
  );
  const [index, setIndex] = useState(0);
  const [assisted, setAssisted] = useState(false);
  const [hints, setHints] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [replay, setReplay] = useState(0);
  const [completed, setCompleted] = useState<Set<number>>(new Set());
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);
  const started = useRef(Date.now());
  const attemptId = useRef(crypto.randomUUID());
  const key = "writing:" + item.id + ":" + mode;
  useEffect(() => {
    let alive = true;
    if (!db) return;
    readDraft<Draft>(db, key)
      .then((d) => {
        if (!alive) return;
        if (d) {
          setStrokes(d.strokes);
          setIndex(d.index);
          setAssisted(d.assisted);
          setHints(d.hints);
          setRevealed(d.revealed ?? false);
          setCompleted(new Set(d.completed ?? []));
          if (d.attemptId) attemptId.current = d.attemptId;
        }
        setReady(true);
      })
      .catch(() => {
        setReady(true);
        notify(
          t("Could not restore the last drawing. You can still start a new attempt."),
        );
      });
    return () => {
      alive = false;
    };
  }, [db, key, notify]);
  useEffect(() => {
    if (db && ready && !saved)
      saveDraft(db, key, {
        strokes,
        index,
        assisted,
        hints,
        revealed,
        completed: [...completed],
        attemptId: attemptId.current,
      }).catch(() => notify(t("Could not save this drawing on your device.")));
  }, [
    db,
    ready,
    saved,
    key,
    strokes,
    index,
    assisted,
    hints,
    revealed,
    completed,
    notify,
  ]);
  const characters = Array.from(item.hanzi);
  const free = mode === "copy" || mode === "recall";
  const allWritten = free
    ? strokes.every((s) => s.length > 0)
    : completed.size === characters.length;
  function changeStrokes(s: Stroke[]) {
    setStrokes((old) => old.map((v, i) => (i === index ? s : v)));
  }
  async function save(r: LearningEvent["rating"]) {
    if (saved || saving) return;
    setSaving(true);
    try {
      const event = newEvent(
        item,
        "writing",
        mode,
        r,
        assisted || mode !== "recall",
        {
          strokes: compactStrokes(strokes),
          hints,
          mistakes,
          duration: Date.now() - started.current,
          input: penOnly ? "pen" : "mixed",
        },
      );
      event.id = attemptId.current;
      await record(event);
      setSaved(true);
      if (db) await saveDraft(db, key, undefined);
      notify(
        mode === "recall" && !assisted
          ? t("Review saved. Your next writing review is scheduled.")
          : t("Practice saved. Independent recall has its own schedule."),
      );
    } catch {
      notify(t("Could not save. Keep this page open and try again."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <div className={"studio-grid " + (left ? "left-handed" : "")}>
      <section className="writing-panel panel">
        <div className="studio-top">
          <div className="mode-tabs">
            {(["watch", "trace", "copy", "recall"] as Mode[]).map((m, i) => (
              <button
                disabled={session && m !== "recall"}
                key={m}
                className={mode === m ? "selected" : ""}
                onClick={() => setMode(m)}
              >
                <span>{i + 1}</span>
                {t(m[0].toUpperCase() + m.slice(1))}
              </button>
            ))}
          </div>
          <label className="pencil-toggle">
            <input
              type="checkbox"
              checked={penOnly}
              onChange={(e) => setPenOnly(e.target.checked)}
            />
            {t("Pencil only")}</label>
        </div>
        <div className="writing-prompt">
          <span className="eyebrow">
            {mode === "recall"
              ? t("WRITE FROM MEMORY")
              : t("LET YOUR HAND LEARN THE SHAPE")}
          </span>
          <h2>{item.english}</h2>
          <span className="pinyin">{item.pinyin}</span>
        </div>
        <div className="character-tabs">
          {characters.map((c, i) => (
            <button
              key={i}
              className={index === i ? "selected" : ""}
              onClick={() => setIndex(i)}
              aria-label={t("Character {0}", [i + 1])}
            >
              {mode === "recall" && !revealed ? i + 1 : c}
              {completed.has(i) && <Check size={11} />}
            </button>
          ))}
        </div>
        <div className="writing-grid">
          <div className="grid-line horizontal" />
          <div className="grid-line vertical" />
          <div className="grid-line diagonal-one" />
          <div className="grid-line diagonal-two" />
          {free ? (
            ready ? (
              <Ink
                key={index}
                disabled={saved}
                strokes={strokes[index] ?? []}
                onChange={changeStrokes}
                penOnly={penOnly}
              />
            ) : (
              <span className="canvas-notice">{t("Loading your saved drawing…")}</span>
            )
          ) : (
            <Guided
              key={index}
              character={characters[index]}
              mode={mode as "watch" | "trace"}
              penOnly={penOnly}
              replay={replay}
              onMistake={() => setMistakes((n) => n + 1)}
              onComplete={() =>
                setCompleted((prev) => new Set([...prev, index]))
              }
            />
          )}
        </div>
        <p className="canvas-caption">
          {completed.has(index) && !free
            ? t("✓ Character complete. Choose the next cell.")
            : mode === "watch"
              ? t("Follow the stroke order. Replay whenever you like.")
              : mode === "trace"
                ? t("Follow the outline, one stroke at a time.")
                : mode === "copy"
                  ? t("Look at the reference. Write in the empty grid.")
                  : t("Write the whole word, then compare your answer.")}
        </p>
        <div className="writing-tools">
          <button
            disabled={!free || saved || !strokes[index]?.length}
            onClick={() => changeStrokes(strokes[index].slice(0, -1))}
          >
            <Undo2 size={17} />
            {t("Undo")}</button>
          <button
            disabled={saved}
            onClick={() => {
              if (free) changeStrokes([]);
              else {
                setReplay((r) => r + 1);
                setCompleted((p) => {
                  const n = new Set(p);
                  n.delete(index);
                  return n;
                });
              }
            }}
          >
            <Trash2 size={17} />
            {t("Clear")}</button>
          <button
            disabled={saved || revealed}
            onClick={() => {
              setAssisted(true);
              setHints((n) => n + 1);
              setRevealed(true);
            }}
          >
            <Lightbulb size={17} />
            {t("Hint")}</button>
          <button
            disabled={saved}
            onClick={() => {
              if (free) {
                setAssisted(true);
                setHints((n) => n + 1);
                setRevealed(true);
                speak(item.hanzi, notify, item);
              } else setReplay((r) => r + 1);
            }}
          >
            <Play size={17} />
            {t("Replay")}</button>
        </div>
        <div className="writing-bottom">
          <span>
            {t("Character")} {t("{0} of {1}", [index + 1, characters.length])}
          </span>
          {index < characters.length - 1 ? (
            <button
              className="secondary"
              onClick={() => setIndex((i) => i + 1)}
            >
              {t("Next character")}<ChevronRight size={16} />
            </button>
          ) : !revealed && mode === "recall" ? (
            <button
              className="primary"
              disabled={!allWritten}
              onClick={() => setRevealed(true)}
            >
              {t("Compare answer")}<ArrowRight size={16} />
            </button>
          ) : null}
        </div>
      </section>
      <aside className="reference-panel">
        <section className="panel reference-card">
          <span className="eyebrow">
            {mode === "recall" && !revealed ? t("YOUR PROMPT") : t("WORD IN FOCUS")}
          </span>
          {mode === "recall" && !revealed ? (
            <div className="hidden-answer">
              <PenLine size={33} />
              <h3>{t("Trust your memory.")}</h3>
              <p>
                {t("The answer stays hidden until you finish. A hint counts as assisted practice.")}</p>
            </div>
          ) : (
            <>
              <div className="reference-hanzi">{item.hanzi}</div>
              <p className="pinyin">{item.pinyin}</p>
              <h3>{item.english}</h3>
              <button
                className="audio-button"
                onClick={() => speak(item.hanzi, notify, item)}
              >
                <Volume2 size={17} /> {t("Hear pronunciation")}</button>
              <div className="reference-example">
                <span className="eyebrow">{t("IN EVERYDAY LIFE")}</span>
                <p>{item.sentence}</p>
                <p className="pinyin">{item.sentencePinyin}</p>
                <small>{item.translation}</small>
                <button
                  className="text-button"
                  onClick={() => speak(item.sentence, notify, item)}
                >
                  <Volume2 size={14} /> {t("Listen to example")}</button>
              </div>
            </>
          )}
        </section>
        <section className="practice-feedback">
          <span className="soft-icon">
            <Sparkles size={18} />
          </span>
          <h3>
            {saved
              ? t("A small step, saved.")
              : mode === "recall"
                ? t("Recall first. Refine second.")
                : t("Familiarity comes with practice.")}
          </h3>
          <p>
            {mode === "recall"
              ? t("Compare your completed word and rate your memory. This exercise uses self-assessment; free writing is not automatically graded.")
              : t("Watching, tracing and copying help your hand learn. Try recall next to check your memory.")}
          </p>
          {mode === "recall" && revealed && !saved && (
            <>
              <p className="rating-instruction">
                {assisted
                  ? t("You used help. This saves practice only.")
                  : t("How well did you remember before comparing?")}
              </p>
              <Ratings
                onRate={(r) => void save(r)}
                disabled={saving || !allWritten}
              />
            </>
          )}
          {mode !== "recall" && !saved && (
            <button
              className="secondary"
              disabled={!allWritten || saving || !ready}
              onClick={() => void save(0)}
            >
              {t("Save practice")}<Check size={16} />
            </button>
          )}
          {saved && (
            <button className="primary" onClick={next}>
              {t("Next word")}<ArrowRight size={17} />
            </button>
          )}
        </section>
      </aside>
    </div>
  );
}
