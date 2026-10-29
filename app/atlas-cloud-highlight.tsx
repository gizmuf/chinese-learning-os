'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { cloudHighlightAvailability, cloudHighlightStrokes } from './atlas-cloud-connections';
import {useHanziStyle} from './hanzi-style';

type GlyphData = { strokes: string[] };
const glyphRequests = new Map<string, Promise<GlyphData | null>>();

function loadGlyph(hanzi: string): Promise<GlyphData | null> {
  const cached = glyphRequests.get(hanzi);
  if (cached) return cached;
  const request = fetch('/characters/' + encodeURIComponent(hanzi) + '.json')
    .then(async response => {
      if (!response.ok) throw Error('Character data unavailable');
      const value: unknown = await response.json();
      const strokes = value && typeof value === 'object' && 'strokes' in value ? value.strokes : null;
      if (!Array.isArray(strokes) || !strokes.length || !strokes.every(path => typeof path === 'string' && path.trim().length > 0)) throw Error('Invalid character data');
      return { strokes: strokes as string[] };
    })
    .catch(() => {
      // A later mount can retry a failed fetch; consumers never display a guessed shape.
      glyphRequests.delete(hanzi);
      return null;
    });
  glyphRequests.set(hanzi, request);
  return request;
}

function fallbackFont(hanzi: string): CSSProperties | undefined {
  const point = hanzi.codePointAt(0)!;
  return point >= 0xe000 && point <= 0xf8ff || point > 0xffff || point >= 0x2e80 && point <= 0x2fff || point >= 0x31c0 && point <= 0x31ef || point >= 0x3400 && point <= 0x4dbf
    ? { fontFamily: 'ChineseOSNamedShapes,ChineseOSStructureShapes,serif' }
    : undefined;
}

function Character({ hanzi, component }: { hanzi: string; component?: string }) {
  const {style,highlight}=useHanziStyle();
  const availability = cloudHighlightAvailability(hanzi, component);
  const [loaded, setLoaded] = useState<{ hanzi: string; data: GlyphData | null } | null>(null);
  useEffect(() => {
    let active = true;
    if (style !== 'strokes') return;
    // Requests are shared by nodes/focus/word chunks. Do not abort another consumer's
    // request on unmount; the guard prevents stale updates after navigation/unmount.
    void loadGlyph(hanzi).then(data => { if (active) setLoaded({ hanzi, data }); });
    return () => { active = false; };
  }, [hanzi, style]);

  const data = loaded?.hanzi === hanzi ? loaded.data : null;
  const selected = data && availability === 'mapped' ? cloudHighlightStrokes(hanzi, component, data.strokes.length) : null;
  if (style==='print') return <span aria-hidden="true" data-cloud-highlight="none" data-hanzi-render="print" style={fallbackFont(hanzi)}>{hanzi}</span>;
  if (!data) return <span aria-hidden="true" data-cloud-highlight={availability==='whole'&&highlight?'whole':'none'} data-hanzi-render="stroke-font" style={{...fallbackFont(hanzi),...(availability==='whole'&&highlight?{color:'var(--cloud-shared,#b4423c)'}:{})}}>{hanzi}</span>;
  const indices = new Set(highlight?(availability==='whole'?data.strokes.map((_,i)=>i):selected??[]):[]);
  return <svg aria-hidden="true" focusable="false" viewBox="0 0 1024 1024" data-cloud-highlight={indices.size?'strokes':'none'} data-hanzi-render="stroke-svg" style={{ display: 'inline-block', width: '1em', height: '1em', verticalAlign: '-0.12em', flex: '0 0 1em' }}>
    <g transform="scale(1,-1) translate(0,-900)">
      {data.strokes.map((path, index) => <path key={index} d={path} style={{ fill: indices.has(index) ? 'var(--cloud-shared,#b4423c)' : 'currentColor' }} />)}
    </g>
  </svg>;
}

/** Inline, non-interactive content suitable inside an existing button or word chunk. */
export function CloudHighlight({ hanzi, component, className }: { hanzi: string; component?: string; className?: string }) {
  return <span className={className} role="img" aria-label={hanzi} lang="zh-Hans" style={{ display: 'inline-flex', alignItems: 'baseline', lineHeight: 1 }}>
    {Array.from(hanzi).map((character, index) => <Character key={index + ':' + character} hanzi={character} component={component} />)}
  </span>;
}

export default CloudHighlight;
