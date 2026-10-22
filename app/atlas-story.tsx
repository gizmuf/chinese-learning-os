"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Play, Pause, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { atlasStories } from "./atlas-stories";
import { useI18n } from "./i18n";
import { playRecording, releaseRecording } from "./audio";
import AtlasStoryArt from "./atlas-story-art";
import { clamp, progressForAudio, stageAt, STORY_DURATION } from "./atlas-story-motion";
import "./atlas-story.css";

const copy = {
  en: { eyebrow: "A CHARACTER, DISCOVERED", sun: "A little sunlight. A lasting shape.", wood: "Find the tree inside the character.", sunMeaning: "sun · day", woodMeaning: "tree · wood", drag: "Drag to explore the transformation", play: "Play story", resume: "Continue", pause: "Pause", replay: "Start again", sound: "Narration on", mute: "Narration off", note: "A visual memory aid. The middle drawing is an illustration, not a historical inscription.", explore: "Find this shape in other characters", reduced: "Reduced motion: three still frames" },
  fr: { eyebrow: "UN CARACTÈRE À DÉCOUVRIR", sun: "Un peu de soleil. Une forme qui reste.", wood: "Retrouvez l’arbre dans le caractère.", sunMeaning: "soleil · jour", woodMeaning: "arbre · bois", drag: "Faites glisser pour explorer la transformation", play: "Lire l’histoire", resume: "Continuer", pause: "Pause", replay: "Recommencer", sound: "Narration activée", mute: "Narration désactivée", note: "Une aide visuelle à la mémorisation. Le dessin intermédiaire est une illustration, pas une inscription historique.", explore: "Retrouver cette forme dans d’autres caractères", reduced: "Mouvement réduit : trois images fixes" },
  ru: { eyebrow: "ОТКРЫВАЕМ ИЕРОГЛИФ", sun: "Немного солнца. Запоминающийся образ.", wood: "Найдите дерево в иероглифе.", sunMeaning: "солнце · день", woodMeaning: "дерево · древесина", drag: "Перемещайте ползунок, чтобы изучить переход", play: "Смотреть историю", resume: "Продолжить", pause: "Пауза", replay: "Сначала", sound: "Озвучка включена", mute: "Озвучка выключена", note: "Образ для запоминания. Промежуточный рисунок — иллюстрация, а не историческая надпись.", explore: "Найти эту форму в других иероглифах", reduced: "Меньше движения: три неподвижных кадра" },
};

export default function AtlasStory(props: { character: string; onComponent: (id: string) => void; notify: (message: string) => void }) {
  const { locale } = useI18n();
  const id = props.character === "日" ? "sun" : props.character === "木" ? "wood" : null;
  return id ? <StoryPlayer key={`${id}-${locale}`} id={id} {...props}/> : null;
}

function StoryPlayer({ id, onComponent, notify }: { id: "sun" | "wood"; onComponent: (id: string) => void; notify: (message: string) => void }) {
  const { locale, t } = useI18n();
  const c = copy[locale], story = atlasStories[id];
  const [progress, setProgress] = useState(0);
  const position = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [narration, setNarration] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const recording = useRef<HTMLAudioElement | null>(null);
  const audioStage = useRef(0);
  const audioReady = useRef(false);
  const detach = useRef<() => void>(() => {});
  const notice = useRef(notify);
  notice.current = notify;
  const update = useCallback((value: number) => { position.current = clamp(value); setProgress(position.current); }, []);
  const clearAudio = useCallback(() => {
    detach.current();
    detach.current = () => {};
    if (recording.current) releaseRecording(recording.current);
    recording.current = null;
    audioReady.current = false;
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReducedMotion(media.matches);
    const visibility = () => { if (document.hidden) { setPlaying(false); recording.current?.pause(); } };
    change(); media.addEventListener("change", change);
    document.addEventListener("visibilitychange", visibility);
    return () => { media.removeEventListener("change", change); document.removeEventListener("visibilitychange", visibility); clearAudio(); };
  }, [clearAudio]);

  const startAudio = useCallback(function start(at: number) {
    clearAudio();
    const stage = stageAt(at);
    audioStage.current = stage;
    const offset = clamp(at * 3 - stage);
    const audio = playRecording(`/atlas/stories/${id}-${locale}-${stage}.mp3`, message => {
      notice.current(message); setPlaying(false);
    });
    recording.current = audio;
    const seek = () => { if (Number.isFinite(audio.duration)) { audio.currentTime = offset * audio.duration; audioReady.current = true; } };
    const ended = () => {
      if (recording.current !== audio) return;
      update((stage + 1) / 3);
      if (stage < 2) start((stage + 1) / 3);
      else { clearAudio(); setPlaying(false); }
    };
    const paused = () => { if (!audio.ended && recording.current === audio) setPlaying(false); };
    audio.addEventListener("loadedmetadata", seek, { once: true });
    audio.addEventListener("ended", ended);
    audio.addEventListener("pause", paused);
    detach.current = () => {
      audio.removeEventListener("loadedmetadata", seek);
      audio.removeEventListener("ended", ended);
      audio.removeEventListener("pause", paused);
    };
  }, [clearAudio, id, locale, update]);

  useEffect(() => {
    if (!playing) return;
    let frame = 0, last = performance.now();
    function tick(now: number) {
      if (document.hidden) { setPlaying(false); recording.current?.pause(); return; }
      if (narration) {
        const audio = recording.current;
        if (audio && audioReady.current && Number.isFinite(audio.duration) && audio.duration > 0) {
          update(progressForAudio(audioStage.current, audio.currentTime, audio.duration));
        }
      } else {
        update(position.current + Math.min(now - last, 100) / STORY_DURATION);
        if (position.current >= 1) { setPlaying(false); return; }
      }
      last = now;
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, narration, update]);

  function seek(value: number) { setPlaying(false); clearAudio(); update(value); }
  function toggle() {
    if (playing) { setPlaying(false); recording.current?.pause(); return; }
    const at = position.current >= .9999 ? 0 : position.current;
    update(at);
    if (narration) startAudio(at);
    setPlaying(true);
  }
  const stage = stageAt(progress), current = story.steps[stage];
  return <section className="atlas-motion" aria-label={t("Visual character story")}>
    <header className="story-heading">
      <div><p className="story-kicker">{c.eyebrow}</p><h3>{c[id]}</h3></div>
      <div className="story-word"><span lang="zh-Hans">{story.character}</span><div><strong>{id === "sun" ? "rì" : "mù"}</strong><small>{id === "sun" ? c.sunMeaning : c.woodMeaning}</small></div></div>
    </header>
    <div className="story-stage">
      <span className="story-stage-tag">0{stage + 1} <span> / </span> 03 · {current.label[locale]}</span>
      <AtlasStoryArt id={id} progress={progress} reducedMotion={reducedMotion} label={`${story.character} · ${id === "sun" ? "rì" : "mù"} · ${current.label[locale]}`}/>
      <div className="story-caption" aria-live="polite" aria-atomic="true"><span className="story-caption-number">0{stage + 1}</span><p>{current.caption[locale]}</p></div>
    </div>
    <div className="story-console">
      <div className="story-transport">
        <button className="story-play" onClick={toggle}>{playing ? <Pause size={17}/> : <Play size={17}/>}<span>{playing ? c.pause : progress > 0 && progress < 1 ? c.resume : c.play}</span></button>
        <button className="story-icon" onClick={() => seek(0)} aria-label={c.replay} title={c.replay}><RotateCcw size={18}/></button>
        <span className="story-drag-hint">{reducedMotion ? c.reduced : c.drag}</span>
        <button className="story-sound" aria-pressed={narration} onClick={() => { seek(position.current); setNarration(!narration); }}>{narration ? <Volume2 size={18}/> : <VolumeX size={18}/>}<span>{narration ? c.sound : c.mute}</span></button>
      </div>
      <input className="story-scrubber" type="range" min="0" max="1000" step="1" value={Math.round(progress * 1000)} onChange={e => seek(Number(e.target.value) / 1000)} aria-label={c.drag} aria-valuetext={`${Math.round(progress * 100)}% · ${current.label[locale]}`} style={{ "--story-progress": `${progress * 100}%` } as React.CSSProperties}/>
      <div className="story-chapters" role="group" aria-label={t("Story steps")}>
        {story.steps.map((s, i) => <button key={i} aria-pressed={stage === i} onClick={() => seek(i === 2 ? 1 : i === 1 ? .48 : 0)}><span>0{i + 1}</span>{s.label[locale]}</button>)}
      </div>
    </div>
    <footer className="story-footnote"><p>{c.note} <a href={story.source} target="_blank" rel="noreferrer">CUHK ↗</a></p><button onClick={() => onComponent(id)}>{c.explore}<ArrowRight size={16}/></button></footer>
  </section>;
}
