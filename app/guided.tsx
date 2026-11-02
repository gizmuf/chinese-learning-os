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
  onAvailabilityChange,
}: {
  character: string;
  mode: "watch" | "trace";
  penOnly: boolean;
  replay: number;
  onComplete: () => void;
  onMistake: () => void;
  onAvailabilityChange?: (available:boolean) => void;
}) {
  const { t, locale } = useI18n();
  const host = useRef<HTMLDivElement>(null);
  const penPreference=useRef(penOnly);penPreference.current=penOnly;
  const callbacks = useRef({ onComplete, onMistake, onAvailabilityChange });
  callbacks.current = { onComplete, onMistake, onAvailabilityChange };
  const [error, setError] = useState(false),[retry,setRetry]=useState(0);
  useEffect(() => {
    const node = host.current!;
    let cancelled = false,loaded=false;
    callbacks.current.onAvailabilityChange?.(false);
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
        const read=async(url:string):Promise<CharacterJson>=>{
          const response=await fetch(url,{cache:'force-cache'});
          if(!response.ok)throw Error('Missing character data');
          const data=await response.json() as CharacterJson;
          if(!Array.isArray(data.strokes)||!data.strokes.length||data.strokes.length>100||!data.strokes.every(stroke=>typeof stroke==='string')||!Array.isArray(data.medians)||data.strokes.length!==data.medians.length)throw Error('Invalid character data');
          return data;
        };
        // Some static routing failures return an empty 200 instead of a 404.
        // Only validated stroke data can unlock practice; retry the existing API once.
        let data:CharacterJson;
        try{data=await read('/characters/'+encodeURIComponent(char)+'.json');}
        catch{data=await read('/api/character-data?'+new URLSearchParams({character:char}));}
        if(!cancelled){loaded=true;callbacks.current.onAvailabilityChange?.(true);}
        return data;
      },
      onLoadCharDataError: () => {loaded=false;if(!cancelled){setError(true);callbacks.current.onAvailabilityChange?.(false);}},
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
          if (!cancelled&&loaded) callbacks.current.onComplete();
        })
        .catch(() => {
          if (!cancelled){loaded=false;setError(true);callbacks.current.onAvailabilityChange?.(false);}
        });
    else
      writer.quiz({
        onMistake: () => {if(!cancelled&&loaded)callbacks.current.onMistake();},
        onComplete: () => {if(!cancelled&&loaded)callbacks.current.onComplete();},
      });
    return () => {
      cancelled = true;
      resize.disconnect();
      writer?.cancelQuiz();
      pointerTarget?.dispose();
      node.replaceChildren();
    };
  }, [character, mode, replay,retry]);
  return (
    <>
      <div
        className="guided-host"
        ref={host}
        onContextMenu={e=>e.preventDefault()}
      />
      {error && (
        <div className="canvas-notice">
          {t("Character data unavailable. Reconnect and retry.")}<button type="button" className="secondary" onClick={()=>setRetry(value=>value+1)}>Retry character data</button></div>
      )}
    </>
  );
}
