"use client";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  RotateCcw,
  Volume2,
  PenLine,
} from "lucide-react";
import { useI18n } from "./i18n";
import {
  blockTasks,
  wordFamilies,
  readingChecks,
  recallChecks,
  labTermById,
  labActivityIds,
  checkBlocks,
  checkRecall,
} from "./course-lab-data";
import {
  newCourseEvent,
  courseCards,
  type CourseEvent,
} from "./course-learning";
import { termItem } from "./course-data";
import { speak, stopAudio } from "./audio";
import Ink from "./ink";
import type { Stroke } from "./learning";
type Answer = {
  tokens: string[];
  pick: string;
  text: string;
  ink: Stroke[];
  mode: "type" | "ink";
  revealed: boolean;
  pronunciation: boolean;
  assisted: boolean;
  result: boolean | null;
  eventId: string;
};
const blank = (): Answer => ({
  tokens: [],
  pick: "",
  text: "",
  ink: [],
  mode: "type",
  revealed: false,
  pronunciation: false,
  assisted: false,
  result: null,
  eventId: crypto.randomUUID(),
});
type Section = "blocks" | "families" | "checks";
const categories = ["blocks", "families", "checks"] as const;
export default function CourseLab({
  events,
  ready,
  record,
  onWrite,
  notify,
  penOnly,
}: {
  events: CourseEvent[];
  ready: boolean;
  record: (e: CourseEvent) => Promise<void>;
  onWrite: (id: string) => void;
  notify: (m: string) => void;
  penOnly: boolean;
}) {
  const { t, locale } = useI18n();
  const [section, setSection] = useState<Section>("blocks"),
    [blockIndex, setBlockIndex] = useState(0),
    [familyIndex, setFamilyIndex] = useState(0),
    [checkIndex, setCheckIndex] = useState(0),
    [saving, setSaving] = useState(false);
  const [answers, setAnswers] = useState<Record<string, Answer>>(() =>
    Object.fromEntries(labActivityIds.map((id) => [id, blank()])),
  );
  const checks = [
    ...readingChecks.map((c) => ({ ...c, kind: "read" as const })),
    ...recallChecks.map((c) => ({ ...c, kind: "recall" as const })),
  ];
  const block = blockTasks[blockIndex],
    family = wordFamilies[familyIndex],
    checkpoint = checks[checkIndex];
  const id =
    section === "blocks"
      ? block.id
      : section === "families"
        ? family.id
        : checkpoint.id;
  const answer = answers[id],
    locked = answer.result !== null;
  const term =
    section === "families"
      ? labTermById(family.members[0])
      : labTermById(section === "blocks" ? block.termId : checkpoint.termId);
  const index =
    section === "blocks"
      ? blockIndex
      : section === "families"
        ? familyIndex
        : checkIndex;
  const total =
    section === "blocks"
      ? blockTasks.length
      : section === "families"
        ? wordFamilies.length
        : checks.length;
  const cards = useMemo(() => courseCards(events), [events]);
  const eligible = labActivityIds.filter((id) => !id.startsWith("lab-family-"));
  const independent = new Set(
    events
      .filter(
        (e) =>
          eligible.includes(e.activityId) &&
          e.kind === "answer" &&
          e.correct &&
          !e.assisted,
      )
      .map((e) => e.activityId),
  );
  const due = eligible.filter(
    (id) => cards[id] && new Date(cards[id].due).getTime() <= Date.now(),
  );
  function update(patch: Partial<Answer>) {
    setAnswers((all) => ({ ...all, [id]: { ...all[id], ...patch } }));
  }
  function move(next: number) {
    if (saving || next < 0 || next >= total) return;
    stopAudio();
    if (section === "blocks") setBlockIndex(next);
    else if (section === "families") setFamilyIndex(next);
    else setCheckIndex(next);
  }
  async function save(correct: boolean) {
    if (saving || locked || !ready) return;
    setSaving(true);
    try {
      await record({
        ...newCourseEvent(
          id,
          "answer",
          correct,
          section === "families" || answer.assisted,
        ),
        id: answer.eventId,
      });
      update({ result: correct, revealed: true });
    } catch {
      notify(
        t("Could not save practice. Keep this worksheet open and try again."),
      );
    } finally {
      setSaving(false);
    }
  }
  function retry() {
    update({
      result: null,
      revealed: false,
      assisted: true,
      pick: "",
      tokens: [],
      text: "",
      ink: [],
      eventId: crypto.randomUUID(),
    });
  }
  function feedback() {
    return (
      <div
        className={"lesson-lab-feedback " + (answer.result ? "correct" : "")}
        role="status"
      >
        <strong>
          {t(
            answer.result === true
              ? "Correct."
              : answer.result === false
                ? "Compare the classroom form."
                : "Answer hint",
          )}
        </strong>
        <p lang="zh-Hans">{term.hanzi}</p>
        <p>{term.meaning[locale]}</p>
        <button
          className="text-button"
          onClick={() => update({ pronunciation: !answer.pronunciation })}
        >
          {t(
            answer.pronunciation
              ? "Hide pronunciation"
              : "Reveal pronunciation",
          )}
        </button>
        {answer.pronunciation && <p className="pinyin">{term.pinyin}</p>}
        <button
          className="audio-button"
          onClick={() => speak(term.hanzi, notify, termItem(term, locale))}
        >
          <Volume2 size={16} />
          {t("Hear word")}
        </button>
        <button className="text-button" onClick={() => onWrite(term.id)}>
          <PenLine size={16} />
          {t("Practice writing")}
        </button>
      </div>
    );
  }
  return (
    <section className="lesson-lab" aria-label={t("Lesson 3 practice lab")}>
      <div className="panel lesson-lab-intro">
        <p className="eyebrow">{t("BUILD · CONNECT · REMEMBER")}</p>
        <h3>{t("Make the patterns your own.")}</h3>
        <p>
          {t(
            "Build complete expressions, discover word families, then try short checks without pinyin.",
          )}
        </p>
        <p className="lesson-lab-summary">
          {independent.size}/{eligible.length} {t("independent successes")} ·{" "}
          {due.length} {t("due for review")}
        </p>
        {due.length > 0 && (
          <button
            className="secondary"
            disabled={saving}
            onClick={() => {
              stopAudio();
              const id = due[0];
              if (id.startsWith("lab-build-")) {
                setSection("blocks");
                setBlockIndex(blockTasks.findIndex((task) => task.id === id));
              } else {
                setSection("checks");
                setCheckIndex(checks.findIndex((task) => task.id === id));
              }
            }}
          >
            {t("Review due activity")}
            <ArrowRight size={16} />
          </button>
        )}
        <p className="muted">
          {t(
            "The original 24 activities keep their own completion count. Guided family practice does not advance independent recall.",
          )}
        </p>
      </div>
      <div
        className="lesson-lab-tabs"
        role="group"
        aria-label={t("Practice lab sections")}
      >
        {categories.map((s, i) => (
          <button
            key={s}
            className={section === s ? "selected" : ""}
            aria-pressed={section === s}
            disabled={saving}
            onClick={() => {
              stopAudio();
              setSection(s);
            }}
          >
            {t(["Expression blocks", "Word families", "No-pinyin checks"][i])}
          </button>
        ))}
      </div>
      <section
        className="panel lesson-lab-activity"
        aria-label={t("Current lab activity")}
      >
        <div className="lesson-lab-nav">
          <button
            className="secondary"
            aria-label={t("Previous lab activity")}
            disabled={saving || index === 0}
            onClick={() => move(index - 1)}
          >
            <ArrowLeft size={16} />
            {t("Previous")}
          </button>
          <span>
            {index + 1}/{total}
          </span>
          <button
            className="secondary"
            aria-label={t("Next lab activity")}
            disabled={saving || index === total - 1}
            onClick={() => move(index + 1)}
          >
            {t("Next")}
            <ArrowRight size={16} />
          </button>
        </div>
        {section === "blocks" && (
          <>
            <p className="eyebrow">{t("BUILD THE FULL CLASSROOM FORM")}</p>
            <h3>{term.meaning[locale]}</h3>
            <p>
              {t(
                "Tap blocks in order. Tap an assembled block to remove it. You can skip and return without recording an answer.",
              )}
            </p>
            <div
              className="lesson-lab-assembly"
              role="group"
              aria-label={t("Your expression")}
            >
              {answer.tokens.length ? (
                answer.tokens.map((piece, i) => (
                  <button
                    key={i}
                    disabled={saving || locked}
                    lang="zh-Hans"
                    aria-label={t("Remove block") + " " + piece}
                    onClick={() =>
                      update({
                        tokens: answer.tokens.filter((_, j) => i !== j),
                      })
                    }
                  >
                    {piece}
                  </button>
                ))
              ) : (
                <span>{t("Build here")}</span>
              )}
            </div>
            <div
              className="lesson-lab-blocks"
              role="group"
              aria-label={t("Available blocks")}
            >
              {block.pool.map((piece) => (
                <button
                  key={piece}
                  lang="zh-Hans"
                  disabled={saving || locked || answer.tokens.includes(piece)}
                  onClick={() => update({ tokens: [...answer.tokens, piece] })}
                >
                  {piece}
                </button>
              ))}
            </div>
            <div className="course-actions">
              <button
                className="primary"
                disabled={!ready || saving || locked || !answer.tokens.length}
                onClick={() => void save(checkBlocks(block, answer.tokens))}
              >
                <Check size={16} />
                {t("Check answer")}
              </button>
              <button
                className="secondary"
                disabled={saving || locked || !answer.tokens.length}
                onClick={() => update({ tokens: [] })}
              >
                {t("Clear")}
              </button>
              <button
                className="text-button"
                disabled={saving || locked}
                onClick={() => update({ revealed: true, assisted: true })}
              >
                {t("Show answer hint")}
              </button>
            </div>
            {(locked || answer.revealed) && (
              <>
                {feedback()}
                <p className="course-rule">{block.note[locale]}</p>
                {block.pairId && (
                  <button
                    className="secondary"
                    disabled={saving}
                    onClick={() =>
                      move(blockTasks.findIndex((b) => b.id === block.pairId))
                    }
                  >
                    {t("Swap the time unit")}
                    <ArrowRight size={16} />
                  </button>
                )}
              </>
            )}
          </>
        )}
        {section === "families" && (
          <>
            <p className="eyebrow">
              {t(
                {
                  component: "Character component",
                  character: "Repeated whole character",
                  word: "Repeated word",
                }[family.kind],
              )}
            </p>
            <h3>{family.title[locale]}</h3>
            <p className="lesson-family-anchor" lang="zh-Hans">
              {family.anchor}
            </p>
            <p>{family.note[locale]}</p>
            <div className="lesson-family-members">
              {family.members.map((id) => {
                const member = labTermById(id);
                return (
                  <article key={id}>
                    <strong lang="zh-Hans">{member.hanzi}</strong>
                    <p className="pinyin">{member.pinyin}</p>
                    <p>{member.meaning[locale]}</p>
                    <div className="course-actions">
                      <button
                        className="icon-button"
                        aria-label={t("Listen to") + " " + member.hanzi}
                        onClick={() =>
                          speak(member.hanzi, notify, termItem(member, locale))
                        }
                      >
                        <Volume2 size={16} />
                      </button>
                      <button
                        className="text-button"
                        onClick={() => onWrite(id)}
                      >
                        {t("Practice writing")}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <h4>{t("Guided family check")}</h4>
            <p>
              {t(
                "Which part repeats? The examples stay visible, so this is assisted practice.",
              )}
            </p>
            <div className="lesson-lab-blocks">
              {family.options.map((option) => (
                <button
                  key={option}
                  lang="zh-Hans"
                  className={answer.pick === option ? "selected" : ""}
                  aria-pressed={answer.pick === option}
                  disabled={saving || locked}
                  onClick={() => update({ pick: option })}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              className="primary"
              disabled={!ready || saving || locked || !answer.pick}
              onClick={() => void save(answer.pick === family.anchor)}
            >
              {t("Check answer")}
            </button>
            {locked && (
              <p role="status">
                {t(answer.result ? "Correct." : "Compare the shared part.")}{" "}
                <span lang="zh-Hans">{family.anchor}</span>
              </p>
            )}
          </>
        )}
        {section === "checks" && (
          <>
            <p className="eyebrow">
              {t(
                checkpoint.kind === "read"
                  ? "READ WITHOUT PINYIN"
                  : "RECALL WITHOUT A MODEL",
              )}
            </p>
            <h3>
              {t(
                checkpoint.kind === "read"
                  ? "Choose the meaning."
                  : "Write the Chinese expression from memory.",
              )}
            </h3>
            <p>
              {t(
                "No pinyin or audio clues before checking. Browse freely; only checked answers are recorded.",
              )}
            </p>
            <div
              className="lesson-lab-tabs"
              role="group"
              aria-label={t("Checkpoint type")}
            >
              <button
                className={checkpoint.kind === "read" ? "selected" : ""}
                aria-pressed={checkpoint.kind === "read"}
                disabled={saving}
                onClick={() => move(0)}
              >
                {t("Reading check")} · 6
              </button>
              <button
                className={checkpoint.kind === "recall" ? "selected" : ""}
                aria-pressed={checkpoint.kind === "recall"}
                disabled={saving}
                onClick={() => move(readingChecks.length)}
              >
                {t("Written recall")} · 4
              </button>
            </div>
            {checkpoint.kind === "read" ? (
              <>
                <div className="lesson-lab-read" lang="zh-Hans">
                  {term.hanzi}
                </div>
                <div className="lesson-lab-options">
                  {[...(checkpoint as (typeof readingChecks)[number]).options]
                    .sort((a, b) => {
                      const rank = (id: string) =>
                        Array.from(id + checkpoint.id).reduce(
                          (n, c) =>
                            Math.imul(n ^ c.charCodeAt(0), 16777619) >>> 0,
                          2166136261,
                        );
                      return rank(a) - rank(b);
                    })
                    .map((id) => (
                      <button
                        key={id}
                        className={answer.pick === id ? "selected" : ""}
                        aria-pressed={answer.pick === id}
                        disabled={saving || locked}
                        onClick={() => update({ pick: id })}
                      >
                        {labTermById(id).meaning[locale]}
                      </button>
                    ))}
                </div>
                <button
                  className="primary"
                  disabled={!ready || saving || locked || !answer.pick}
                  onClick={() => void save(answer.pick === term.id)}
                >
                  {t("Check answer")}
                </button>
              </>
            ) : (
              <>
                <p className="lesson-lab-prompt">{term.meaning[locale]}</p>
                <div
                  className="lesson-lab-tabs"
                  role="group"
                  aria-label={t("Recall input method")}
                >
                  {(["type", "ink"] as const).map((mode) => (
                    <button
                      key={mode}
                      aria-pressed={answer.mode === mode}
                      className={answer.mode === mode ? "selected" : ""}
                      disabled={saving || locked || answer.revealed}
                      onClick={() => update({ mode })}
                    >
                      {t(mode === "type" ? "Type Chinese" : "Write by hand")}
                    </button>
                  ))}
                </div>
                {answer.mode === "type" ? (
                  <>
                    <label className="lesson-recall-input">
                      {t("Your Chinese answer")}
                      <input
                        lang="zh-Hans"
                        aria-label={t("Your Chinese answer")}
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        value={answer.text}
                        disabled={saving || locked || answer.revealed}
                        onChange={(e) => update({ text: e.target.value })}
                      />
                    </label>
                    <button
                      className="primary"
                      disabled={
                        !ready ||
                        saving ||
                        locked ||
                        answer.revealed ||
                        !answer.text.trim()
                      }
                      onClick={() => void save(checkRecall(term, answer.text))}
                    >
                      {t("Check answer")}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="lesson-lab-ink">
                      <Ink
                        strokes={answer.ink}
                        onChange={(ink) => update({ ink })}
                        penOnly={penOnly}
                        disabled={saving || locked || answer.revealed}
                      />
                    </div>
                    <p>
                      {t(
                        "Handwriting is self-assessed. Draw first, reveal the model, then rate what you remembered.",
                      )}
                    </p>
                    <div className="course-actions">
                      <button
                        className="secondary"
                        disabled={
                          saving ||
                          locked ||
                          answer.revealed ||
                          !answer.ink.length
                        }
                        onClick={() => update({ ink: [] })}
                      >
                        {t("Clear")}
                      </button>
                      <button
                        className="primary"
                        disabled={
                          saving ||
                          locked ||
                          answer.revealed ||
                          !answer.ink.length
                        }
                        onClick={() => update({ revealed: true })}
                      >
                        {t("Compare answer")}
                      </button>
                    </div>
                    {answer.revealed && !locked && (
                      <div className="lesson-lab-self-check">
                        <strong lang="zh-Hans">{term.hanzi}</strong>
                        <button
                          className="secondary"
                          disabled={!ready || saving}
                          onClick={() => void save(false)}
                        >
                          {t("Need more practice")}
                        </button>
                        <button
                          className="primary"
                          disabled={!ready || saving}
                          onClick={() => void save(true)}
                        >
                          {t("I remembered it")}
                        </button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
            {locked && feedback()}
          </>
        )}
        {answer.assisted && (
          <p className="lesson-lab-assisted">
            {t(
              "Answer help used. This attempt saves practice without advancing independent recall.",
            )}
          </p>
        )}
        {locked && (
          <div className="course-actions">
            {answer.result === false && (
              <button className="secondary" disabled={saving} onClick={retry}>
                <RotateCcw size={16} />
                {t("Try again with help")}
              </button>
            )}
            {index < total - 1 && (
              <button
                className="primary"
                disabled={saving}
                onClick={() => move(index + 1)}
              >
                {t("Continue")}
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
        {saving && <p role="status">{t("Saving…")}</p>}
        {cards[id] && (
          <p className="muted">
            {t("Next review")}:{" "}
            {new Date(cards[id].due).toLocaleDateString(locale)}
          </p>
        )}
      </section>
    </section>
  );
}
