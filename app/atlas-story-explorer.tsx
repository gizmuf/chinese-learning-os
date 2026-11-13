"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Play, RotateCcw, Square, Volume2 } from "lucide-react";
import { playRecording, releaseRecording } from "./audio";
import { atlasExplorerStories, type StoryLinkKind, type StoryTarget } from "./atlas-story-explorer-model";
import "./atlas-story-explorer.css";

export { isStoryTarget, type StoryTarget } from "./atlas-story-explorer-model";

export type AtlasStoryExplorerProps = {
  target: StoryTarget;
  step: number;
  onStepChange: (step: number) => void;
  onExplore: (text: string, kind: StoryLinkKind) => void;
  onBack: () => void;
};

const steps = ["Scene", "Structure", "In use"] as const;

export default function AtlasStoryExplorer({ target, step, onStepChange, onExplore, onBack }: AtlasStoryExplorerProps) {
  const heading = useId();
  const story = atlasExplorerStories[target];
  const selectedStep = steps[step] ? step : 0;

  return <section className="atlas-story-explorer" data-story-target={target} aria-labelledby={heading}>
    <div className="atlas-story-explorer-top">
      <button type="button" className="ase-button ase-back" onClick={onBack}>
        <ArrowLeft size={17} aria-hidden="true" /> Back to Atlas
      </button>
      <div className="ase-steps" role="group" aria-label="Story steps">
        {steps.map((label, index) => <button type="button" key={label} className="ase-button"
          aria-pressed={index === selectedStep} onClick={() => onStepChange(index)}>{label}</button>)}
      </div>
    </div>
    <div className="ase-body">
      <div className="ase-heading">
        <h2 id={heading} lang="zh-Hans">{story.target.text}</h2>
        <p className="ase-reading">{story.target.pinyin}</p>
        <p className="ase-meaning">{story.target.english}</p>
      </div>
      <StoryPanel key={`${target}-${selectedStep}`} target={target} step={selectedStep} onExplore={onExplore} />
    </div>
    <div className="ase-footer">
      <details className="ase-source">
        <summary>Sources</summary>
        <p>{story.source.url
          ? <a href={story.source.url} target="_blank" rel="noreferrer">{story.source.name}</a>
          : story.source.name} · {story.source.id}</p>
      </details>
      {selectedStep < steps.length - 1 && <button type="button" className="ase-button ase-primary" onClick={() => onStepChange(selectedStep + 1)}>
        {steps[selectedStep + 1]} <ArrowRight size={16} aria-hidden="true" />
      </button>}
    </div>
  </section>;
}

function StoryPanel({ target, step, onExplore }: Pick<AtlasStoryExplorerProps, "target" | "step" | "onExplore">) {
  const story = atlasExplorerStories[target];
  const { related } = story;
  const [played, setPlayed] = useState(false);
  const [playing, setPlaying] = useState<string>();
  const [audioMessage, setAudioMessage] = useState("");
  const recording = useRef<HTMLAudioElement | null>(null);

  useEffect(() => () => {
    if (recording.current) releaseRecording(recording.current);
    recording.current = null;
  }, []);

  function toggleAudio(source: string) {
    if (recording.current) releaseRecording(recording.current);
    recording.current = null;
    setPlaying(undefined);
    setAudioMessage("");
    if (source === playing) return;
    const audio = playRecording(source, (message) => {
      setAudioMessage(message);
      setPlaying(undefined);
    });
    recording.current = audio;
    setPlaying(source);
    function clearPlaying() {
      if (recording.current === audio) setPlaying(undefined);
    }
    audio.addEventListener("ended", clearPlaying, { once: true });
    audio.addEventListener("pause", clearPlaying, { once: true });
  }

  function audioButton(source: string, label: string) {
    const active = playing === source;
    const Icon = active ? Square : Volume2;
    return <button type="button" className="ase-button" onClick={() => toggleAudio(source)}>
      <Icon size={16} aria-hidden="true" /> {active ? "Stop audio" : label}
    </button>;
  }

  return <div className="ase-panel">
    {step === 0 && <>
      <div className="ase-scene" data-played={played}>
        <SceneArt target={target} />
        <span className="ase-scene-state" aria-live="polite">{story.scene.states[Number(played)]}</span>
      </div>
      <div className="ase-scene-copy">
        <div className="ase-mnemonic">Memory scene</div>
        <h3>{story.scene.title}</h3>
        <p>{story.scene.description}</p>
      </div>
      <div className="ase-actions">
        <button type="button" className="ase-button" onClick={() => setPlayed((value) => !value)}>
          {played ? <RotateCcw size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {played ? story.scene.reset : story.scene.action}
        </button>
        {story.scene.narration && audioButton(story.scene.narration, "Hear the story")}
        {story.target.audio && audioButton(story.target.audio, `Hear ${story.target.text} · ${story.target.pinyin}`)}
      </div>
    </>}
    {step === 1 && <>
      <h3>{story.structure.layout === "word" ? "How the word reads" : "How the character fits together"}</h3>
      <p>{story.structure.description}</p>
      <div className={`ase-structure ase-structure-${story.structure.layout}`}>
        {story.structure.parts.map((part) => <button type="button" key={part.text} className="ase-part"
          onClick={() => onExplore(part.text, part.kind)}>
          <span className="ase-position">{part.position}</span>
          <span className="ase-part-hanzi" lang="zh-Hans">{part.text}</span>
          <span className="ase-reading">{part.pinyin}</span>
          <span className="ase-term-english">{part.english}</span>
          <ArrowRight size={15} aria-hidden="true" />
        </button>)}
      </div>
    </>}
    {step === 2 && <div className="ase-examples">
      <div className="ase-example">
        <button type="button" className="ase-term" onClick={() => onExplore(story.example.text, story.example.kind)}>
          <span className="ase-example-hanzi" lang="zh-Hans">{story.example.text}</span>
          <span className="ase-reading">{story.example.pinyin}</span>
          <span className="ase-term-english">{story.example.english}</span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        {story.example.audio && audioButton(story.example.audio, "Hear the sentence")}
      </div>
      {related && <div className="ase-example ase-related">
        <button type="button" className="ase-term" onClick={() => onExplore(related.text, related.kind)}>
          <span className="ase-example-hanzi" lang="zh-Hans">{related.text}</span>
          <span className="ase-reading">{related.pinyin}</span>
          <span className="ase-term-english">{related.english}</span>
          <ArrowRight size={17} aria-hidden="true" />
        </button>
        {related.audio && audioButton(related.audio, "Hear the word")}
      </div>}
    </div>}
    {audioMessage && <p className="ase-audio-status" role="status">{audioMessage}</p>}
  </div>;
}

function SceneArt({ target }: { target: StoryTarget }) {
  if (target === "姓") return <div className="ase-badge" aria-hidden="true">
    <div className="ase-badge-strap" />
    <div className="ase-badge-card">
      <div className="ase-badge-face ase-badge-front"><i /><i /><i /></div>
      <div className="ase-badge-face ase-badge-back"><span lang="zh-Hans">姓</span><i /></div>
    </div>
  </div>;

  if (target === "明天") return <svg className="ase-scene-art" viewBox="0 0 640 270" aria-hidden="true">
    <circle className="ase-today-sun" cx="173" cy="153" r="42" fill="#ffc77f" />
    <circle className="ase-tomorrow-sun" cx="470" cy="103" r="47" fill="#ffe2a0" />
    <path d="M0 236 105 170 164 200 247 127 368 233 483 147 640 229V270H0Z" fill="#6d8290" />
    <path d="M0 236q102-25 178-8t155-8 137-7 170 6v51H0Z" fill="#435e69" />
    <path d="M0 257q125-19 214 0t173-4 253 3v14H0Z" fill="#2b4655" />
    <path d="M80 116h57m-48 10h26m306 17h46m16-7h18" fill="none" stroke="#fff0cc" strokeWidth="2" strokeLinecap="round" opacity=".6" />
  </svg>;

  return <svg className="ase-scene-art" viewBox="0 0 640 270" aria-hidden="true">
    <rect x="137" y="27" width="366" height="203" rx="8" fill="#e6a579" />
    <circle cx="397" cy="91" r="26" fill="#ffe1a1" />
    <path d="M145 229 265 131 319 183 372 132 491 229Z" fill="#918697" />
    <path d="M145 229 234 172 280 201 333 167 408 199 491 174V229Z" fill="#675c76" />
    <g fill="#925567" stroke="#633344" strokeWidth="2">
      <g className="ase-curtain-left">
        <path d="M139 28H321V224Q285 211 250 224Q211 211 139 224Z" />
        <path d="M173 34V211M211 34V213M250 34V213M288 34V211" fill="none" stroke="#b77b84" />
      </g>
      <g className="ase-curtain-right">
        <path d="M319 28H501V224Q429 211 390 224Q355 211 319 224Z" />
        <path d="M352 34V211M390 34V213M429 34V213M467 34V211" fill="none" stroke="#b77b84" />
      </g>
    </g>
    <path d="M131 26H509M125 231H515" stroke="#c79a71" strokeWidth="7" strokeLinecap="round" />
  </svg>;
}
