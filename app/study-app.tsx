"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Headphones,
  Home,
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
  items,
  lessons,
  curriculum,
  matchesItem,
  skillNames,
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
import { progressSchema } from "./event-schema";
import { speak, setSpeechRate, stopAudio } from "./audio";
import { authenticatedFetch } from "./auth-client";
import type { StudyUser as User } from "./auth-shell";
type View = "today" | "lessons" | "practice" | "reviews" | "progress";
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
  const [view, setView] = useState<View>("today");
  const [events, setEvents] = useState<LearningEvent[]>([]);
  const [sync, setSync] = useState("Loading your notebook…");
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const syncLock = useRef(false);
  const [selected, setSelected] = useState(items[0]);
  const [skill, setSkill] = useState<Skill>("writing");
  const [mode, setMode] = useState<Mode>("trace");
  const [search, setSearch] = useState("");
  const [lesson, setLesson] = useState("all");
  const [toast, setToast] = useState("");
  const [settings, setSettings] = useState(false);
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
        setIsReady(true);
        setSync(user ? "Ready to sync" : "Guest · saved on this device");
        const prefs = await readDraft<{
          penOnly: boolean;
          slowAudio?: boolean;
          left: boolean;
          minutes: number;
        }>(store, "settings");
        if (prefs) {
          setPenOnly(prefs.penOnly);
          setSlowAudio(prefs.slowAudio ?? false);
          setLeft(prefs.left);
          setMinutes(prefs.minutes);
        }
      })
      .catch(() => {
        setSync("Device storage unavailable");
        notify("Enable browser storage to save your practice.");
      });
    return () => {
      alive = false;
    };
  }, [user?.id, notify]);
  useEffect(() => {
    if (db && isReady)
      saveDraft(db, "settings", { penOnly, slowAudio, left, minutes }).catch(
        () => notify("Could not save preferences."),
      );
  }, [db, isReady, penOnly, slowAudio, left, minutes, notify]);
  const synchronize = useCallback(async () => {
    if (!db || !user || syncLock.current) return;
    syncLock.current = true;
    try {
      if (!navigator.onLine) throw Error("offline");
      setSync("Syncing…");
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
            if (!batch.length) throw new Error("Attempt exceeds sync limit");
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
      setSync("All progress synced");
    } catch {
      setSync(
        navigator.onLine
          ? "Saved here · sync pending"
          : "Offline · saved on this device",
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
      day: isReady ? d.toLocaleDateString("en", { weekday: "narrow" }) : "·",
      count: events.filter(
        (e) => new Date(e.at).toLocaleDateString() === d.toLocaleDateString(),
      ).length,
      today: i === 6,
    };
  });
  const record = async (e: LearningEvent) => {
    if (!db) throw Error("Storage is not ready.");
    await putEvents(db, [{ ...e, synced: false }]);
    setEvents(await allEvents(db));
    setSync(user ? "Saved here · syncing…" : "Guest · saved on this device");
    void synchronize();
  };
  function openPractice(item: Item, practiceMode: Mode = "trace") {
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
    const queue = makeQueue(events, s).slice(0, count);
    if (!queue.length) {
      notify(
        "You are all caught up for this skill. Try another skill or practice a lesson.",
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
      const group = items.filter((i) => i.lesson === selected.lesson);
      setSelected(
        group[
          (group.findIndex((i) => i.id === selected.id) + 1) % group.length
        ],
      );
    }
  }
  const filtered = items.filter((item) => matchesItem(item, search, lesson));
  function changeView(v: View) {
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
        <a className="brand" href="/" aria-label="Chinese OS home">
          <span className="brand-mark">
            <Leaf size={23} />
          </span>
          <span>
            chinese<span className="brand-os">os</span>
            <small>A LITTLE, EVERY DAY</small>
          </span>
        </a>
        <div className="workspace-label">YOUR STUDY SPACE</div>
        <nav>
          {(
            [
              { id: "today", title: "Today", icon: Home },
              { id: "lessons", title: "My lessons", icon: BookOpen },
              { id: "practice", title: "Writing studio", icon: PenLine },
              { id: "reviews", title: "Review", icon: RotateCcw },
              { id: "progress", title: "My progress", icon: TrendingUp },
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
          <h3>A little adds up.</h3>
          <p>
            One word. One stroke.
            <br />
            One step closer.
          </p>
          <div className="mini-lines">
            <i />
            <i />
            <i />
          </div>
        </div>
        <button className="settings-button" onClick={() => setSettings(true)}>
          <Settings2 size={18} /> Study preferences
        </button>
        <div className="profile">
          <div className="avatar">{user?.name[0]?.toUpperCase() ?? "Y"}</div>
          <div>
            <strong>{user?.name ?? "Your notebook"}</strong>
            <small>
              {user ? "Personal learning account" : "Try it as a guest"}
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
              aria-label="Sign in"
            >
              <ArrowUpRight size={18} />
            </a>
          )}
        </div>
      </aside>
      <main className="main">
        <header className="topbar">
          <span>
            <span className="breadcrumb">My study space</span>
            <ChevronRight size={13} />
            {view === "practice"
              ? "Writing studio"
              : view === "today"
                ? "Today"
                : view === "lessons"
                  ? "My lessons"
                  : view === "reviews"
                    ? "Review"
                    : "My progress"}
          </span>
          <div className="topbar-actions">
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
                Sign in
              </a>
            )}
            <button
              className="icon-button mobile-settings"
              aria-label="Study preferences"
              onClick={() => setSettings(true)}
            >
              <Settings2 size={16} />
            </button>
            <button className="sync-state" onClick={() => void synchronize()}>
              {sync.includes("pending") || sync.includes("Offline") ? (
                <CloudOff size={15} />
              ) : sync === "Syncing…" ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Cloud size={15} />
              )}
              <span>{sync}</span>
            </button>
          </div>
        </header>
        <div className="page-content">
          {view === "today" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">YOUR DAILY PRACTICE</p>
                  <h1>
                    A little Chinese,
                    <br className="mobile-br" /> every day
                    <span className="orange">.</span>
                  </h1>
                  <p>Build a habit. Find your rhythm. Make it yours.</p>
                </div>
                <div className="date-chip">
                  {isReady
                    ? new Date().toLocaleDateString("en", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Today"}
                  <span>LET’S KEEP GROWING</span>
                </div>
              </div>
              <div className="dashboard-grid">
                <section className="hero-card">
                  <div className="hero-copy">
                    <span className="pill">
                      <span className="status-dot" /> YOUR NEXT SMALL STEP
                    </span>
                    <h2>
                      From seeing it
                      <br />
                      to knowing it.
                    </h2>
                    <p>
                      Give your new words a little attention.
                      <br />
                      Your future self will thank you.
                    </p>
                    <button
                      className="primary"
                      onClick={() => startReview("meaning")}
                    >
                      Start today’s practice <ArrowRight size={17} />
                    </button>
                    <span className="hero-caption">
                      {minutes} minutes · at your own pace
                    </span>
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
                    <h3>Your week</h3>
                    <span className="soft-icon">
                      <TrendingUp size={17} />
                    </span>
                  </div>
                  <div className="week-total">
                    {week.filter((d) => d.count > 0).length}
                    <span> / 7 days</span>
                  </div>
                  <p>Every practice is progress.</p>
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
                      ? "You showed up today. Keep it going."
                      : "Your next chapter starts today."}
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
                      <small> / {items.length}</small>
                    </strong>
                    <span>Words explored</span>
                  </p>
                </div>
                <div>
                  <span className="stat-icon peach">
                    <RotateCcw size={21} />
                  </span>
                  <p>
                    <strong>{due}</strong>
                    <span>Reviews due</span>
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
                    <span>Writing attempts</span>
                  </p>
                </div>
                <div>
                  <span className="stat-icon blue">
                    <Check size={21} />
                  </span>
                  <p>
                    <strong>{accuracy === null ? "—" : accuracy + "%"}</strong>
                    <span>Independent recall</span>
                  </p>
                </div>
              </div>
              <div className="section-title">
                <div>
                  <h2>Pick up where you left off</h2>
                  <p>A few useful words. A world of possibilities.</p>
                </div>
                <button
                  className="text-button"
                  onClick={() => changeView("lessons")}
                >
                  All lessons <ArrowRight size={16} />
                </button>
              </div>
              <div className="lesson-grid">
                {lessons.slice(0, 3).map((l) => (
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
                        {items.find((i) => i.lesson === l.id)!.hanzi}
                        <small>
                          {items.find((i) => i.lesson === l.id)!.pinyin}
                        </small>
                      </span>
                      <b>{l.icon}</b>
                    </div>
                    <div className="lesson-content">
                      <span className="eyebrow">FOUNDATIONS · 8 WORDS</span>
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
                                8) *
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
                          of 8 explored
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
                  <strong>Let your hand do the remembering.</strong> Try the
                  writing studio with Apple Pencil, a finger, or your mouse.
                </p>
                <button onClick={() => openPractice(items[0])}>
                  Give it a try <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}
          {view === "lessons" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">WORDS FOR YOUR REAL LIFE</p>
                  <h1>
                    Your learning library<span className="orange">.</span>
                  </h1>
                  <p>
                    {curriculum.total} words &amp; phrases · {curriculum.hsk1}{" "}
                    HSK1 + {curriculum.extras} everyday extras.
                  </p>
                </div>
              </div>
              <div className="library-controls">
                <label className="search-field">
                  <Search size={18} />
                  <input
                    placeholder="Find a word, pinyin or meaning…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </label>
                <select
                  aria-label="Choose lesson"
                  value={lesson}
                  onChange={(e) => setLesson(e.target.value)}
                >
                  <option value="all">All words · {curriculum.total}</option>
                  <option value="hsk1">
                    HSK1 · all {curriculum.hsk1} words
                  </option>
                  <option value="bonus">
                    Everyday extras · {curriculum.extras}
                  </option>
                  {lessons.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.title}
                    </option>
                  ))}
                </select>
              </div>
              <p className="library-count" role="status">
                {filtered.length} {filtered.length === 1 ? "word" : "words"} ·{" "}
                {lesson === "hsk1"
                  ? "HSK 2025 syllabus"
                  : "choose a topic or search"}
              </p>
              <div className="word-grid">
                {filtered.map((i) => (
                  <article className="word-card panel" key={i.id}>
                    <span className="eyebrow">
                      {i.hskEntry ? "HSK1" : "EXTRA"} ·{" "}
                      {lessons.find((l) => l.id === i.lesson)?.title}
                    </span>
                    <div className="word-heading">
                      <div>
                        <span className="hanzi">{i.hanzi}</span>
                        <p className="pinyin">{i.pinyin}</p>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={"Listen to " + i.pinyin}
                        onClick={() => speak(i.hanzi, notify)}
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
                        aria-label={"Listen to example: " + i.pinyin}
                        onClick={() => speak(i.sentence, notify)}
                      >
                        <Volume2 size={14} /> Listen to example
                      </button>
                    </div>
                    <button
                      className="text-button"
                      onClick={() => openPractice(i)}
                    >
                      Practice writing <ArrowRight size={16} />
                    </button>
                  </article>
                ))}
              </div>
              {!filtered.length && (
                <div className="empty-state">
                  No words found. Try another spelling or lesson.
                </div>
              )}
            </>
          )}
          {view === "reviews" && (
            <>
              <div className="page-heading">
                <div>
                  <p className="eyebrow">MAKE IT STICK</p>
                  <h1>
                    A little recall goes far<span className="orange">.</span>
                  </h1>
                  <p>
                    Your memory grows differently for every skill. Give each one
                    its own time.
                  </p>
                </div>
              </div>
              <div className="session-length">
                <span>My session</span>
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
                    const fresh = items.filter(
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
                            ? "See the word. Recall what it means."
                            : s === "listening"
                              ? "Listen carefully. Connect sound to meaning."
                              : "An empty grid. A word from memory."}
                        </p>
                        <strong>
                          {count}
                          <small> due · {fresh} new</small>
                        </strong>
                        <button
                          className="primary"
                          onClick={() => startReview(s)}
                        >
                          Start {skillNames[s].toLowerCase()}{" "}
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
                  FSRS schedules each skill separately at a 90% retention
                  target. Tracing and copying are practice; they do not count as
                  independent recall.
                </p>
              </div>
            </>
          )}
          {view === "practice" &&
            (finished ? (
              <section className="completion panel">
                <span className="completion-icon">
                  <Check size={34} />
                </span>
                <p className="eyebrow">SESSION COMPLETE</p>
                <h1>
                  You showed up.
                  <br />
                  That’s how it starts.
                </h1>
                <p>
                  {session?.length} words reviewed. Your next reviews are
                  scheduled.
                </p>
                <button
                  className="primary"
                  onClick={() => changeView("progress")}
                >
                  See my progress <ArrowRight size={17} />
                </button>
              </section>
            ) : (
              <>
                <div className="page-heading studio-heading">
                  <div>
                    <p className="eyebrow">
                      {session
                        ? `YOUR REVIEW · ${sessionIndex + 1} OF ${session.length}`
                        : "THE WRITING STUDIO"}
                    </p>
                    <h1>
                      {session && skill !== "writing"
                        ? skillNames[skill] + " practice"
                        : "One stroke at a time"}
                      <span className="orange">.</span>
                    </h1>
                    <p>
                      {session
                        ? "Take a breath. Recall before you reveal."
                        : "Watch it. Trace it. Make it yours."}
                    </p>
                  </div>
                  {!session && (
                    <select
                      aria-label="Select word"
                      value={selected.id}
                      onChange={(e) =>
                        setSelected(items.find((i) => i.id === e.target.value)!)
                      }
                    >
                      {items.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.hanzi} · {i.pinyin} · {i.english}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {skill === "writing" ? (
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
                  <p className="eyebrow">YOUR EFFORT, MADE VISIBLE</p>
                  <h1>
                    Look how far you’ve come<span className="orange">.</span>
                  </h1>
                  <p>
                    Practice builds familiarity. Independent recall builds
                    lasting memory.
                  </p>
                </div>
                <button
                  className="secondary"
                  onClick={() => void exportBackup()}
                >
                  {backup ? "Export again" : "Export my history"}{" "}
                  <ArrowUpRight size={16} />
                </button>
              </div>
              <div className="progress-summary">
                <div className="panel">
                  <strong>{events.length}</strong>
                  <span>Total attempts</span>
                </div>
                <div className="panel">
                  <strong>{independent.length}</strong>
                  <span>Independent reviews</span>
                </div>
                <div className="panel">
                  <strong>{events.length - independent.length}</strong>
                  <span>Guided / assisted practice</span>
                </div>
              </div>
              <div className="panel progress-table">
                <div className="section-title">
                  <h2>Your words, by skill</h2>
                  <span>{practiced} words explored</span>
                </div>
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>Word</th>
                        {Object.values(skillNames).map((s) => (
                          <th key={s}>{s}</th>
                        ))}
                        <th>Practice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items
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
                                        ? "Due now"
                                        : new Date(c.due).toLocaleDateString(
                                            undefined,
                                            { month: "short", day: "numeric" },
                                          )}
                                      <small>{c.reps} reviews</small>
                                    </span>
                                  ) : (
                                    <span className="muted">Not reviewed</span>
                                  )}
                                </td>
                              );
                            })}
                            <td>
                              <button
                                className="icon-button"
                                aria-label={"Practice " + i.pinyin}
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
                      <h3>Your notebook is ready.</h3>
                      <p>Start with a word. Your progress will grow here.</p>
                      <button
                        className="primary"
                        onClick={() => openPractice(items[0])}
                      >
                        Try your first word <ArrowRight size={16} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="tip-strip">
                <Cloud size={21} />
                <p>
                  {user
                    ? "Your records are private to your account. Repeated offline uploads are deduplicated, and review order is rebuilt from your history."
                    : "Guest progress stays in this browser. Sign in to keep a separate notebook across your devices."}
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
                    Sign in <ArrowUpRight size={16} />
                  </a>
                )}
              </div>
            </>
          )}
          <footer>
            Small steps. Lasting connections.
            <span>CHINESE OS · MADE FOR YOUR EVERYDAY</span>
          </footer>
        </div>
      </main>
      {toast && (
        <div className="toast" role="status">
          {toast}
          <button onClick={() => setToast("")} aria-label="Dismiss">
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
            aria-label="Study preferences"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="section-top">
              <h2>Make yourself at home.</h2>
              <button
                className="icon-button"
                onClick={() => setSettings(false)}
                aria-label="Close settings"
              >
                <X size={20} />
              </button>
            </div>
            <label className="setting-row">
              <span>
                <strong>Slower pronunciation</strong>
                <small>Take your time. Keep the same natural pitch.</small>
              </span>
              <input
                type="checkbox"
                checked={slowAudio}
                onChange={(e) => setSlowAudio(e.target.checked)}
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>Pencil only</strong>
                <small>Ignore finger drawing inside the writing grid.</small>
              </span>
              <input
                type="checkbox"
                checked={penOnly}
                onChange={(e) => setPenOnly(e.target.checked)}
              />
            </label>
            <label className="setting-row">
              <span>
                <strong>Left-handed layout</strong>
                <small>Move writing controls to the left.</small>
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
                Manage learning account <ArrowUpRight size={16} />
              </button>
            )}
            <p className="muted">
              Guest and signed-in notebooks are separate. Pronunciation uses
              bundled Mandarin recordings.
            </p>
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
                Sign in to sync progress <ArrowUpRight size={16} />
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
                Sign out
              </a>
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
  return (
    <div className="ratings">
      {(
        [
          { r: 1, title: "Again", help: "Could not recall" },
          { r: 2, title: "Hard", help: "Correct, with effort" },
          { r: 3, title: "Good", help: "Recalled correctly" },
          { r: 4, title: "Easy", help: "Quick & confident" },
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
      notify("Could not save this review. Please try again.");
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="recall-card panel">
      <span className="pill">{skillNames[skill]} · INDEPENDENT RECALL</span>
      {skill === "meaning" ? (
        <>
          <div className="recall-hanzi">{item.hanzi}</div>
          <p className="pinyin">{item.pinyin}</p>
          <p>What does this word mean?</p>
        </>
      ) : (
        <>
          <button
            className="listen-big"
            aria-label="Play Chinese word"
            onClick={() => speak(item.hanzi, notify)}
          >
            <Volume2 size={42} />
          </button>
          <h2>What did you hear?</h2>
          <p>Play it again if you need to. Recall the meaning.</p>
        </>
      )}
      {!revealed ? (
        <button className="primary" onClick={() => setRevealed(true)}>
          Reveal answer <ArrowRight size={16} />
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
              onClick={() => speak(item.sentence, notify)}
            >
              <Volume2 size={14} /> Listen to example
            </button>
          </div>
          {done ? (
            <button className="primary" onClick={next}>
              Saved · next word <ArrowRight size={17} />
            </button>
          ) : (
            <>
              <p className="rating-instruction">
                Rate what you remembered before revealing.
              </p>
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
          "Could not restore the last drawing. You can still start a new attempt.",
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
      }).catch(() => notify("Could not save this drawing on your device."));
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
          ? "Review saved. Your next writing review is scheduled."
          : "Practice saved. Independent recall has its own schedule.",
      );
    } catch {
      notify("Could not save. Keep this page open and try again.");
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
                {m[0].toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
          <label className="pencil-toggle">
            <input
              type="checkbox"
              checked={penOnly}
              onChange={(e) => setPenOnly(e.target.checked)}
            />
            Pencil only
          </label>
        </div>
        <div className="writing-prompt">
          <span className="eyebrow">
            {mode === "recall"
              ? "WRITE FROM MEMORY"
              : "LET YOUR HAND LEARN THE SHAPE"}
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
              aria-label={"Character " + (i + 1)}
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
              <span className="canvas-notice">Loading your saved drawing…</span>
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
            ? "✓ Character complete. Choose the next cell."
            : mode === "watch"
              ? "Follow the stroke order. Replay whenever you like."
              : mode === "trace"
                ? "Follow the outline, one stroke at a time."
                : mode === "copy"
                  ? "Look at the reference. Write in the empty grid."
                  : "Write the whole word, then compare your answer."}
        </p>
        <div className="writing-tools">
          <button
            disabled={!free || saved || !strokes[index]?.length}
            onClick={() => changeStrokes(strokes[index].slice(0, -1))}
          >
            <Undo2 size={17} />
            Undo
          </button>
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
            Clear
          </button>
          <button
            disabled={saved || revealed}
            onClick={() => {
              setAssisted(true);
              setHints((n) => n + 1);
              setRevealed(true);
            }}
          >
            <Lightbulb size={17} />
            Hint
          </button>
          <button
            disabled={saved}
            onClick={() => {
              if (free) {
                setAssisted(true);
                setHints((n) => n + 1);
                setRevealed(true);
                speak(item.hanzi, notify);
              } else setReplay((r) => r + 1);
            }}
          >
            <Play size={17} />
            Replay
          </button>
        </div>
        <div className="writing-bottom">
          <span>
            Character {index + 1} of {characters.length}
          </span>
          {index < characters.length - 1 ? (
            <button
              className="secondary"
              onClick={() => setIndex((i) => i + 1)}
            >
              Next character <ChevronRight size={16} />
            </button>
          ) : !revealed && mode === "recall" ? (
            <button
              className="primary"
              disabled={!allWritten}
              onClick={() => setRevealed(true)}
            >
              Compare answer <ArrowRight size={16} />
            </button>
          ) : null}
        </div>
      </section>
      <aside className="reference-panel">
        <section className="panel reference-card">
          <span className="eyebrow">
            {mode === "recall" && !revealed ? "YOUR PROMPT" : "WORD IN FOCUS"}
          </span>
          {mode === "recall" && !revealed ? (
            <div className="hidden-answer">
              <PenLine size={33} />
              <h3>Trust your memory.</h3>
              <p>
                The answer stays hidden until you finish. A hint counts as
                assisted practice.
              </p>
            </div>
          ) : (
            <>
              <div className="reference-hanzi">{item.hanzi}</div>
              <p className="pinyin">{item.pinyin}</p>
              <h3>{item.english}</h3>
              <button
                className="audio-button"
                onClick={() => speak(item.hanzi, notify)}
              >
                <Volume2 size={17} /> Hear pronunciation
              </button>
              <div className="reference-example">
                <span className="eyebrow">IN EVERYDAY LIFE</span>
                <p>{item.sentence}</p>
                <p className="pinyin">{item.sentencePinyin}</p>
                <small>{item.translation}</small>
                <button
                  className="text-button"
                  onClick={() => speak(item.sentence, notify)}
                >
                  <Volume2 size={14} /> Listen to example
                </button>
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
              ? "A small step, saved."
              : mode === "recall"
                ? "Recall first. Refine second."
                : "Familiarity comes with practice."}
          </h3>
          <p>
            {mode === "recall"
              ? "Compare your completed word and rate your memory. This exercise uses self-assessment; free writing is not automatically graded."
              : "Watching, tracing and copying help your hand learn. Try recall next to check your memory."}
          </p>
          {mode === "recall" && revealed && !saved && (
            <>
              <p className="rating-instruction">
                {assisted
                  ? "You used help. This saves practice only."
                  : "How well did you remember before comparing?"}
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
              Save practice <Check size={16} />
            </button>
          )}
          {saved && (
            <button className="primary" onClick={next}>
              Next word <ArrowRight size={17} />
            </button>
          )}
        </section>
      </aside>
    </div>
  );
}
