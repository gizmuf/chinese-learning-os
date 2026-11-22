'use client';

import {useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode} from 'react';
import source from '../data/atlas-assembly-strokes.json';
import {loadGlyph} from './atlas-cloud-highlight';
import {assemblyStrokeGroups, isAssemblyGlyph, type AssemblyCharacter, type AssemblyPart} from './atlas-assembly-model';

const mappings: Record<string, {ids: string; paths: string[]}> = source.mappings;

function useOutline(character: AssemblyCharacter) {
  const {data, parts} = character;
  const hanzi = data.hanzi;
  const [loaded, setLoaded] = useState<{hanzi: string; strokes: string[]}>();
  useEffect(() => {
    let active = true;
    void loadGlyph(hanzi).then(value => {
      if (active) setLoaded(value ? {hanzi, strokes: value.strokes} : undefined);
    });
    return () => { active = false; };
  }, [hanzi]);

  const strokes = loaded?.hanzi === hanzi ? loaded.strokes : undefined;
  const groups = useMemo(() => strokes && assemblyStrokeGroups(parts, data.decomposition, mappings[hanzi], strokes.length),
    [data.decomposition, parts, hanzi, strokes]);
  return {strokes, groups};
}

function separation(part: AssemblyPart, index: number) {
  const {x, y, w, h} = part.box;
  if (part.positions[0] === 'around') return [-95, -34];
  if (part.positions[0] === 'inside') return [120, 37];
  if (part.positions[0] === 'overlapping') return [index === 0 ? -125 : 125, index === 0 ? -50 : 50];
  return [(x + w / 2 - .5) * 420, (y + h / 2 - .5) * 420];
}

function Ink({character, strokes, groups, active, split = false, onPart}: {
  character: AssemblyCharacter;
  strokes: string[];
  groups?: number[][];
  active: (part: AssemblyPart) => boolean;
  split?: boolean;
  onPart?: (glyph: string) => void;
}) {
  return <svg viewBox={onPart ? '-116 -116 1256 1256' : '0 0 1024 1024'} aria-hidden="true" focusable="false" className="ab-ink">
    {groups ? character.parts.map((part, index) => {
      const [x, y] = split ? separation(part, index) : [0, 0];
      return <g key={part.id} className="ab-ink-part" data-part={part.glyph} data-active={active(part)}
        style={{transform: `translate(${x}px, ${y}px)`}}
        onClick={onPart ? () => onPart(part.glyph) : undefined}>
        <g transform="translate(0 900) scale(1 -1)">
          {groups[index].map(stroke => <path key={stroke} d={strokes[stroke]}/>)}
        </g>
      </g>;
    }) : <g transform="translate(0 900) scale(1 -1)">{strokes.map((path, index) => <path key={index} d={path}/>)}</g>}
  </svg>;
}

export function AssemblyThumbnail({character, active}: {
  character: AssemblyCharacter; active: (part: AssemblyPart) => boolean;
}) {
  const {strokes, groups} = useOutline(character);
  return <span className="ab-thumbnail ab-hanzi" lang="zh-Hans">
    <span className={strokes ? 'ab-visually-hidden' : undefined}>{character.data.hanzi}</span>
    {strokes && <Ink character={character} strokes={strokes} groups={groups} active={active}/>}
  </span>;
}

type Point = {x: number; y: number};
type StartGesture = {pointerId: number; origin: Point; distance?: number; used: boolean};

function GesturePad({children, onSplit, split}: {children: ReactNode; split: boolean; onSplit: (value: boolean) => void}) {
  const points = useRef(new Map<number, Point>());
  const start = useRef<StartGesture | undefined>(undefined);
  const lastMove = useRef(0);
  const distance = () => {
    const [first, second] = points.current.values();
    return first && second ? Math.hypot(first.x - second.x, first.y - second.y) : undefined;
  };
  function begin(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target as Element).closest('button')) return;
    const origin = {x: event.clientX, y: event.clientY};
    points.current.set(event.pointerId, origin);
    if (points.current.size === 1) start.current = {pointerId: event.pointerId, origin, used: false};
    if (points.current.size === 2 && start.current) start.current.distance = distance();
    // Capture on the actual stroke when possible so a tap still reaches that part.
    const target = event.target as Element;
    try { target.setPointerCapture(event.pointerId); } catch { /* The browser may have cancelled the press. */ }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const gesture = start.current;
    if (!gesture || !points.current.has(event.pointerId)) return;
    points.current.set(event.pointerId, {x: event.clientX, y: event.clientY});
    if (gesture.used) return;
    const currentDistance = distance();
    if (currentDistance !== undefined && gesture.distance !== undefined) {
      const delta = currentDistance - gesture.distance;
      if (Math.abs(delta) < 24) return;
      onSplit(delta > 0);
    } else {
      if (event.pointerId !== gesture.pointerId || gesture.distance !== undefined) return;
      const dx = event.clientX - gesture.origin.x;
      const dy = event.clientY - gesture.origin.y;
      if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy) * 1.4) return;
      onSplit(!split);
    }
    gesture.used = true;
    lastMove.current = performance.now();
  }
  function end(event: PointerEvent<HTMLDivElement>) {
    points.current.delete(event.pointerId);
    if (start.current?.used) lastMove.current = performance.now();
    if (!points.current.size) start.current = undefined;
  }

  return <div className="ab-gesture-pad" onPointerDown={begin} onPointerMove={move} onPointerUp={end}
    onPointerCancel={end} onLostPointerCapture={end} onClickCapture={event => {
      if (lastMove.current && performance.now() - lastMove.current < 300 && event.detail) {
        event.stopPropagation();
        event.preventDefault();
      }
    }}>{children}</div>;
}

export function AssemblyDrawing({character, selected, split, onSplit, onPart}: {
  character: AssemblyCharacter; selected: string; split: boolean;
  onSplit: (split: boolean) => void; onPart: (glyph: string) => void;
}) {
  const {strokes, groups} = useOutline(character);
  const diagram = split && character.parts.length > 0 && !groups;
  const hanzi = character.data.hanzi;
  return <div className="ab-drawing" data-split={split} data-art={diagram ? 'diagram' : groups ? 'mapped' : 'whole'}>
    <GesturePad split={split} onSplit={next => { if (character.parts.length) onSplit(next); }}>
      {diagram ? <div className="ab-diagram" aria-label={hanzi + ' component positions'}>
        {character.parts.map(part => {
          const {x, y, w, h} = part.box;
          const style = {
            left: x * 100 + '%', top: y * 100 + '%', width: w * 100 + '%', height: h * 100 + '%',
            '--ab-diagram-scale': Math.min(w, h),
          } as CSSProperties;
          return isAssemblyGlyph(part.glyph)
            ? <button type="button" key={part.id} lang="zh-Hans" className="ab-hanzi" data-active={selected === part.glyph}
                aria-label={'Pin ' + part.glyph + ' · ' + part.positions[0]} style={style} onClick={() => onPart(part.glyph)}>{part.glyph}</button>
            : <span key={part.id} style={style} className="ab-diagram-unknown">?</span>;
        })}
      </div> : <div className="ab-art ab-hanzi" role="img" lang="zh-Hans" aria-label={hanzi}>
        {strokes ? <Ink character={character} strokes={strokes} groups={groups} active={part => part.glyph === selected}
          split={split} onPart={onPart}/> : <span aria-hidden="true">{hanzi}</span>}
      </div>}
    </GesturePad>
    {diagram && <p className="ab-drawing-note">Position diagram · exact stroke separation unavailable</p>}
  </div>;
}
