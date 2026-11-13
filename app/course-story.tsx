"use client";
import { useState } from "react";
import { Volume2, ArrowLeftRight } from "lucide-react";
import { useI18n } from "./i18n";
import { L, sentences, sentenceItem } from "./course-data";
import { speak, stopAudio } from "./audio";
const stories = [
  {
    id: "experience",
    title: L("Experience · 过", "Expérience · 过", "Опыт · 过"),
    first: "s01",
    now: "s02",
    earlier: "shanghai",
    current: "suzhou",
    explanation: L(
      "He visited Shanghai before. In this story, he is in Suzhou now — we know that from the second sentence.",
      "Il a déjà visité Shanghai. Dans cette histoire, il est maintenant à Suzhou : c’est la deuxième phrase qui le précise.",
      "Он раньше бывал в Шанхае. В этой истории он сейчас в Сучжоу — это прямо сказано во втором предложении.",
    ),
  },
  {
    id: "change",
    title: L(
      "New situation · 了",
      "Situation nouvelle · 了",
      "Новая ситуация · 了",
    ),
    first: "s03",
    now: "s04",
    earlier: "suzhou",
    current: "shanghai",
    explanation: L(
      "In this illustrated story, he leaves Suzhou for Shanghai. The second sentence confirms that he is in Shanghai now.",
      "Dans cette histoire illustrée, il quitte Suzhou pour Shanghai. La deuxième phrase confirme qu’il est maintenant à Shanghai.",
      "В этой иллюстрации он уезжает из Сучжоу в Шанхай. Второе предложение подтверждает, что сейчас он в Шанхае.",
    ),
  },
] as const;
function Person() {
  return (
    <svg viewBox="0 0 60 90" aria-hidden="true">
      <circle cx="30" cy="15" r="11" />
      <path d="M17 38Q30 28 43 38L48 59H37L41 84H29L25 64L22 84H10L15 54L9 59L4 51Z" />
    </svg>
  );
}
export default function CourseStory({
  notify,
}: {
  notify: (m: string) => void;
}) {
  const { t, locale } = useI18n();
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"earlier" | "now">("now");
  const story = stories[index];
  const city = phase === "now" ? story.current : story.earlier;
  const first = sentences.find((s) => s.id === story.first)!;
  const now = sentences.find((s) => s.id === story.now)!;
  return (
    <section className="course-story" aria-label={t("Two stories on the map")}>
      <div className="section-top">
        <h4>{t("Where is he now? See the whole story.")}</h4>
        <ArrowLeftRight size={19} />
      </div>
      <p>
        {t("Switch the story, then move between the earlier scene and now.")}
      </p>
      <div
        className="course-story-choices"
        role="group"
        aria-label={t("Choose a story")}
      >
        {stories.map((value, i) => (
          <button
            key={value.id}
            className={index === i ? "selected" : ""}
            aria-pressed={index === i}
            onClick={() => {
              stopAudio();
              setIndex(i);
              setPhase("now");
            }}
          >
            {value.title[locale]}
          </button>
        ))}
      </div>
      <div
        className="course-story-map"
        role="img"
        aria-label={
          t(phase === "now" ? "Now scene" : "Earlier scene") +
          ": " +
          (city === "suzhou" ? "苏州 · Suzhou" : "上海 · Shanghai")
        }
      >
        <div className="course-story-road" />
        <span className="course-story-direction" aria-hidden="true">
          {story.current === "suzhou" ? "←" : "→"}
        </span>
        <div
          className={
            "course-story-person " +
            (city === "shanghai" ? "in-shanghai" : "in-suzhou")
          }
        >
          <span>{t(phase === "now" ? "Now scene" : "Earlier scene")}</span>
          <Person />
        </div>
        <div className="course-story-city city-suzhou">
          <svg viewBox="0 0 80 40" aria-hidden="true">
            <path d="M5 35H75M15 32V19H65V32M9 19L40 3L71 19ZM25 32V24M40 32V24M55 32V24" />
          </svg>
          <strong lang="zh-Hans">苏州</strong>
          <span>Sūzhōu · Suzhou</span>
        </div>
        <div className="course-story-city city-shanghai">
          <svg viewBox="0 0 80 40" aria-hidden="true">
            <path d="M5 35H75M14 35V16H27V35M36 35V5H45V35M57 35V12H69V35M40 5V0" />
          </svg>
          <strong lang="zh-Hans">上海</strong>
          <span>Shànghǎi · Shanghai</span>
        </div>
      </div>
      <div
        className="course-story-phases"
        role="group"
        aria-label={t("Move through the story")}
      >
        {(["earlier", "now"] as const).map((value) => (
          <button
            key={value}
            className={phase === value ? "selected" : ""}
            aria-pressed={phase === value}
            onClick={() => setPhase(value)}
          >
            {t(value === "now" ? "Now scene" : "Earlier scene")}
          </button>
        ))}
      </div>
      <p className="course-story-explanation" aria-live="polite">
        {story.explanation[locale]}
      </p>
      <div className="course-story-sentences">
        {[first, now].map((sentence, i) => (
          <article key={sentence.id}>
            <span className="eyebrow">
              {t(
                i === 0
                  ? "The experience or event"
                  : "Current location, stated explicitly",
              )}
            </span>
            <strong lang="zh-Hans">{sentence.hanzi}</strong>
            <span className="pinyin">{sentence.pinyin}</span>
            <p>{sentence.meaning[locale]}</p>
            <button
              className="audio-button"
              aria-label={t("Listen to") + " " + sentence.pinyin}
              onClick={() =>
                speak(sentence.hanzi, notify, sentenceItem(sentence, locale))
              }
            >
              <Volume2 size={16} />
            </button>
          </article>
        ))}
      </div>
      <p className="course-story-caution">
        {t(
          "This is one possible story. The second sentence explicitly gives the current location. 过 or 了 alone does not establish where someone is now.",
        )}
      </p>
    </section>
  );
}
