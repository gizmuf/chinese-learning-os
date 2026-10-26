"use client";
import { useI18n } from "./i18n";
import { useEffect, useRef, useState } from "react";
import { WritingSvgTarget } from "./writing-pointer";
import HanziWriter, { type CharacterJson } from "hanzi-writer";
export default function Guided({
  character,
  mode,
  penOnly,
  replay,
  onComplete,
  onMistake,
}: {
  character: string;
  mode: "watch" | "trace";
  penOnly: boolean;
  replay: number;
  onComplete: () => void;
  onMistake: () => void;
}) {
  const { t, locale } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const penPreference=useRef(penOnly);penPreference.current=penOnly;
  const callbacks = useRef({ onComplete, onMistake });
  callbacks.current = { onComplete, onMistake };
  const [error, setError] = useState(false);
  useEffect(() => {
    const node = host.current!;
    let cancelled = false;
    let writer: HanziWriter | undefined;
    let pointerTarget:WritingSvgTarget|undefined;
    setError(false);
    node.replaceChildren();
    const size = node.getBoundingClientRect().width;
    writer = HanziWriter.create(node, character, {
      rendererOverride:{createRenderTarget:()=>pointerTarget=WritingSvgTarget.create(node,()=>penPreference.current,size,size)},
      width: size,
      height: size,
      padding: 28,
      showCharacter: false,
      showOutline: mode === "trace",
      strokeColor: "#315f50",
      outlineColor: "#dbe2d7",
      highlightColor: "#cc734b",
      drawingColor: "#315f50",
      drawingWidth: 5,
      strokeAnimationSpeed: 0.7,
      delayBetweenStrokes: 160,
      charDataLoader: async (char): Promise<CharacterJson> => {
        const r = await fetch(
          "/characters/" + encodeURIComponent(char) + ".json",
          { cache: "force-cache" },
        );
        if (!r.ok) throw Error("Missing character data");
        return (await r.json()) as CharacterJson;
      },
      onLoadCharDataError: () => setError(true),
    });
    const resize = new ResizeObserver(() => {
      const width = node.getBoundingClientRect().width;
      if (width > 0)
        writer?.updateDimensions({ width, height: width, padding: 28 });
    });
    resize.observe(node);
    if (mode === "watch")
      writer
        .animateCharacter()
        .then(() => {
          if (!cancelled) callbacks.current.onComplete();
        })
        .catch(() => {
          if (!cancelled) setError(true);
        });
    else
      writer.quiz({
        onMistake: () => callbacks.current.onMistake(),
        onComplete: () => callbacks.current.onComplete(),
      });
    return () => {
      cancelled = true;
      resize.disconnect();
      writer?.cancelQuiz();
      pointerTarget?.dispose();
      node.replaceChildren();
    };
  }, [character, mode, replay]);
  return (
    <>
      <div
        className="guided-host"
        ref={host}
        onContextMenu={e=>e.preventDefault()}
      />
      {error && (
        <div className="canvas-notice">
          {t("Character data unavailable. Reconnect and retry.")}</div>
      )}
    </>
  );
}
