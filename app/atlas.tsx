"use client";
import {withTurkish} from "./turkish";
import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Cloud,
  Download,
  Eye,
  Search,
  Volume2,
} from "lucide-react";
import AtlasWorkshop from "./atlas-workshop";
const AtlasCloud = lazy(() => import("./atlas-cloud"));
const AtlasStudio = lazy(() => import("./atlas-studio"));
const ConnectionLab = lazy(() => import("./connection-lab"));
import { L as labCopy } from "./connection-lab-copy";
import AtlasListening from "./atlas-listening";
import {
  emptyAnswer,
  sessionTotals,
  swipeStep,
  seededQuestion,
} from "./atlas-session";
import {useDictionaryAssistance} from "./study-lookup";
import { useI18n } from "./i18n";
import { characters, groups, type AtlasCharacter } from "./atlas-data";
import {
  atlasCharacters,
  atlasById,
  atlasByHanzi,
  atlasComponents,
  componentById,
  groupById,
  coreIds,
  containing,
  groupsFor,
  linkedWords,
  atlasItem,
  atlasQueue,
  type AtlasSkill,
} from "./atlas-model";
import { useAtlasProgress } from "./atlas-store";
import {
  atlasCards,
  atlasDue,
  newAtlasEvent,
  type AtlasEvent,
} from "./atlas-learning";
import { stopAudio, speak } from "./audio";
import AtlasGlyph from "./atlas-glyph";
import AtlasRecall from "./atlas-recall";
import Notebook from "./notebook";
import AtlasGuidedWriting from "./atlas-guided-writing";
import {isCloudAtlasEntry} from "./atlas-cloud-entry";
import type { Item } from "./content";
import type { LearningEvent } from "./learning";
type Scope = { kind: "group" | "component"; id: string } | null;
type Tab = "explore" | "compare" | "practice" | "writing" | "materials" | "listening" | "lab";
type Task = { targetId: string; skill: Exclude<AtlasSkill, "writing"> };
const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f\s]/g, "")
    .toLowerCase();
export default function Atlas({
  owner,
  db,
  penOnly,
  setPenOnly,
  notify,
  onWord,
}: {
  owner: string | null;
  db: IDBDatabase | null;
  penOnly: boolean;
  setPenOnly: (v: boolean) => void;
  notify: (m: string) => void;
  onWord: (item: Item) => void;
}) {
  const { t, locale } = useI18n();
  const progress = useAtlasProgress(owner);
  const [studio, setStudio] = useState(false);
  const [cloud, setCloud] = useState(true);
  const [scope, setScope] = useState<Scope>(null);
  const [trail, setTrail] = useState<{ scope: Scope; target: string }[]>([]);
  const [selected, setSelected] = useState("u6674");
  const [tab, setTab] = useState<Tab>("explore");
  const [search, setSearch] = useState("");
  const [compare, setCompare] = useState(["u6e05", "u6674"]);
  const [parts, setParts] = useState(true);
  const [writing, setWriting] = useState<"animated" | "notebook" | "recall">("animated");
  const [queue, setQueue] = useState<Task[] | null>(null);
  const [guided, setGuided] = useState(false);
  const [run, setRun] = useState(0);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setStudio(params.get("studio") === "1");
    setCloud(isCloudAtlasEntry(params));
    const component = params.get("component");
    const group = params.get("group");
    const target = params.get("target");
    if (params.get("lab") === "connections") setTab("lab");
    else if (params.get("listen") === "1") setTab("listening");
    if (component && componentById.has(component))
      setScope({ kind: "component", id: component });
    else if (group && groupById.has(group))
      setScope({ kind: "group", id: group });
    if (!component && !group && params.get("story")==="mo")
      setScope({ kind: "component", id: "sun" });
    if (target && atlasById.has(target)) setSelected(target);
    else if (component && componentById.has(component))
      setSelected(containing(component)[0]?.id ?? "u6674");
    else if (group && groupById.has(group))
      setSelected(atlasByHanzi.get(groupById.get(group)!.characters[0])!.id);
    return () => stopAudio();
  }, []);
  const character = atlasById.get(selected) ?? characters[0];
  const item = atlasItem(character, locale);
  const due = useMemo(() => atlasDue(progress.events).filter(d=>atlasById.has(d.targetId)), [progress.events]);
  const practiced = new Set(
    progress.events
      .filter((e) => coreIds.has(e.targetId) && e.mode !== "explore")
      .map((e) => e.targetId),
  );
  const cards = useMemo(() => atlasCards(progress.events), [progress.events]);
  const scoped =
    scope?.kind === "component"
      ? containing(scope.id)
      : scope?.kind === "group"
        ? groupById.get(scope.id)!.characters.map((c) => atlasByHanzi.get(c)!)
        : atlasCharacters;
  const results = search.trim()
    ? atlasCharacters.filter((c) =>
        normalize(
          [
            c.hanzi,
            c.pinyin,
            c.word,
            c.wordPinyin,
            ...Object.values(c.meaning),
            ...Object.values(c.wordMeaning),
          ].join(" "),
        ).includes(normalize(search)),
      )
    : scoped;
  const activeComponent =
    scope?.kind === "component" ? componentById.get(scope.id) : undefined;
  const activeGroup =
    scope?.kind === "group" ? groupById.get(scope.id) : undefined;
  function url(next: Scope, target = selected) {
    const p = new URLSearchParams({ atlas: "1" });
    if (next) p.set(next.kind, next.id);
    p.set("target", target);
    window.history.replaceState(null, "", window.location.pathname + "?" + p);
  }
  function navigate(next: Scope) {
    stopAudio();
    setTrail((v) => [...v, { scope, target: selected }].slice(-12));
    setScope(next);
    setSearch("");
    setTab("explore");
    const nextRows =
      next?.kind === "component"
        ? containing(next.id)
        : next?.kind === "group"
          ? groupById.get(next.id)!.characters.map((c) => atlasByHanzi.get(c)!)
          : atlasCharacters;
    let nextId = selected;
    if (!nextRows.some((c) => c.id === selected)) {
      nextId =
        nextRows.find(
          (c) =>
            c.hanzi ===
            (next?.kind === "component"
              ? componentById.get(next.id)?.glyph
              : next?.kind === "group"
                ? groupById.get(next.id)?.anchor
                : ""),
        )?.id ??
        nextRows[0]?.id ??
        selected;
      setSelected(nextId);
    }
    url(next, nextId);
  }
  function back() {
    stopAudio();
    const previous = trail.at(-1) ?? { scope: null, target: "u6674" };
    setTrail((v) => v.slice(0, -1));
    setScope(previous.scope);
    setSelected(previous.target);
    setSearch("");
    url(previous.scope, previous.target);
  }
  function choose(c: AtlasCharacter) {
    stopAudio();
    setSelected(c.id);
    setWriting("animated");
    url(scope, c.id);
  }
  function write(c = character) {
    choose(c);
    setTab("writing");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function begin(
    ids = characters.map((c) => c.id),
    assisted = false,
    tasks?: Task[],
  ) {
    stopAudio();
    const q =
      tasks ??
      atlasQueue(ids, 8).map((targetId, i) => ({
        targetId,
        skill: (i % 3 === 2 && coreIds.has(targetId)
          ? "component"
          : i % 3 === 1
            ? "sound"
            : "meaning") as Task["skill"],
      }));
    if (!q.length) return;
    setQueue(q);
    setGuided(assisted);
    setRun((v) => v + 1);
    setTab("practice");
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function saveWriting(e: LearningEvent) {
    await progress.record({
      ...newAtlasEvent(
        character.id,
        "writing",
        e.mode === "recall" ? "recall" : "copy",
        e.rating,
        e.assisted,
      ),
      id: e.id,
      at: e.at,
    });
  }
  async function explore() {
    try {
      await progress.record(
        newAtlasEvent(character.id, "component", "explore", 0, true),
      );
      notify(t("Exploration saved. Recall is measured separately."));
    } catch {
      notify(t("Could not save this review. Please try again."));
    }
  }
  function exportHistory() {
    const url = URL.createObjectURL(
      new Blob(
        [
          JSON.stringify(
            { version: 1, dataset: "atlas-v2-100", events: progress.events },
            null,
            2,
          ),
        ],
        { type: "application/json" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "Chinese-OS-Atlas-history.json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  if (cloud) return <Suspense fallback={<p role="status">{labCopy.loading[locale]}</p>}><AtlasCloud owner={owner} db={db} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} progress={progress} onWord={onWord}/></Suspense>;
  if (studio) return <Suspense fallback={<p role="status">{labCopy.loading[locale]}</p>}><AtlasStudio owner={owner} db={db} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify} progress={progress}/></Suspense>;
  return (
    <div className="atlas-space">
      <div className="page-heading">
        <div>
          <p className="eyebrow">{t("FOLLOW THE CONNECTIONS")}</p>
          <h1>
            {t("Cloud Atlas")}
            <span className="orange">.</span>
          </h1>
          <p>
            {t("100 characters · 20 constellations · more ways to remember")}
          </p>
        </div>
        <button
          className="course-sync"
          onClick={() => void progress.sync()}
          aria-label={t("Sync Atlas progress")}
        >
          <span role="status">{t(progress.status)}</span>
        </button>
      </div>
      <div className="atlas-tabs" role="group" aria-label={t("Atlas sections")}>
        {(
          ["explore", "compare", "practice", "listening", "writing", "materials", "lab"] as Tab[]
        ).map((value, i) => (
          <button
            key={value}
            className={tab === value ? "selected" : ""}
            aria-pressed={tab === value}
            onClick={() => {
              stopAudio();
              setTab(value);
              const params = new URLSearchParams(window.location.search);
              if (value === "lab") params.set("lab", "connections"); else params.delete("lab");
              if (value === "listening") params.set("listen", "1"); else params.delete("listen");
              window.history.replaceState(null, "", window.location.pathname + "?" + params);
            }}
          >
            {value === "lab" ? labCopy.title[locale] : t(
              ["Explore", "Compare", "Mixed recall", "Listening", "Writing", "Materials"][i],
            )}
          </button>
        ))}
      </div>
      {tab === "lab" && <div className="panel" style={{padding:24,marginBottom:24}}><h2>{(withTurkish({en:"A quieter way to explore",fr:"Une façon plus calme d’explorer",ru:"Более спокойное изучение"}))[locale]}</h2><p>{(withTurkish({en:"Try the new Atlas workspace. The original Lab remains below.",fr:"Essayez le nouvel espace Atlas. Le Lab d’origine reste ci-dessous.",ru:"Попробуйте новое пространство Атласа. Прежний Lab остаётся ниже."}))[locale]}</p><a className="primary" href="?atlas=1&studio=1">{(withTurkish({en:"Preview the new Learning Lab",fr:"Découvrir le nouveau Learning Lab",ru:"Открыть новый Learning Lab"}))[locale]} →</a></div>}
      {tab === "lab" && <div className="panel" style={{padding:24,marginBottom:24}}><h2>{(withTurkish({en:"Lab 02 · Follow the whole family",fr:"Lab 02 · Suivre toute la famille",ru:"Lab 02 · Всё семейство на карте"}))[locale]}</h2><p>{(withTurkish({en:"A connected map: parts, characters, words and sentences together.",fr:"Une carte reliée : composants, caractères, mots et phrases ensemble.",ru:"Связанная карта: части, знаки, слова и предложения вместе."}))[locale]}</p><a className="primary" href="?atlas=1&cloud=1">{(withTurkish({en:"Explore the cloud map",fr:"Explorer la carte en nuages",ru:"Открыть облачную карту"}))[locale]} →</a></div>}
      {tab === "lab" && <Suspense fallback={<p role="status">{labCopy.loading[locale]}</p>}><ConnectionLab owner={owner} penOnly={penOnly} setPenOnly={setPenOnly} notify={notify}/></Suspense>}
      {(tab === "explore" || tab === "compare") && (
        <div className="atlas-search-row">
          <label className="atlas-search">
            <Search size={17} />
            <input
              aria-label={t("Search Atlas")}
              placeholder={t("Character, pinyin, word or meaning…")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setTab("explore");
              }}
            />
          </label>
          <label className="atlas-component-select">
            {t("Follow a component")}
            <select
              value={activeComponent?.id ?? ""}
              onChange={(e) =>
                e.target.value &&
                navigate({ kind: "component", id: e.target.value })
              }
            >
              <option value="">{t("Choose a component")}</option>
              {atlasComponents
                .filter((c) => containing(c.id).length)
                .sort(
                  (a, b) => containing(b.id).length - containing(a.id).length,
                )
                .map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.glyph} · {c.label[locale]} · {containing(c.id).length}
                  </option>
                ))}
            </select>
          </label>
        </div>
      )}
      {tab === "explore" && (
        <>
          {!scope && !search ? (
            <>
              <section className="atlas-intro panel">
                <div>
                  <Cloud size={26} />
                  <h2>{t("One character opens another constellation.")}</h2>
                  <p>
                    {t(
                      "Follow a shared shape, a sound clue or a meaning. Every connection is labelled; a theme is not a shared component.",
                    )}
                  </p>
                  <div className="atlas-actions">
                    {["sun", "water", "qing", "heart", "wood"].map((id) => {
                      const c = componentById.get(id)!;
                      return (
                        <button
                          className="secondary"
                          key={id}
                          onClick={() => navigate({ kind: "component", id })}
                        >
                          <span lang="zh-Hans">{c.glyph}</span>
                          {c.label[locale]}
                          <ChevronRight size={14} />
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="atlas-intro-progress">
                  <strong>{practiced.size}/100</strong>
                  <span>{t("core characters practised")}</span>
                  <button
                    className="primary"
                    disabled={!progress.ready}
                    onClick={() => begin()}
                  >
                    {t("Start mixed recall")}
                    <ArrowRight size={16} />
                  </button>
                  {due.length > 0 && (
                    <button
                      className="text-button"
                      onClick={() => {
                        const tasks = due
                          .filter((v) => v.skill !== "writing")
                          .slice(0, 8) as Task[];
                        if (tasks.length) begin([], false, tasks);
                        else {
                          setSelected(due[0].targetId);
                          setWriting("recall");
                          setTab("writing");
                        }
                      }}
                    >
                      {t("Reviews due")} · {due.length}
                    </button>
                  )}
                </div>
              </section>
              <div className="atlas-group-grid">
                {groups.map((g) => (
                  <button
                    className="panel atlas-group-card"
                    key={g.id}
                    onClick={() => navigate({ kind: "group", id: g.id })}
                  >
                    <span className={"atlas-kind " + g.kind}>
                      {t(
                        g.kind === "phonetic"
                          ? "Sound family"
                          : g.kind === "semantic"
                            ? "Meaning component"
                            : g.kind === "structure"
                              ? "Structure & meaning"
                              : "Study theme",
                      )}
                    </span>
                    <strong>{g.title[locale]}</strong>
                    <span className="atlas-group-glyphs" lang="zh-Hans">
                      {g.characters.join(" ")}
                    </span>
                    <small>
                      {t("5 core characters")}
                      <ChevronRight size={14} />
                    </small>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="atlas-trail">
                <button className="text-button" onClick={() => navigate(null)}>
                  {t("All constellations")}
                </button>
                <ChevronRight size={14} />
                {trail.length > 0 && (
                  <button className="text-button" onClick={back}>
                    <ArrowLeft size={14} />
                    {t("Previous constellation")}
                  </button>
                )}
                <strong>
                  {search
                    ? t("Search results")
                    : activeComponent
                      ? activeComponent.glyph +
                        " · " +
                        activeComponent.label[locale]
                      : activeGroup?.title[locale]}
                </strong>
              </div>
              <section className="panel atlas-constellation">
                <div className="section-top">
                  <div>
                    <p className="eyebrow">
                      {activeComponent
                        ? t("INDEXED COMPONENT CONNECTIONS")
                        : t(
                            activeGroup?.kind === "theme"
                              ? "STUDY THEME"
                              : "CONSTELLATION",
                          )}
                    </p>
                    <h2>
                      {search
                        ? t("Search results")
                        : (activeComponent?.label[locale] ??
                          activeGroup?.title[locale])}
                    </h2>
                    <p>
                      {activeComponent
                        ? t(
                            "Every matching entry in this Atlas is listed below. Variants and reviewed nested components are included.",
                          )
                        : activeGroup?.note[locale]}
                    </p>
                  </div>
                  <span className="pill">
                    {results.length} {t("connections")}
                  </span>
                </div>
                {!search && (
                  <Constellation
                    rows={results}
                    center={
                      activeComponent?.glyph ??
                      (activeGroup &&
                        componentById.get(activeGroup.id)?.glyph) ??
                      activeGroup?.anchor ??
                      ""
                    }
                    onCenter={
                      !activeComponent &&
                      activeGroup &&
                      componentById.has(activeGroup.id)
                        ? () =>
                            navigate({ kind: "component", id: activeGroup.id })
                        : undefined
                    }
                    selected={selected}
                    onChoose={choose}
                  />
                )}
                <div
                  className="atlas-result-grid"
                  role="group"
                  aria-label={t("All matching characters")}
                >
                  {results.map((c) => (
                    <button
                      key={c.id}
                      className={selected === c.id ? "selected" : ""}
                      aria-pressed={selected === c.id}
                      onClick={() => choose(c)}
                    >
                      <strong lang="zh-Hans">{c.hanzi}</strong>
                      <span className="pinyin">{c.pinyin}</span>
                      <small>{c.meaning[locale]}</small>
                      {!coreIds.has(c.id) && <em>{t("Discovery")}</em>}
                    </button>
                  ))}
                </div>
                {!results.length && (
                  <p>{t("No Atlas entries match this search.")}</p>
                )}
                <p className="atlas-scope-note">
                  {t(
                    "Scope: 100 core targets + 6 discovery extensions. This is a curated learning index, not all Chinese characters or every possible stroke fragment.",
                  )}
                </p>
              </section>
              <section
                className="panel atlas-detail"
                aria-label={t("Character details")}
              >
                <div className="atlas-detail-glyph">
                  <AtlasGlyph
                    character={character}
                    component={activeComponent?.id}
                    showParts={parts}
                  />
                  <label>
                    <input
                      type="checkbox"
                      checked={parts}
                      onChange={(e) => setParts(e.target.checked)}
                    />
                    {t("Show component colours")}
                  </label>
                </div>
                <div>
                  <span className="eyebrow">
                    {coreIds.has(character.id)
                      ? t("Core target")
                      : t("Discovery extension")}
                  </span>
                  <h2>
                    <span lang="zh-Hans">{character.hanzi}</span>{" "}
                    <span className="pinyin">{character.pinyin}</span>
                  </h2>
                  <p className="atlas-meaning">{character.meaning[locale]}</p>
                  <p>{character.note[locale]}</p>
                  <div className="atlas-legend">
                    <span className="semantic">{t("Meaning clue")}</span>
                    <span className="phonetic">{t("Sound clue")}</span>
                    <span className="shape">{t("Selected shape")}</span>
                  </div>
                  <div className="atlas-word">
                    <strong lang="zh-Hans">{character.word}</strong>
                    <span className="pinyin">{character.wordPinyin}</span>
                    <p>{character.wordMeaning[locale]}</p>
                    <button
                      className="audio-button"
                      onClick={() => speak(item.sentence, notify, item)}
                    >
                      <Volume2 size={16} />
                      {t("Hear example word")}
                    </button>
                  </div>
                  <div className="atlas-actions">
                    <button className="primary" onClick={() => write()}>
                      {t("Practice writing")}
                      <ArrowRight size={16} />
                    </button>
                    <button
                      className="secondary"
                      disabled={!progress.ready}
                      onClick={() => void explore()}
                    >
                      <Eye size={16} />
                      {t("Mark explored")}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => {
                        setCompare([
                          selected,
                          selected === "u6e05" ? "u6674" : "u6e05",
                        ]);
                        setTab("compare");
                      }}
                    >
                      {t("Compare characters")}
                    </button>
                  </div>
                </div>
                <div className="atlas-bridges">
                  <AtlasWorkshop
                    onCharacter={(hanzi) => { const c = atlasCharacters.find(c => c.hanzi === hanzi); if (c) setSelected(c.id); }}
                    notify={notify}
                    character={character.hanzi}
                    onComponent={(id) => navigate({ kind: "component", id })}
                  />
                  <h3>{t("Follow another connection")}</h3>
                  <p>
                    {t(
                      "A component label is a shape name, not a pronunciation rule. Colours are learning clues, not origin stories.",
                    )}
                  </p>
                  <div className="atlas-actions">
                    {character.components.map((id) => {
                      const c = componentById.get(id)!;
                      return (
                        <button
                          className="secondary"
                          key={id}
                          onClick={() => navigate({ kind: "component", id })}
                        >
                          <span lang="zh-Hans">{c.glyph}</span>
                          {c.label[locale]}
                          <small>{containing(id).length}</small>
                          <ChevronRight size={14} />
                        </button>
                      );
                    })}
                  </div>
                  <h4>{t("Related constellations")}</h4>
                  <div className="atlas-actions">
                    {groupsFor(character).map((g) => (
                      <button
                        className="text-button"
                        key={g.id}
                        onClick={() => navigate({ kind: "group", id: g.id })}
                      >
                        {g.title[locale]}
                        <ChevronRight size={14} />
                      </button>
                    ))}
                    {!groupsFor(character).length && (
                      <span>
                        {t(
                          "Discovery extensions connect through their indexed components.",
                        )}
                      </span>
                    )}
                  </div>
                  {activeComponent && (
                    <>
                      <h4>{t("Constellations sharing this component")}</h4>
                      <div className="atlas-actions">
                        {groups
                          .filter((g) =>
                            g.characters.some((h) =>
                              containing(activeComponent.id).some(
                                (c) => c.hanzi === h,
                              ),
                            ),
                          )
                          .map((g) => (
                            <button
                              className="text-button"
                              key={g.id}
                              onClick={() =>
                                navigate({ kind: "group", id: g.id })
                              }
                            >
                              {g.title[locale]}
                              <ChevronRight size={14} />
                            </button>
                          ))}
                      </div>
                    </>
                  )}
                  {linkedWords(character, locale).length > 0 && (
                    <>
                      <h4>{t("Already in your HSK vocabulary")}</h4>
                      <div className="atlas-linked-words">
                        {linkedWords(character, locale).map((word) => (
                          <button key={word.id} onClick={() => onWord(word)}>
                            <strong lang="zh-Hans">{word.hanzi}</strong>
                            <span>
                              {word.pinyin} · {word.english}
                            </span>
                            <ChevronRight size={14} />
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                  <div className="atlas-skill-status">
                    {(
                      [
                        "meaning",
                        "sound",
                        "component",
                        "writing",
                      ] as AtlasSkill[]
                    ).map((skill) => (
                      <span key={skill}>
                        {t(
                          {
                            meaning: "Meaning in a word",
                            sound: "Listening",
                            component: "Components",
                            writing: "Writing",
                          }[skill],
                        )}
                        :{" "}
                        {cards[character.id + ":" + skill]
                          ? new Date(
                              cards[character.id + ":" + skill].due,
                            ).toLocaleDateString(locale)
                          : t("No independent recall yet")}
                      </span>
                    ))}
                  </div>
                  <button
                    className="secondary"
                    disabled={!progress.ready}
                    onClick={() =>
                      begin(
                        results.map((c) => c.id),
                        true,
                      )
                    }
                  >
                    {t("Guided practice in this constellation")}
                    <ArrowRight size={16} />
                  </button>
                </div>
              </section>
            </>
          )}
        </>
      )}
      {tab === "compare" && (
        <>
          <section className="panel atlas-compare">
            <h2>{t("Small differences, different characters.")}</h2>
            <p>
              {t(
                "Compare the written shape, then its actual tone and example word.",
              )}
            </p>
            <div className="atlas-actions">
              {[
                ["u6e05", "u6674"],
                ["u62b1", "u8dd1"],
                ["u6728", "u672c"],
                ["u65e5", "u53e3"],
              ].map((pair) => (
                <button
                  className="secondary"
                  key={pair.join()}
                  onClick={() => setCompare(pair)}
                >
                  {pair.map((id) => atlasById.get(id)!.hanzi).join(" / ")}
                </button>
              ))}
            </div>
            <div className="atlas-compare-grid">
              {compare.map((id, index) => {
                const c = atlasById.get(id)!;
                const word = atlasItem(c, locale);
                return (
                  <article key={index}>
                    <label>
                      {t(index === 0 ? "First character" : "Second character")}
                      <select
                        value={id}
                        onChange={(e) =>
                          setCompare((v) =>
                            v.map((old, i) =>
                              i === index ? e.target.value : old,
                            ),
                          )
                        }
                      >
                        {atlasCharacters.map((c) => (
                          <option value={c.id} key={c.id}>
                            {c.hanzi} · {c.pinyin} · {c.meaning[locale]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <AtlasGlyph character={c} />
                    <h3>
                      {c.hanzi} · {c.pinyin}
                    </h3>
                    <p>{c.meaning[locale]}</p>
                    <strong lang="zh-Hans">{c.word}</strong>
                    <p className="pinyin">{c.wordPinyin}</p>
                    <p>{c.wordMeaning[locale]}</p>
                    <div className="atlas-actions">
                      <button
                        className="audio-button"
                        onClick={() => speak(word.sentence, notify, word)}
                      >
                        <Volume2 size={16} />
                        {t("Hear example word")}
                      </button>
                      <button className="text-button" onClick={() => write(c)}>
                        {t("Practice writing")}
                      </button>
                    </div>
                    <div className="atlas-actions">
                      {c.components.map((id) => (
                        <button
                          className="text-button"
                          key={id}
                          onClick={() => navigate({ kind: "component", id })}
                        >
                          {componentById.get(id)!.glyph}
                          <ChevronRight size={13} />
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
            <p className="atlas-scope-note">
              {t(
                "Some characters share the same syllable and tone. Listening questions use full words so the answer can be distinguished.",
              )}
            </p>
          </section>
        </>
      )}
      {tab === "practice" &&
        (queue ? (
          <AtlasQuiz
            key={run}
            tasks={queue}
            guided={guided}
            ready={progress.ready}
            record={progress.record}
            notify={notify}
            onDone={() => {
              setQueue(null);
              setTab("explore");
            }}
          />
        ) : (
          <section className="panel atlas-practice-start">
            <h2>{t("Recall beyond the constellation.")}</h2>
            <p>
              {t(
                "Eight mixed activities: word meanings, listening and component recognition. Hints are recorded as assisted practice.",
              )}
            </p>
            <div className="atlas-actions">
              <button
                className="primary"
                disabled={!progress.ready}
                onClick={() => begin()}
              >
                {t("Start mixed recall")}
                <ArrowRight size={17} />
              </button>
              {due.some((d) => d.skill !== "writing") && (
                <button
                  className="secondary"
                  onClick={() =>
                    begin(
                      [],
                      false,
                      due
                        .filter((d) => d.skill !== "writing")
                        .slice(0, 8) as Task[],
                    )
                  }
                >
                  {t("Review due activities")} ·{" "}
                  {due.filter((d) => d.skill !== "writing").length}
                </button>
              )}
            </div>
            <p>
              {t(
                "Sound, meaning, components and handwriting have separate review schedules.",
              )}
            </p>
          </section>
        ))}
      {tab === "writing" && (
        <>
          <div className="atlas-writing-select">
            <label>
              {t("Choose an Atlas character")}
              <select
                value={selected}
                onChange={(e) => {
                  setSelected(e.target.value);
                  setWriting("animated");
                  url(scope, e.target.value);
                }}
              >
                {atlasCharacters.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.hanzi} · {c.pinyin} · {c.meaning[locale]}
                  </option>
                ))}
              </select>
            </label>
            <p>
              {t(
                "Audio uses the example word to preserve the selected reading. Atlas handwriting has its own history; whole-word HSK reviews remain separate.",
              )}
            </p>
          </div>
          <div className="atlas-writing-modes"><button aria-pressed={writing==='animated'} onClick={()=>setWriting('animated')}>{(withTurkish({en:'Animated writing',fr:'Écriture animée',ru:'Анимированное письмо'}))[locale]}</button><button aria-pressed={writing==='notebook'} onClick={()=>setWriting('notebook')}>{(withTurkish({en:'Notebook / PDF layout',fr:'Cahier / format PDF',ru:'Тетрадь / формат PDF'}))[locale]}</button></div>
          {writing === "animated" ? <div className="panel"><AtlasGuidedWriting key={selected} character={character.hanzi} penOnly={penOnly} onSave={()=>progress.record(newAtlasEvent(character.id,'writing','copy',0,true))}/></div> : writing === "notebook" ? (
            <Notebook
              key={selected}
              item={item}
              db={db}
              penOnly={penOnly}
              setPenOnly={setPenOnly}
              notify={notify}
              record={saveWriting}
              contextAudioOnly
              onRecall={() => setWriting("recall")}
              next={() => {
                setSelected(
                  atlasCharacters[
                    (atlasCharacters.findIndex((c) => c.id === selected) + 1) %
                      atlasCharacters.length
                  ].id,
                );
                setWriting("animated");
              }}
            />
          ) : (
            <AtlasRecall
              key={selected}
              character={character}
              db={db}
              penOnly={penOnly}
              notify={notify}
              record={progress.record}
              onBack={() => setWriting("animated")}
            />
          )}
        </>
      )}
      {tab === "listening" && <AtlasListening key={owner??"guest"} events={progress.events} ready={progress.ready} record={progress.record} notify={notify}/>}
      {tab === "materials" && (
        <section className="panel atlas-materials">
          <h2>{t("Your Atlas, connected to real practice.")}</h2>
          <p>
            {(withTurkish({tr:`Özgün İngilizce PDF, 20 grupta 100 hedef içerir. Uygulama ${atlasCharacters.length-coreIds.size} ek keşif, etkileşimli bağlantılar ve İngilizce, Fransızca, Rusça ve Türkçe çeviriler sunar.`,en:`The original English PDF contains 100 targets in 20 groups. The app adds ${atlasCharacters.length-coreIds.size} discovery extensions, interactive connections and translations in English, French and Russian.`,fr:`Le PDF original anglais contient 100 cibles en 20 groupes. L’application ajoute ${atlasCharacters.length-coreIds.size} découvertes, des liens interactifs et des traductions en anglais, français et russe.`,ru:`Исходный английский PDF содержит 100 целей в 20 группах. Приложение добавляет ${atlasCharacters.length-coreIds.size} дополнительных знаков, интерактивные связи и переводы на английский, французский и русский.`}))[locale]}
          </p>
          <div className="atlas-actions">
            <a
              className="secondary"
              href="/atlas/Hanzi_Connections_Atlas_v2_100_EN.pdf"
              download
            >
              <Download size={17} />
              {t("Original Atlas PDF · English")}
            </a>
            <button className="secondary" onClick={exportHistory}>
              <Download size={17} />
              {t("Export Atlas history")}
            </button>
          </div>
          <h3>{t("What a connection means")}</h3>
          <p>
            {t(
              "A sound family suggests a pronunciation connection; learn the actual syllable and tone. A meaning component is a clue, not a full definition. A study theme does not imply a shared shape.",
            )}
          </p>
          <p>
            {t(
              "Component searches include the reviewed shapes and variants in this dataset. Unreviewed fragments are not inferred automatically. Discovery extensions are not graded on component recognition.",
            )}
          </p>
          <p>
            {t(
              "Exploration and copying never advance independent recall. Guest history and ink drafts stay on this device; signed-in Atlas events sync with your account.",
            )}
          </p>
          <h3>{t("Sources and licences")}</h3>
          <p>Hanzi Connections Atlas v2 · Hanzi Writer · Make Me a Hanzi</p>
          <div className="atlas-actions">
            <a
              href="/licenses/hanzi-writer-data-ARPHICPL.TXT"
              target="_blank"
              rel="noreferrer"
            >
              Arphic Public License
            </a>
            <a
              href="/licenses/makemeahanzi-COPYING.txt"
              target="_blank"
              rel="noreferrer"
            >
              Make Me a Hanzi · COPYING
            </a>
            <a
              href="/licenses/makemeahanzi-dictionary-LGPL.txt"
              target="_blank"
              rel="noreferrer"
            >
              LGPL 3
            </a>
          </div>
        </section>
      )}
    </div>
  );
}
function Constellation({
  rows,
  center,
  selected,
  onChoose,
  onCenter,
}: {
  rows: AtlasCharacter[];
  center: string;
  selected: string;
  onChoose: (c: AtlasCharacter) => void;
  onCenter?: () => void;
}) {
  const { t, locale } = useI18n();
  const visible = rows.filter((c) => c.hanzi !== center).slice(0, 10);
  const points = visible.map((c, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / visible.length;
    return { c, x: 50 + 37 * Math.cos(angle), y: 50 + 35 * Math.sin(angle) };
  });
  return (
    <div className="atlas-cloud" aria-label={t("Constellation map")}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {points.map((p) => (
          <line key={p.c.id} x1="50" y1="50" x2={p.x} y2={p.y} />
        ))}
      </svg>
      <div className="atlas-cloud-center">
        {onCenter ? (
          <button
            className="atlas-center-action"
            onClick={onCenter}
            aria-label={t("Follow a component") + " " + center}
          >
            <strong lang="zh-Hans">{center}</strong>
            <small>{t("connection")}</small>
          </button>
        ) : (
          <>
            <strong lang="zh-Hans">{center}</strong>
            <small>{t("connection")}</small>
          </>
        )}
      </div>
      {points.map((p) => (
        <button
          key={p.c.id}
          style={{ left: p.x + "%", top: p.y + "%" }}
          className={selected === p.c.id ? "selected" : ""}
          aria-pressed={selected === p.c.id}
          onClick={() => onChoose(p.c)}
          aria-label={
            p.c.hanzi + " · " + p.c.pinyin + " · " + p.c.meaning[locale]
          }
        >
          <strong lang="zh-Hans">{p.c.hanzi}</strong>
          <small>{p.c.pinyin}</small>
        </button>
      ))}
      {rows.length > 11 && (
        <span className="atlas-cloud-overflow">
          {t("All results are listed below.")}
        </span>
      )}
    </div>
  );
}
function AtlasQuiz({
  tasks,
  guided,
  ready,
  record,
  notify,
  onDone,
}: {
  tasks: Task[];
  guided: boolean;
  ready: boolean;
  record: (e: AtlasEvent) => Promise<void>;
  notify: (m: string) => void;
  onDone: () => void;
}) {
  const { t, locale } = useI18n();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState(() => tasks.map(() => emptyAnswer()));
  const { picked, result, hint, played, retry } = answers[index];
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null);
  const suppressClick = useRef(false);
  const task = tasks[index];
  const c = atlasById.get(task.targetId)!;
  const q = useMemo(
    () => seededQuestion(task.targetId, task.skill, locale, index),
    [task.targetId, task.skill, locale, index],
  );
  const item = atlasItem(c, locale);
  const assisted = guided || hint || retry;
  const dictionaryHelp=useDictionaryAssistance(()=>update({hint:true}));
  const { score, independent, answered } = sessionTotals(answers);
  const missed = answers.filter((a) => a.result === false);
  function update(patch: Partial<ReturnType<typeof emptyAnswer>>) {
    setAnswers((all) =>
      all.map((a, i) => (i === index ? { ...a, ...patch } : a)),
    );
  }
  useEffect(() => {
    if (picked && !q.options.some((o) => o.id === picked))
      update({ picked: "" });
  }, [q]);
  function go(delta: number) {
    if (saving) return;
    const next = index + delta;
    if (next < 0 || next >= tasks.length) return;
    stopAudio();
    setIndex(next);
  }
  async function check() {
    if (!picked || saving || result !== null) return;
    const correct = picked === q.answer;
    setSaving(true);
    try {
      await record(
        newAtlasEvent(c.id, task.skill, "choice", correct ? 3 : 1, assisted),
      );
      update({
        result: correct,
        credited: answers[index].credited || correct,
        independent: answers[index].independent || (correct && !assisted),
      });
    } catch {
      notify(t("Could not save this review. Please try again."));
    } finally {
      setSaving(false);
    }
  }
  function next() {
    if (saving) return;
    if (index === tasks.length - 1) {
      stopAudio();
      setDone(true);
    } else go(1);
  }
  if (done)
    return (
      <section className="panel atlas-quiz-complete">
        <Check size={32} />
        <h2>{t("Practice session complete.")}</h2>
        <p>
          {score}/{tasks.length} {t("correct")}
        </p>
        <p>
          {independent} {t("correct without answer hints")}
        </p>
        <p>
          {answered}/{tasks.length} {t("answered")} · {tasks.length - answered}{" "}
          {t("unanswered")}
        </p>
        {answered < tasks.length && (
          <button
            className="secondary"
            onClick={() => {
              setIndex(answers.findIndex((a) => a.result === null));
              setDone(false);
            }}
          >
            {t("Return to unanswered activities")}
          </button>
        )}
        <p>
          {t(
            answered
              ? "Your answers are saved. Corrected or revealed answers remain assisted practice."
              : "No answers were recorded.",
          )}
        </p>
        {missed.length > 0 && (
          <p>{t("Return to mixed recall to revisit difficult activities.")}</p>
        )}
        <button className="primary" onClick={onDone}>
          {t("Back to Atlas")}
          <ArrowRight size={16} />
        </button>
      </section>
    );
  return (
    <section
      ref={dictionaryHelp} data-study-assessment={result!==null?"complete":"supported"}
      className="panel atlas-quiz"
      aria-label={t("Atlas practice session")}
      onPointerDown={(e) => {
        suppressClick.current = false;
        if (e.pointerType === "touch") {
          if (e.isPrimary)
            gesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          else gesture.current = null;
        }
      }}
      onPointerMove={(e) => {
        const g = gesture.current;
        if (
          g &&
          g.id === e.pointerId &&
          swipeStep(g.x, g.y, e.clientX, e.clientY) !== 0
        )
          e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        gesture.current = null;
      }}
      onPointerUp={(e) => {
        const g = gesture.current;
        gesture.current = null;
        if (!g || g.id !== e.pointerId) return;
        const delta = swipeStep(g.x, g.y, e.clientX, e.clientY);
        if (delta) {
          suppressClick.current = true;
          go(delta);
        }
      }}
      onClickCapture={(e) => {
        if (suppressClick.current) {
          e.preventDefault();
          e.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      <div className="section-top">
        <span className="eyebrow">
          {t(guided ? "GUIDED CONSTELLATION PRACTICE" : "MIXED RECALL")}
        </span>
        <span>
          {index + 1}/{tasks.length}
        </span>
      </div>
      <div
        className="atlas-session-nav"
        role="group"
        aria-label={t("Practice navigation")}
      >
        <button
          className="secondary"
          aria-label={t("Previous activity")}
          disabled={index === 0 || saving}
          onClick={() => go(-1)}
        >
          <ArrowLeft size={18} />
          <span>{t("Previous")}</span>
        </button>
        <span>
          {answered}/{tasks.length} {t("answered")}
        </span>
        <button
          className="secondary"
          aria-label={t("Next activity")}
          disabled={index === tasks.length - 1 || saving}
          onClick={() => go(1)}
        >
          <span>{t("Next")}</span>
          <ArrowRight size={18} />
        </button>
      </div>
      <p className="atlas-swipe-note">
        {t(
          "Swipe left or right to browse. Skipping does not record an answer.",
        )}
      </p>
      <h2>{t(q.prompt)}</h2>
      {task.skill === "sound" ? (
        <button
          className="primary atlas-listen"
          onClick={() => {
            update({ played: true });
            speak(item.sentence, notify, item);
          }}
        >
          <Volume2 size={24} />
          {t("Play Chinese word")}
        </button>
      ) : task.skill === "component" ? (
        <div className="atlas-question-glyph">
          <AtlasGlyph character={c} showParts={false} />
        </div>
      ) : (
        <div className="atlas-question-word" lang="zh-Hans">
          {c.word}
        </div>
      )}
      <div className="atlas-quiz-options">
        {q.options.map((o) => (
          <button
            key={o.id}
            disabled={saving || result !== null}
            aria-pressed={picked === o.id}
            className={picked === o.id ? "selected" : ""}
            onClick={() => update({ picked: o.id })}
          >
            {o.label}
          </button>
        ))}
      </div>
      <div className="atlas-actions">
        {result === null ? (
          <>
            <button
              className="primary"
              disabled={
                !ready ||
                !picked ||
                saving ||
                (task.skill === "sound" && !played)
              }
              onClick={() => void check()}
            >
              {t(saving ? "Saving…" : "Check answer")}
              <Check size={16} />
            </button>
            <button
              className="text-button"
              disabled={saving}
              onClick={() => update({ hint: true })}
            >
              {t("Show answer hint")}
            </button>
          </>
        ) : index === tasks.length - 1 ? (
          <button className="primary" onClick={next}>
            {t(
              index === tasks.length - 1 ? "Finish practice" : "Next activity",
            )}
            <ArrowRight size={16} />
          </button>
        ) : null}
        {index === tasks.length - 1 && result === null && (
          <button className="secondary" disabled={saving} onClick={next}>
            {t("Finish practice")}
          </button>
        )}
      </div>
      {task.skill === "sound" && !played && result === null && (
        <p>{t("Play the audio before checking your answer.")}</p>
      )}
      {(hint || result !== null) && (
        <div
          className={"atlas-answer " + (result === true ? "correct" : "")}
          role="status"
        >
          <strong>
            {t(
              result === null
                ? "Answer hint"
                : result
                  ? "Correct."
                  : "Not yet. Compare the explanation.",
            )}
          </strong>
          <p>{q.options.find((o) => o.id === q.answer)!.label}</p>
          <p lang="zh-Hans">
            {c.hanzi} · {c.word}
          </p>
          <p className="pinyin">
            {c.pinyin} · {c.wordPinyin}
          </p>
          <p>
            {c.meaning[locale]} · {c.wordMeaning[locale]}
          </p>
          {result === false && (
            <button
              className="secondary"
              onClick={() => {
                update({ result: null, picked: "", hint: true, retry: true });
              }}
            >
              {t("Try again with help")}
            </button>
          )}
        </div>
      )}
      {assisted && (
        <p className="atlas-scope-note">
          {t(
            "Answer help used. This attempt saves practice without advancing independent recall.",
          )}
        </p>
      )}
    </section>
  );
}
