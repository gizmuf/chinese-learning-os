"use client";
import { useEffect, useState } from "react";
import { useI18n } from "./i18n";
import type { AtlasCharacter } from "./atlas-data";
import {useHanziStyle} from './hanzi-style';
type Structure = { mappings: Record<string, Record<string, number[]>> };
type Data = { strokes: string[] };
let mappingPromise: Promise<Structure> | null = null;
function structure() {
  if (!mappingPromise)
    mappingPromise = fetch("/atlas/component-strokes.json")
      .then((r) => {
        if (!r.ok) throw Error("structure");
        return r.json() as Promise<Structure>;
      })
      .catch((error) => {
        mappingPromise = null;
        throw error;
      });
  return mappingPromise;
}
export default function AtlasGlyph({
  character,
  component,
  showParts = true,
}: {
  character: AtlasCharacter;
  component?: string;
  showParts?: boolean;
}) {
  const { t } = useI18n();
  const appearance=useHanziStyle();
  const [state, setState] = useState<{
    data: Data;
    mapping: Record<string, number[]>;
  } | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setState(null);
    setError(false);
    Promise.all([
      fetch("/characters/" + encodeURIComponent(character.hanzi) + ".json", {
        signal: controller.signal,
      }).then((r) => {
        if (!r.ok) throw Error("glyph");
        return r.json() as Promise<Data>;
      }),
      structure(),
    ])
      .then(([data, m]) => {
        if (active) setState({ data, mapping: m.mappings[character.id] ?? {} });
      })
      .catch((e) => {
        if (active && e.name !== "AbortError") setError(true);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [character.id, character.hanzi, retry]);
  if (appearance.style==='print') return <div className="atlas-glyph-fallback"><span lang="zh-Hans">{character.hanzi}</span></div>;
  if (!state)
    return (
      <div className="atlas-glyph-fallback">
        <span lang="zh-Hans">{character.hanzi}</span>
        {error && (
          <button
            className="text-button"
            onClick={() => setRetry((v) => v + 1)}
          >
            {t("Retry character data")}
          </button>
        )}
      </div>
    );
  const selected = component ? new Set(state.mapping[component] ?? []) : null;
  const semantic = new Set(state.mapping[character.semantic ?? ""] ?? []);
  const phonetic = new Set(state.mapping[character.phonetic ?? ""] ?? []);
  function color(index: number) {
    if (!showParts||!appearance.highlight) return "var(--ink)";
    if (selected)
      return selected.has(index)
        ? "var(--atlas-shape)"
        : "var(--atlas-muted-stroke)";
    if (semantic.has(index)) return "var(--atlas-semantic)";
    if (phonetic.has(index)) return "var(--atlas-phonetic)";
    return "var(--ink)";
  }
  return (
    <div className="atlas-glyph-wrap">
      <svg
        viewBox="0 0 1024 1024"
        className="atlas-glyph"
        role="img"
        aria-label={character.hanzi}
      >
        <g transform="scale(1,-1) translate(0,-900)">
          {state.data.strokes.map((d, i) => (
            <path key={i} d={d} style={{ fill: color(i) }} />
          ))}
        </g>
      </svg>
      {showParts && component && !selected?.size && (
        <small>{t("Connection indexed; full shape shown.")}</small>
      )}
    </div>
  );
}
