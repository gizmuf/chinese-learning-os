"use client";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Play,
  Pause,
  Volume2,
  Square,
} from "lucide-react";
import { atlasStories } from "./atlas-stories";
import { useI18n } from "./i18n";
import { playRecording, stopAudio } from "./audio";
export default function AtlasStory({
  character,
  onComponent,
  notify,
}: {
  character: string;
  onComponent: (id: string) => void;
  notify: (message: string) => void;
}) {
  const { t, locale } = useI18n();
  const id = character === "日" ? "sun" : character === "木" ? "wood" : null;
  const [step, setStep] = useState(0),
    [playing, setPlaying] = useState(false);
  useEffect(() => {
    setStep(0);
    setPlaying(false);
    stopAudio();
    return stopAudio;
  }, [id, locale]);
  useEffect(() => {
    if (!playing) return;
    const timer = setTimeout(() => {
      if (step === 2) setPlaying(false);
      else setStep(step + 1);
    }, 4200);
    return () => clearTimeout(timer);
  }, [playing, step]);
  if (!id) return null;
  const story = atlasStories[id],
    current = story.steps[step];
  function move(next: number) {
    stopAudio();
    setPlaying(false);
    setStep(next);
  }
  return (
    <section className="atlas-story" aria-label={t("Visual character story")}>
      <div className="section-top">
        <h3>{story.title[locale]}</h3>
        <span className="eyebrow">{t("VISUAL STORY")}</span>
      </div>
      <div className="atlas-story-layout">
        <svg
          className={"atlas-story-art story-" + id}
          viewBox="0 0 240 180"
          role="img"
          aria-label={story.title[locale] + " · " + current.label[locale]}
        >
          {id === "sun" ? (
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
            >
              <g style={{ opacity: step === 0 ? 1 : 0 }}>
                {Array.from({ length: 8 }, (_, i) => (
                  <line
                    key={i}
                    x1="120"
                    y1="14"
                    x2="120"
                    y2="4"
                    transform={`rotate(${i * 45} 120 90)`}
                  />
                ))}
              </g>
              <rect
                x={step === 2 ? 77 : 65}
                y={step === 2 ? 27 : 35}
                width={step === 2 ? 86 : 110}
                height={step === 2 ? 126 : 110}
                rx={step === 2 ? 2 : 55}
                fill={step === 0 ? "var(--atlas-story-wash)" : "none"}
              />
              <circle
                cx="120"
                cy="90"
                r="5"
                fill="currentColor"
                stroke="none"
                style={{ opacity: step === 1 ? 1 : 0 }}
              />
              <line
                x1="78"
                y1="90"
                x2="162"
                y2="90"
                style={{ opacity: step === 2 ? 1 : 0 }}
              />
            </g>
          ) : (
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path
                d="M120 34 C82 10 58 43 72 66 C43 92 75 119 108 98 C139 124 181 100 166 74 C194 48 156 13 120 34Z"
                fill="var(--atlas-story-wash)"
                stroke="none"
                style={{ opacity: step === 0 ? 1 : 0 }}
              />
              <path d="M120 28V153" />
              <path
                d={step === 2 ? "M60 66H180" : "M120 64L78 40 M120 64L162 40"}
                style={{ opacity: step === 0 ? 0.4 : 1 }}
              />
              <path
                d={
                  step === 2
                    ? "M120 66Q101 112 57 142 M120 66Q139 112 183 142"
                    : "M120 142L83 164 M120 142L157 164"
                }
              />
              <path
                d="M120 90L84 70 M120 90L156 70"
                style={{ opacity: step === 1 ? 1 : 0 }}
              />
            </g>
          )}
        </svg>
        <div>
          <p className="eyebrow">
            {step + 1}/3 · {current.label[locale]}
          </p>
          <p className="atlas-story-caption" aria-live="polite">
            {current.caption[locale]}
          </p>
          <p className="atlas-scope-note">
            {t(
              "Illustrative reconstruction, not a tracing of a dated inscription.",
            )}
          </p>
        </div>
      </div>
      <div
        className="atlas-story-steps"
        role="group"
        aria-label={t("Story steps")}
      >
        {story.steps.map((s, i) => (
          <button key={i} aria-pressed={step === i} onClick={() => move(i)}>
            {i + 1}. {s.label[locale]}
          </button>
        ))}
      </div>
      <div className="atlas-actions">
        <button
          className="secondary"
          onClick={() => {
            stopAudio();
            if (playing) setPlaying(false);
            else {
              setStep(0);
              setPlaying(true);
            }
          }}
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}{" "}
          {t(playing ? "Pause animation" : "Play animation")}
        </button>
        <button
          className="secondary"
          onClick={() => {
            setPlaying(false);
            playRecording(`/atlas/stories/${id}-${locale}-${step}.mp3`, notify);
          }}
        >
          <Volume2 size={16} />
          {t("Listen to this step")}
        </button>
        <button
          className="icon-button"
          aria-label={t("Stop narration")}
          onClick={stopAudio}
        >
          <Square size={15} />
        </button>
        <button
          className="icon-button"
          aria-label={t("Previous story step")}
          disabled={step === 0}
          onClick={() => move(step - 1)}
        >
          <ArrowLeft size={16} />
        </button>
        <button
          className="icon-button"
          aria-label={t("Next story step")}
          disabled={step === 2}
          onClick={() => move(step + 1)}
        >
          <ArrowRight size={16} />
        </button>
      </div>
      <div className="atlas-story-source">
        <a href={story.source} target="_blank" rel="noreferrer">
          {t("Origin reference")} · CUHK
        </a>
        <button className="text-button" onClick={() => onComponent(id)}>
          {t("Explore this component")} <ArrowRight size={15} />
        </button>
      </div>
    </section>
  );
}
