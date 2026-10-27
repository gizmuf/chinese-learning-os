"use client";
import {useDictionaryAssistance} from "./study-lookup";
import {withTurkish} from "./turkish";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Download,
  GraduationCap,
  Image as ImageIcon,
  Play,
  RotateCcw,
  Volume2,
} from "lucide-react";
import { useI18n } from "./i18n";
import {
  course,
  terms,
  sentences,
  timelines,
  topicInfo,
  termItem,
  termBase,
  sentenceItem,
  type Topic,
  type Sentence,
} from "./course-data";
import {
  exercises,
  isCorrect,
  shuffledOptions,
  type Exercise,
  type Option,
} from "./course-exercises";
import {
  courseSummary,
  newCourseEvent,
  type CourseEvent,
} from "./course-learning";
import { useCourseProgress } from "./course-store";
import { speak, stopAudio } from "./audio";
import CourseLab from "./course-lab";
import Lesson04 from "./lesson04";
import Lesson05 from "./lesson05";
import VideoStudy from "./video-study";
import {videoStudy} from "./video-study-data";
import {videoCopy} from "./video-study-copy";
import {lesson05} from "./lesson05-data";
import {lesson04} from "./lesson04-data";
import {labExtraTerms} from "./course-lab-data";
import Notebook from "./notebook";
import CourseStory from "./course-story";
import CourseBreakfastStory from "./course-breakfast-story";
import Ink from "./ink";
import { readDraft, saveDraft } from "./local-store";
import type { Item } from "./content";
import type { LearningEvent, Stroke } from "./learning";
type Tab = "lab" | "overview" | "learn" | "practice" | "writing" | "materials";
const topics = Object.keys(topicInfo) as Topic[];
export default function IntensiveCourse({
  owner,
  db,
  penOnly,
  setPenOnly,
  recordHSK,
  notify,
  onHSKRecall,
}: {
  owner: string | null;
  db: IDBDatabase | null;
  penOnly: boolean;
  setPenOnly: (v: boolean) => void;
  recordHSK: (e: LearningEvent) => Promise<void>;
  notify: (m: string) => void;
  onHSKRecall: (item: Item) => void;
}) {
  const { t, locale } = useI18n();
  const progress = useCourseProgress(owner);
  const [labWriting,setLabWriting]=useState(false);
  const [open, setOpen] = useState(false);
  const [videoOpen,setVideoOpen]=useState(false);
  const [lessonNumber,setLessonNumber]=useState(3);
  const [tab, setTab] = useState<Tab>("overview");
  const [topic, setTopic] = useState<Topic>("time");
  const [queue, setQueue] = useState(exercises.map((e) => e.id));
  const [run, setRun] = useState(0);
  const [writingId, setWritingId] = useState(terms[0].id);
  const [writingMode, setWritingMode] = useState<"notebook" | "recall">(
    "notebook",
  );
  const summary = useMemo(
    () => courseSummary(progress.events),
    [progress.events],
  );
  useEffect(() => {
    if(new URLSearchParams(window.location.search).get("material")==="self-introduction")setVideoOpen(true);
    if (new URLSearchParams(window.location.search).get("lesson") === "5") {setLessonNumber(5);setOpen(true);}
    if (new URLSearchParams(window.location.search).get("lesson") === "4") {setLessonNumber(4);setOpen(true);}
    if (new URLSearchParams(window.location.search).get("lesson") === "3")
      setOpen(true);
    if (new URLSearchParams(window.location.search).get("lab") === "1") setTab("lab");
    return () => stopAudio();
  }, []);
  function openLesson() {
    setOpen(true);
    window.history.replaceState(
      null,
      "",
      window.location.pathname + "?course=intensive&lesson=3",
    );
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function startPractice(ids = exercises.map((e) => e.id)) {
    stopAudio();
    setQueue(ids);
    setRun((r) => r + 1);
    setTab("practice");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function markRead() {
    try {
      await progress.record(
        newCourseEvent("study:" + topic, "study", null, true),
      );
      notify(t("Study step saved."));
    } catch {
      notify(
        t("Could not save practice. Keep this worksheet open and try again."),
      );
    }
  }
  function write(id: string) {
    setLabWriting(false);
    stopAudio();
    setWritingId(id);
    setWritingMode("notebook");
    setTab("writing");
  }
  const chosenTerm = [...terms,...labExtraTerms].find((term) => term.id === writingId);
  const chosenSentence = sentences.find((s) => s.id === writingId);
  const writingItem = chosenTerm
    ? termItem(chosenTerm, locale)
    : sentenceItem(chosenSentence!, locale);
  async function saveWriting(e: LearningEvent) {
    // Existing HSK items keep their existing IDs and writing history.
    if (chosenTerm && termBase(chosenTerm)) await recordHSK(e);
    await progress.record({
      ...newCourseEvent(
        "write:" + writingId,
        "writing",
        e.rating >= 3,
        e.assisted,
        e.rating,
      ),
      id: e.id,
    });
  }
  const date = new Date(course.date + "T12:00:00").toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const title = course.lessonTitle[locale];
  function exportProgress() {
    const blob = new Blob(
      [
        JSON.stringify(
          { version: 1, course: course.id, events: progress.events },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Chinese-OS-intensive-course-progress.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if(videoOpen)return <VideoStudy {...{owner,penOnly,setPenOnly,notify}} onBack={()=>{setVideoOpen(false);window.history.replaceState(null,"","/?course=intensive");}}/>;
  if(open&&lessonNumber===5) return <Lesson05 {...{owner,db,penOnly,setPenOnly,notify}} onBack={()=>{setOpen(false);setLessonNumber(3);window.history.replaceState(null,"",window.location.pathname+"?course=intensive");}}/>;
  function openLesson05(){stopAudio();setLessonNumber(5);setOpen(true);window.history.replaceState(null,"",window.location.pathname+"?course=intensive&lesson=5");window.scrollTo({top:0,behavior:"instant"});}
  if(open&&lessonNumber===4) return <Lesson04 {...{owner,db,penOnly,setPenOnly,notify}} onBack={()=>{setOpen(false);setLessonNumber(3);window.history.replaceState(null,"",window.location.pathname+"?course=intensive");}}/>;
  function openLesson04(){stopAudio();setLessonNumber(4);setOpen(true);window.history.replaceState(null,"",window.location.pathname+"?course=intensive&lesson=4");window.scrollTo({top:0,behavior:"instant"});}
  return (
    <div className="course-space">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("YOUR CLASSROOM, REMEMBERED")}</p>
          <h1>
            {course.title[locale]}
            <span className="orange">.</span>
          </h1>
          <p>{t("60 lessons, connected to your real classes.")}</p>
        </div>
        <button
          className="course-sync"
          onClick={() => void progress.sync()}
          aria-label={t("Sync course progress")}
        >
          <span role="status">{t(progress.status)}</span>
        </button>
      </div>
      {!open ? (
        <>
          <section className="panel course-feature"><div aria-hidden="true" className="lesson05-topic-art">你 · 自己</div><div><span className="pill">{videoCopy[locale].independent}</span><h2>{videoStudy.title[locale]}</h2><p>{videoCopy[locale].intro}</p><button className="primary" onClick={()=>{stopAudio();setVideoOpen(true);window.history.replaceState(null,'','/?course=intensive&material=self-introduction');window.scrollTo({top:0,behavior:'instant'});}}>{videoCopy[locale].read}<ArrowRight size={17}/></button></div></section>
          <section className="panel course-feature"><div aria-hidden="true" className="lesson05-topic-art">又 · 起来 · 好</div><div><span className="pill">{t("Lesson")} 05 / 60</span><h2>{lesson05.title[locale]}</h2><p>26.10.2026</p><button className="primary" onClick={openLesson05}>{t("Lesson")} 05<ArrowRight size={17}/></button></div></section>
          <section className="panel course-feature"><img src="/course04/boards/9974.jpg" alt={lesson04.title[locale]}/><div><span className="pill">{t("Lesson")} 04 / 60</span><h2>{lesson04.title[locale]}</h2><p>23.10.2026</p><button className="primary" onClick={openLesson04}>{t("Lesson")} 04<ArrowRight size={17}/></button></div></section>
          <section className="panel course-feature">
            <img
              src="/course03/boards/9912.jpg"
              alt={t("Classroom board: the time expressions from lesson 03")}
            />
            <div>
              <span className="pill">{t("Lesson")} 03 / 60</span>
              <h2>{title}</h2>
              <p>{date}</p>
              <p>{course.recap[locale]}</p>
              <button className="primary" onClick={openLesson}>
                {t("Open lesson 03")}
                <ArrowRight size={17} />
              </button>
            </div>
          </section>

          <details className="course-calendar panel">
            <summary>
              {t("All 60 lessons")} · {(withTurkish({en:"Three lessons ready",fr:"Trois leçons disponibles",ru:"Три урока доступны"}))[locale]}
            </summary>
            <div className="course-lesson-grid">
              {Array.from({ length: 60 }, (_, i) => (
                <button
                  key={i}
                  disabled={i !== 2 && i !== 3 && i !== 4}
                  className={i === 2 || i === 3 || i === 4 ? "available" : ""}
                  onClick={i===4?openLesson05:i===3?openLesson04:openLesson}
                >
                  <strong>{String(i + 1).padStart(2, "0")}</strong>
                  <small>
                    {i === 2 || i === 3 || i === 4
                      ? t("Ready to practice")
                      : t("Awaiting class material")}
                  </small>
                </button>
              ))}
            </div>
          </details>
        </>
      ) : (
        <>
          <button
            className="text-button"
            onClick={() => {
              setOpen(false);
              stopAudio();
              window.history.replaceState(
                null,
                "",
                window.location.pathname + "?course=intensive",
              );
            }}
          >
            <ArrowLeft size={15} />
            {t("All course lessons")}
          </button>
          <section className="course-lesson-heading">
            <div>
              <span className="eyebrow">
                {t("Lesson")} 03 · {date}
              </span>
              <h2>{title}</h2>
              <p>{course.recap[locale]}</p>
            </div>
            <span className="pill">
              {summary.attempted}/{summary.total} {t("activities tried")}
            </span>
          </section>
          <div
            className="course-tabs"
            role="group"
            aria-label={t("Course sections")}
          >
            {(
              ["overview", "learn", "lab", "practice", "writing", "materials"] as Tab[]
            ).map((value, i) => (
              <button
                key={value}
                aria-pressed={tab === value}
                className={tab === value ? "selected" : ""}
                onClick={() => {
                  stopAudio();
                  setLabWriting(false);
                  setTab(value);
                }}
              >
                {t(
                  [
                    "Overview",
                    "Learn the patterns",
                    "Practice lab",
                    "Practice",
                    "Writing",
                    "Class materials",
                  ][i],
                )}
              </button>
            ))}
          </div>
          {(tab==="lab"||labWriting)&&<div hidden={tab!=="lab"}><CourseLab events={progress.events} ready={progress.ready} record={progress.record} onWrite={id=>{write(id);setLabWriting(true);}} notify={notify} penOnly={penOnly}/></div>}
          {tab==="writing"&&labWriting&&<button className="secondary lesson-lab-back" onClick={()=>{stopAudio();setTab("lab");setLabWriting(false);}}><ArrowLeft size={16}/>{t("Back to practice lab")}</button>}
          {tab === "overview" && (
            <>
              <div className="course-summary">
                <div className="panel">
                  <strong>
                    {summary.attempted}/{summary.total}
                  </strong>
                  <span>{t("activities tried")}</span>
                </div>
                <div className="panel">
                  <strong>
                    {summary.correct}/{summary.independent}
                  </strong>
                  <span>{t("correct without answer hints")}</span>
                </div>
                <div className="panel">
                  <strong>{summary.due.length}</strong>
                  <span>{t("course reviews due")}</span>
                </div>
              </div>
              <section className="panel course-welcome">
                <h3>{t("Start with what you remember from class.")}</h3>
                <p>
                  {t(
                    "A board, a sentence, a situation. Explore the six topics, then practise without answer hints. HSK progress stays separate.",
                  )}
                </p>
                <div className="course-actions">
                  <button className="primary" onClick={() => setTab("learn")}>
                    {t("Explore the lesson")}
                    <ArrowRight size={16} />
                  </button>
                  <button className="secondary" onClick={()=>setTab("lab")}>{t("Blocks, families & no-pinyin checks")}<ArrowRight size={16}/></button>
                  <button
                    className="secondary"
                    disabled={!progress.ready}
                    onClick={() => startPractice()}
                  >
                    {t("Practise all 24 activities")}
                  </button>
                  <button
                    className="secondary"
                    disabled={!progress.ready}
                    onClick={() =>
                      startPractice(
                        topics.map(
                          (topic) =>
                            exercises.find(
                              (e) => e.topic === topic && e.kind !== "order",
                            )?.id ??
                            exercises.find((e) => e.topic === topic)!.id,
                        ),
                      )
                    }
                  >
                    {t("Quick check · 6 activities")}
                  </button>
                  {summary.due.some((id) =>
                    exercises.some((e) => e.id === id),
                  ) && (
                    <button
                      className="secondary"
                      onClick={() =>
                        startPractice(
                          summary.due.filter((id) =>
                            exercises.some((e) => e.id === id),
                          ),
                        )
                      }
                    >
                      {t("Review due activities")}
                    </button>
                  )}
                  {summary.due.some((id) => id.startsWith("write:")) && (
                    <button
                      className="secondary"
                      onClick={() =>
                        write(
                          summary.due
                            .find((id) => id.startsWith("write:"))!
                            .slice(6),
                        )
                      }
                    >
                      {t("Review course writing")}
                    </button>
                  )}
                </div>
                {summary.practiced && (
                  <p className="course-success">
                    <Check size={16} />
                    {t(
                      "You have practised every activity. Revisit the difficult ones over time.",
                    )}
                  </p>
                )}
              </section>
              <div className="course-topic-grid">
                {topics.map((value) => (
                  <button
                    className="panel course-topic-card"
                    key={value}
                    onClick={() => {
                      setTopic(value);
                      setTab("learn");
                    }}
                  >
                    <img
                      loading="lazy"
                      src={`/course03/boards/${topicInfo[value].photo}.jpg`}
                      alt={topicInfo[value].title[locale]}
                    />
                    <span>
                      <strong>{topicInfo[value].title[locale]}</strong>
                      <small>
                        {exercises.filter((e) => e.topic === value).length}{" "}
                        {t("activities")}
                      </small>
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))}
              </div>
            </>
          )}
          {tab === "learn" && (
            <>
              <div className="course-topic-pills">
                {topics.map((value) => (
                  <button
                    key={value}
                    className={topic === value ? "selected" : ""}
                    aria-pressed={topic === value}
                    onClick={() => {
                      stopAudio();
                      setTopic(value);
                    }}
                  >
                    {topicInfo[value].title[locale]}
                  </button>
                ))}
              </div>
              <section className="panel course-study">
                <div className="section-top">
                  <h3>{topicInfo[topic].title[locale]}</h3>
                  <button
                    className="secondary"
                    disabled={!progress.ready}
                    onClick={() =>
                      startPractice(
                        exercises
                          .filter((e) => e.topic === topic)
                          .map((e) => e.id),
                      )
                    }
                  >
                    {t("Practise this topic")}
                    <ArrowRight size={16} />
                  </button>
                </div>
                <p className="course-rule">{topicInfo[topic].note[locale]}</p>
                {topic === "experience" && <CourseStory notify={notify} />}
                {topic === "negation" && (
                  <CourseBreakfastStory notify={notify} />
                )}
                {(topic === "time" || topic === "rhythm") &&
                  Object.entries(timelines)
                    .filter(([key]) =>
                      topic === "time"
                        ? !["dayparts", "meals"].includes(key)
                        : ["dayparts", "meals"].includes(key),
                    )
                    .map(([key, ids]) => (
                      <div className="course-timeline" key={key}>
                        <h4>
                          {t(
                            (
                              {
                                days: "Days",
                                years: "Years",
                                months: "Months",
                                weeks: "Weeks",
                                dayparts: "Times of day",
                                meals: "Meals",
                              } as Record<string, string>
                            )[key],
                          )}
                        </h4>
                        <div className="course-time-direction">
                          {t("Earlier")}
                          <span>→</span>
                          {t("Later")}
                        </div>
                        <div className="course-time-cards">
                          {ids.map((id, i) => {
                            const value = terms.find((term) => term.id === id)!;
                            return (
                              <button
                                key={id}
                                className={
                                  ids.length === 5 && i === 2 ? "now" : ""
                                }
                                onClick={() =>
                                  speak(
                                    value.hanzi,
                                    notify,
                                    termItem(value, locale),
                                  )
                                }
                              >
                                <small>
                                  {topic === "time"
                                    ? ["−2", "−1", t("Now"), "+1", "+2"][i]
                                    : i + 1}
                                </small>
                                <strong lang="zh-Hans">{value.hanzi}</strong>
                                <span className="pinyin">{value.pinyin}</span>
                                <span>{value.meaning[locale]}</span>
                                <Volume2 size={13} />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                <div className="course-examples">
                  {topicInfo[topic].examples.map((id) => (
                    <SentenceCard
                      key={id}
                      value={sentences.find((s) => s.id === id)!}
                      notify={notify}
                      onWrite={() => write(id)}
                    />
                  ))}
                </div>
                <details className="course-board">
                  <summary>
                    <ImageIcon size={16} />
                    {t("Remember this board?")}
                  </summary>
                  <img
                    loading="lazy"
                    src={`/course03/boards/${topicInfo[topic].photo}.jpg`}
                    alt={topicInfo[topic].title[locale]}
                  />
                  <p>
                    {t(
                      "Original classroom board, 22 October 2026. Explanations above clarify the class examples.",
                    )}
                  </p>
                </details>
                <button
                  className="secondary"
                  disabled={!progress.ready}
                  onClick={() => void markRead()}
                >
                  <Check size={16} />
                  {progress.events.some(
                    (e) => e.activityId === "study:" + topic,
                  )
                    ? t("Study step saved.")
                    : t("Mark this study step as read")}
                </button>
              </section>
              <h3>{t("Words and complete expressions")}</h3>
              <div className="course-vocabulary">
                {terms
                  .filter((value) => value.topic === topic)
                  .map((value) => (
                    <article className="panel" key={value.id}>
                      <span className="eyebrow">
                        {termBase(value)
                          ? t("Linked to your HSK vocabulary")
                          : t("Course expression")}
                      </span>
                      <strong lang="zh-Hans">{value.hanzi}</strong>
                      <p className="pinyin">{value.pinyin}</p>
                      <p>{value.meaning[locale]}</p>
                      <div className="course-actions">
                        <button
                          className="audio-button"
                          aria-label={t("Listen to") + " " + value.pinyin}
                          onClick={() =>
                            speak(value.hanzi, notify, termItem(value, locale))
                          }
                        >
                          <Volume2 size={16} />
                        </button>
                        <button
                          className="text-button"
                          onClick={() => write(value.id)}
                        >
                          {t("Practice writing")}
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    </article>
                  ))}
              </div>
            </>
          )}
          {tab === "practice" && (
            <CoursePractice
              key={run + ":" + queue.join(",")}
              ids={queue}
              record={progress.record}
              ready={progress.ready}
              notify={notify}
              onWrite={write}
              onFinish={() => setTab("overview")}
            />
          )}
          {tab === "writing" && (
            <>
              <div className="course-writing-select">
                <label>
                  {t("Select a course word or sentence")}
                  <select
                    value={writingId}
                    onChange={(e) => {
                      setWritingId(e.target.value);
                      setWritingMode("notebook");
                    }}
                  >
                    <optgroup label={t("Words and complete expressions")}>
                      {[...terms,...labExtraTerms].map((value) => (
                        <option key={value.id} value={value.id}>
                          {value.hanzi} · {value.pinyin} ·{" "}
                          {value.meaning[locale]}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label={t("Sentences")}>
                      {sentences.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.hanzi} · {s.pinyin}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </label>
                <p>
                  {t(
                    "Copy with guidance, or write from memory and assess your own answer. This is handwriting practice, not automatic handwriting recognition.",
                  )}
                </p>
              </div>
              {writingMode === "notebook" ? (
                <Notebook
                  key={writingId}
                  item={writingItem}
                  db={db}
                  penOnly={penOnly}
                  setPenOnly={setPenOnly}
                  record={saveWriting}
                  notify={notify}
                  onRecall={() => {
                    if (chosenTerm && termBase(chosenTerm))
                      onHSKRecall(termBase(chosenTerm)!);
                    else setWritingMode("recall");
                  }}
                  next={() =>
                    write(
                      terms[
                        (terms.findIndex((value) => value.id === writingId) +
                          1) %
                          terms.length
                      ].id,
                    )
                  }
                />
              ) : (
                <CourseRecall
                  key={writingId}
                  db={db}
                  item={writingItem}
                  penOnly={penOnly}
                  record={saveWriting}
                  notify={notify}
                  onBack={() => setWritingMode("notebook")}
                />
              )}
            </>
          )}
          {tab === "materials" && (
            <section className="panel course-materials">
              <h3>{t("Class materials")}</h3>
              <p>
                {t(
                  "The original lesson documents, in your selected language. Interactive explanations above are reviewed and supplemented from the board photos.",
                )}
              </p>
              <div className="course-actions">
                {["workbook", "guide", "reference"].map((kind, i) => (
                  <a
                    key={kind}
                    className="secondary"
                    href={`/course03/materials/${kind}-${locale}.pdf`}
                    download
                  >
                    <Download size={17} />
                    {t(
                      [
                        "Integrated workbook · 30 pages",
                        "Study guide · 9 pages",
                        "Time reference · 1 page",
                      ][i],
                    )}
                  </a>
                ))}
              </div>
              <h3>{t("Your course history")}</h3>
              <p>
                {t(
                  "Course results sync with your signed-in account. Guest results and handwriting drafts stay on this device. Exporting materials does not record study.",
                )}
              </p>
              <button className="secondary" onClick={exportProgress}>
                <Download size={16} />
                {t("Export course history")}
              </button>
              <div className="course-board-gallery">
                {topics.map((value) => (
                  <details key={value}>
                    <summary>{topicInfo[value].title[locale]}</summary>
                    <img
                      loading="lazy"
                      src={`/course03/boards/${topicInfo[value].photo}.jpg`}
                      alt={topicInfo[value].title[locale]}
                    />
                  </details>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
function SentenceCard({
  value,
  notify,
  onWrite,
}: {
  value: Sentence;
  notify: (s: string) => void;
  onWrite: () => void;
}) {
  const { t, locale } = useI18n();
  return (
    <article className="course-sentence">
      <span className="eyebrow">
        {value.role === "practice"
          ? t("Practice example")
          : t("From the lesson")}
      </span>
      <strong lang="zh-Hans">{value.hanzi}</strong>
      <p className="pinyin">{value.pinyin}</p>
      <p>{value.meaning[locale]}</p>
      <div className="course-actions">
        <button
          className="audio-button"
          onClick={() =>
            speak(value.hanzi, notify, sentenceItem(value, locale))
          }
        >
          <Volume2 size={16} />
          {t("Listen to example")}
        </button>
        <button className="text-button" onClick={onWrite}>
          {t("Practice writing")}
          <ChevronRight size={15} />
        </button>
      </div>
    </article>
  );
}
function OptionText({
  option,
  translationOnly = false,
}: {
  option: Option;
  translationOnly?: boolean;
}) {
  const { locale } = useI18n();
  return translationOnly ? (
    <span>{option.label[locale]}</span>
  ) : (
    <>
      <strong lang="zh-Hans">{option.hanzi}</strong>
      <span className="pinyin">{option.pinyin}</span>
    </>
  );
}
function CoursePractice({
  ids,
  record,
  ready,
  notify,
  onFinish,
  onWrite,
}: {
  onWrite: (id: string) => void;
  ids: string[];
  record: (e: CourseEvent) => Promise<void>;
  ready: boolean;
  notify: (m: string) => void;
  onFinish: () => void;
}) {
  const { t, locale } = useI18n();
  const [sessionIds, setSessionIds] = useState(ids);
  const [reviewing, setReviewing] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [assisted, setAssisted] = useState(false);
  const dictionaryHelp=useDictionaryAssistance(()=>setAssisted(true));
  const [saving, setSaving] = useState(false);
  const [played, setPlayed] = useState(false);
  const [retry, setRetry] = useState(0);
  const [missed, setMissed] = useState<string[]>([]);
  const [finished, setFinished] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const exercise = exercises.find((e) => e.id === sessionIds[index])!;
  const choices = useMemo(
    () =>
      shuffledOptions(
        exercise.options,
        (index + 1) * 12345 + retry * 2654435761,
      ),
    [exercise, index, retry],
  );
  function reset() {
    setPicked([]);
    setChecked(null);
    setPlayed(false);
    setAssisted(reviewing);
    setRevealed(false);
    setRetry(0);
  }
  function next() {
    stopAudio();
    if (index === sessionIds.length - 1) {
      setFinished(true);
      return;
    }
    setIndex((i) => i + 1);
    reset();
  }
  async function check() {
    if (saving || checked !== null) return;
    const result = isCorrect(exercise, picked);
    setSaving(true);
    try {
      await record(newCourseEvent(exercise.id, "answer", result, assisted));
      setChecked(result);
      if (result && !assisted) setCorrect((v) => v + 1);
      if (!result)
        setMissed((old) =>
          old.includes(exercise.id) ? old : [...old, exercise.id],
        );
    } catch {
      notify(t("Could not save this review. Please try again."));
    } finally {
      setSaving(false);
    }
  }
  if (finished)
    return (
      <section className="panel course-complete">
        <Check size={30} />
        <h3>{t("Practice session complete.")}</h3>
        <p>
          {correct}/{sessionIds.length} {t("correct without answer hints")}
        </p>
        <p>
          {t(
            "Your answers are saved. Corrected or revealed answers remain assisted practice.",
          )}
        </p>
        <div className="course-actions">
          {missed.length > 0 && (
            <button
              className="secondary"
              onClick={() => {
                setFinished(false);
                setSessionIds(missed);
                setMissed([]);
                setIndex(0);
                setCorrect(0);
                setReviewing(true);
                reset();
                setAssisted(true);
              }}
            >
              {t("Revisit a difficult activity")}
            </button>
          )}
          <button className="primary" onClick={onFinish}>
            {t("Back to lesson")}
            <ArrowRight size={16} />
          </button>
        </div>
      </section>
    );
  return (
    <section ref={dictionaryHelp} data-study-assessment={checked!==null?"complete":"supported"} className="panel course-exercise">
      <div className="section-top">
        <span className="eyebrow">
          {topicInfo[exercise.topic].title[locale]}
        </span>
        <span>
          {index + 1}/{sessionIds.length}
        </span>
      </div>
      <h3>{exercise.prompt[locale]}</h3>
      {exercise.kind === "listen" && (
        <button
          className="primary course-listen"
          onClick={() => {
            setPlayed(true);
            const s = sentences.find((s) => s.id === exercise.audio)!;
            speak(s.hanzi, notify, sentenceItem(s, locale));
          }}
        >
          <Volume2 size={25} />
          {t("Play Chinese sentence")}
        </button>
      )}
      {exercise.frame && (
        <div className="course-question-frame">
          <strong lang="zh-Hans">{exercise.frame}</strong>
          <p className="pinyin">{exercise.framePinyin}</p>
        </div>
      )}
      {exercise.kind === "order" && (
        <>
          <p>
            {t("Tap the cards in order. Tap a selected card to remove it.")}
          </p>
          <div
            className="course-answer-slots"
            aria-label={t("Your ordered answer")}
          >
            {picked.length ? (
              picked.map((id) => (
                <button
                  key={id}
                  disabled={checked !== null || saving}
                  onClick={() =>
                    setPicked((old) => old.filter((v) => v !== id))
                  }
                >
                  <OptionText
                    option={exercise.options.find((o) => o.id === id)!}
                  />
                </button>
              ))
            ) : (
              <span>{t("Your ordered answer will appear here.")}</span>
            )}
          </div>
        </>
      )}
      <div
        className={
          "course-options " + (exercise.kind === "order" ? "is-order" : "")
        }
      >
        {choices.map((option) => (
          <button
            key={option.id}
            disabled={
              saving ||
              checked !== null ||
              (exercise.kind === "order" && picked.includes(option.id))
            }
            aria-pressed={picked.includes(option.id)}
            className={picked.includes(option.id) ? "selected" : ""}
            onClick={() =>
              setPicked((old) =>
                exercise.kind === "order" ? [...old, option.id] : [option.id],
              )
            }
          >
            <OptionText
              option={option}
              translationOnly={exercise.kind === "listen"}
            />
          </button>
        ))}
      </div>
      <div className="course-actions">
        {checked === null ? (
          <>
            <button
              className="primary"
              disabled={
                !ready ||
                saving ||
                (exercise.kind === "order"
                  ? picked.length !== exercise.options.length
                  : picked.length !== 1) ||
                (exercise.kind === "listen" && !played)
              }
              onClick={() => void check()}
            >
              {saving ? t("Saving…") : t("Check answer")}
              <Check size={16} />
            </button>
            <button
              className="text-button"
              disabled={saving}
              onClick={() => {
                setAssisted(true);
                setRevealed(true);
              }}
            >
              {t("Show answer hint")}
            </button>
          </>
        ) : (
          <>
            <button className="primary" onClick={next}>
              {index === sessionIds.length - 1
                ? t("Finish practice")
                : t("Next activity")}
              <ArrowRight size={16} />
            </button>
            {checked === false && (
              <button
                className="secondary"
                onClick={() => {
                  setChecked(null);
                  setPicked([]);
                  setAssisted(true);
                  setRetry((v) => v + 1);
                }}
              >
                {t("Try again with help")}
              </button>
            )}
          </>
        )}
      </div>
      {exercise.kind === "listen" && !played && checked === null && (
        <p className="muted">
          {t("Play the audio before checking your answer.")}
        </p>
      )}
      {(checked !== null || revealed) && (
        <div
          className={
            "course-answer-feedback " + (checked === true ? "correct" : "")
          }
          role="status"
        >
          <strong>
            {checked === null
              ? t("Answer hint")
              : checked
                ? t("Correct.")
                : t("Not yet. Compare the explanation.")}
          </strong>
          <p>{exercise.explanation[locale]}</p>
          <div className="course-correct-order">
            {exercise.answers[0].map((id) => (
              <span key={id}>
                <OptionText
                  option={exercise.options.find((o) => o.id === id)!}
                />
                <small>
                  {exercise.options.find((o) => o.id === id)!.label[locale]}
                </small>
              </span>
            ))}
          </div>
          {exercise.example && (
            <SentenceCard
              value={sentences.find((s) => s.id === exercise.example)!}
              notify={notify}
              onWrite={() => onWrite(exercise.example!)}
            />
          )}
        </div>
      )}
      {assisted && (
        <p className="course-assisted">
          {t(
            "Answer help used. This attempt saves practice without advancing independent recall.",
          )}
        </p>
      )}
    </section>
  );
}
function CourseRecall({
  db,
  item,
  penOnly,
  record,
  notify,
  onBack,
}: {
  db: IDBDatabase | null;
  item: Item;
  penOnly: boolean;
  record: (e: LearningEvent) => Promise<void>;
  notify: (m: string) => void;
  onBack: () => void;
}) {
  const { t } = useI18n();
  const chars = Array.from(item.hanzi).filter((c) => /[\u3400-\u9fff]/.test(c));
  const [strokes, setStrokes] = useState<Stroke[][]>(() => chars.map(() => []));
  const [revealed, setRevealed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const id = useRef(crypto.randomUUID());
  const [draftReady, setDraftReady] = useState(false);
  const draftKey = "course-recall:" + item.id;
  useEffect(() => {
    let active = true;
    if (!db) return;
    readDraft<{ strokes: Stroke[][]; revealed: boolean; id: string }>(
      db,
      draftKey,
    )
      .then((draft) => {
        if (!active) return;
        if (draft && draft.strokes.length === chars.length) {
          setStrokes(draft.strokes);
          setRevealed(draft.revealed);
          id.current = draft.id;
        }
        setDraftReady(true);
      })
      .catch(() => {
        if (active) notify(t("Could not save the worksheet on this device."));
      });
    return () => {
      active = false;
    };
  }, [db, draftKey]);
  useEffect(() => {
    if (db && draftReady && !saved)
      void saveDraft(db, draftKey, { strokes, revealed, id: id.current }).catch(
        () => notify(t("Could not save the worksheet on this device.")),
      );
  }, [db, draftReady, draftKey, strokes, revealed, saved]);
  async function save(rating: 1 | 2 | 3 | 4) {
    setSaving(true);
    try {
      await record({
        id: id.current,
        itemId: item.id,
        skill: "writing",
        mode: "recall",
        rating,
        assisted: false,
        at: Date.now(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        detail: { input: penOnly ? "pen" : "mixed" },
      });
      setSaved(true);
      if (db) await saveDraft(db, draftKey, undefined);
    } catch {
      notify(t("Could not save this review. Please try again."));
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="panel course-free-recall">
      <span className="eyebrow">{t("WRITE FROM MEMORY")}</span>
      <h3>{item.english}</h3>
      <p className="pinyin">{item.pinyin}</p>
      <div className="course-recall-cells">
        {chars.map((_, i) => (
          <div key={i}>
            <small>{t("Character {0}", [i + 1])}</small>
            <div className="notebook-square">
              <svg
                className="notebook-guidelines"
                viewBox="0 0 100 100"
                aria-hidden="true"
              >
                <path d="M50 0V100 M0 50H100 M0 0L100 100 M100 0L0 100" />
              </svg>
              <Ink
                strokes={strokes[i]}
                onChange={(s) =>
                  setStrokes((old) =>
                    old.map((v, index) => (index === i ? s : v)),
                  )
                }
                penOnly={penOnly}
                disabled={revealed || !draftReady}
              />
            </div>
            <button
              className="text-button"
              disabled={revealed}
              onClick={() =>
                setStrokes((old) =>
                  old.map((v, index) => (index === i ? [] : v)),
                )
              }
            >
              {t("Clear")}
            </button>
          </div>
        ))}
      </div>
      {!revealed ? (
        <button
          className="primary"
          disabled={!draftReady || !strokes.every((s) => s.length > 0)}
          onClick={() => setRevealed(true)}
        >
          {t("Compare answer")}
        </button>
      ) : (
        <>
          <div className="reference-hanzi">{item.hanzi}</div>
          <p>
            {t(
              "Free writing is self-assessed. Rate what you remembered before comparing.",
            )}
          </p>
          {saved ? (
            <p role="status">{t("Practice saved.")}</p>
          ) : (
            <div className="course-actions">
              {([1, 2, 3, 4] as const).map((rating, i) => (
                <button
                  key={rating}
                  className="secondary"
                  disabled={saving}
                  onClick={() => void save(rating)}
                >
                  {t(["Again", "Hard", "Good", "Easy"][i])}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      <button className="text-button" onClick={onBack}>
        {t("Back to notebook")}
      </button>
    </section>
  );
}
