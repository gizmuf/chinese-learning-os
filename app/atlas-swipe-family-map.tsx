'use client';

import {useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight, X} from 'lucide-react';
import {SwipeArtwork} from './atlas-swipe-art';
import type {SwipeDirection, SwipeFrame} from './atlas-swipe-model';

const fullTurn = 2 * Math.PI;

type Ring = {x: number; y: number; capacity: number};
type Drag = {id: number; x: number; y: number; angle: number; moved: boolean};

function ringsFor(count: number, compact: boolean): Ring[] {
  if (count <= 10) return [{x: .334, y: compact ? .295 : .319, capacity: count}];
  if (count <= 32) return [
    {x: .268, y: .203, capacity: 12},
    {x: .413, y: compact ? .298 : .36, capacity: 20},
  ];
  return [
    {x: .225, y: .195, capacity: 10},
    {x: .322, y: .277, capacity: 16},
    {x: .424, y: .367, capacity: 24},
  ];
}

function placeFamily(frames: SwipeFrame[], angle: number, compact: boolean) {
  const rings = ringsFor(frames.length, compact);
  if (!frames.length) return {rings: [], points: []};
  const capacity = rings.reduce((count, ring) => count + ring.capacity, 0);
  let start = 0;
  return {rings, points: rings.flatMap((ring, ringIndex) => {
    const count = ringIndex === rings.length - 1 ? frames.length - start
      : Math.round(frames.length * ring.capacity / capacity);
    const batch = frames.slice(start, start + count);
    start += count;
    return batch.map((frame, index) => {
      const theta = -Math.PI / 2 + fullTurn * ((index + (ringIndex ? .5 : 0)) / count) + angle;
      const x = Math.cos(theta), y = Math.sin(theta);
      const direction: SwipeDirection = Math.abs(x) >= Math.abs(y)
        ? x < 0 ? 'left' : 'right'
        : y < 0 ? 'up' : 'down';
      const style = {
        left: (50 + x * ring.x * 100) + '%',
        top: (50 + y * ring.y * 100) + '%',
        '--as-map-depth': .95 + y * .05,
      } as CSSProperties;
      return {frame, style, direction};
    });
  })};
}

export function SwipeFamilyMap({anchor, frames, current, origin, pinyin, english, choose, close, restore, widen}: {
  anchor: string;
  frames: SwipeFrame[];
  current: string;
  origin?: string;
  pinyin: boolean;
  english: boolean;
  choose: (target: SwipeFrame, direction: SwipeDirection) => void;
  close: () => void;
  restore: () => void;
  widen?: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const drag = useRef<Drag | undefined>(undefined);
  const ignoreClick = useRef(false);
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [page, setPage] = useState(0);
  const [size, setSize] = useState({width: 0, height: 0});

  useLayoutEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => setSize({width: element.clientWidth, height: element.clientHeight});
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const compact = size.width < 530 || size.height < 385;
  const limit = size.width >= 740 && size.height >= 490 ? 50 : compact ? 20 : 32;
  const pages = Math.max(1, Math.ceil(frames.length / limit));
  const actual = Math.min(page, pages - 1);
  const offset = actual * limit;
  const range = frames.slice(offset, offset + limit);
  const {points, rings} = placeFamily(range, angle, compact);

  function movePage(direction: number) {
    const next = actual + direction;
    if (next < 0 || next >= pages) return;
    setPage(next);
    setAngle(0);
  }

  function pointerDown(event: PointerEvent<HTMLElement>) {
    const target = event.target as Element;
    if (!event.isPrimary || event.button !== 0 || target.closest('[data-orbit-controls]')) return;
    ignoreClick.current = false;
    drag.current = {id: event.pointerId, x: event.clientX, y: event.clientY, angle, moved: false};
    (target.closest('button[data-orbit-member]') ?? event.currentTarget).setPointerCapture(event.pointerId);
  }

  function pointerMove(event: PointerEvent<HTMLElement>) {
    const touch = drag.current;
    if (!touch || touch.id !== event.pointerId) return;
    const dx = event.clientX - touch.x;
    const dy = event.clientY - touch.y;
    if (!touch.moved && Math.hypot(dx, dy) < 9) return;
    touch.moved = true;
    ignoreClick.current = true;
    setDragging(true);
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setAngle(touch.angle + (Math.abs(dx) >= Math.abs(dy) ? dx : dy) * .006);
    }
  }

  function pointerEnd(event: PointerEvent<HTMLElement>, cancelled = false) {
    const touch = drag.current;
    if (!touch || touch.id !== event.pointerId) return;
    drag.current = undefined;
    setDragging(false);
    if (cancelled || !touch.moved) return;
    const dx = event.clientX - touch.x, dy = event.clientY - touch.y;
    const distance = Math.abs(dx) >= Math.abs(dy) ? dx : dy;
    if (Math.abs(distance) > 74) movePage(distance < 0 ? 1 : -1);
  }

  function clickCapture(event: MouseEvent<HTMLElement>) {
    if (!event.detail || !ignoreClick.current) return;
    ignoreClick.current = false;
    event.stopPropagation();
    event.preventDefault();
  }

  return <section ref={root} className="as-orbit" aria-label={'Family map for ' + anchor} data-swipe-control
    data-dragging={dragging || undefined} data-dense={range.length > 28 || undefined}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd}
    onPointerCancel={event => pointerEnd(event, true)} onLostPointerCapture={event => pointerEnd(event, true)}
    onClickCapture={clickCapture}>
    {rings.map(({x, y}, ringIndex) => <div aria-hidden="true" key={ringIndex} className="as-orbit-ring"
      style={{width: x * 200 + '%', height: y * 200 + '%'}}/>)}
    <header className="as-orbit-head" data-orbit-controls>
      <div className="as-orbit-title">
        <strong lang="zh-Hans">{anchor}</strong>
        <span>{frames.length} {frames.length === 1 ? 'character' : 'characters'}</span>
      </div>
      <div className="as-orbit-actions">
        {origin && <button type="button" aria-label={'Return to ' + origin} onClick={restore}>
          <ArrowLeft size={18}/><span lang="zh-Hans">{origin}</span>
        </button>}
        <button type="button" aria-label="Close family map" onClick={close}><X size={19}/></button>
      </div>
    </header>
    {points.map(({frame, style, direction}) => {
      const centred = frame.id === current;
      return <button type="button" key={frame.id} className="as-orbit-node"
        data-orbit-member={frame.text} aria-current={centred || undefined} aria-disabled={centred || undefined}
        aria-label={centred ? frame.text + ' · currently centred'
          : ['Open ' + frame.text, pinyin && frame.pinyin, english && frame.meaning, frame.character?.part?.positions[0]]
            .filter(Boolean).join(' · ')}
        style={style} onClick={() => { if (!centred) choose(frame, direction); }}>
        {centred ? <i aria-hidden="true"/> : <>
          {range.length <= 8
            ? <span className="as-orbit-ink" aria-hidden="true"><SwipeArtwork frame={frame}/></span>
            : <strong lang="zh-Hans">{frame.text}</strong>}
          {pinyin && <span>{range.length <= 8 ? frame.pinyin : frame.pinyin.split(' / ')[0]}</span>}
          {english && range.length <= 8 && <small>{frame.meaning.split(/[;,]/u)[0]}</small>}
        </>}
      </button>;
    })}
    {frames.length === 0 && <div className="as-orbit-empty" data-orbit-controls>
      <p>No matches in this HSK scope.</p>
      {widen && <button type="button" onClick={widen}>Show all HSK levels</button>}
    </div>}
    {pages > 1 && <nav className="as-orbit-pages" aria-label="Family map pages" data-orbit-controls>
      <button type="button" aria-label="Previous family group" onClick={() => movePage(-1)} disabled={actual === 0}><ChevronLeft size={18}/></button>
      <span aria-live="polite">{offset + 1}–{offset + range.length} / {frames.length}</span>
      <button type="button" aria-label="Next family group" onClick={() => movePage(1)} disabled={actual === pages - 1}><ChevronRight size={18}/></button>
    </nav>}
  </section>;
}

const peekPositions = [
  [.126, .234], [.874, .234], [.126, .772], [.874, .772],
  [.30, .134], [.70, .134], [.30, .867], [.70, .867],
] as const;

export function SwipeFamilyPeek({frames, pinyin, choose}: {frames: SwipeFrame[]; pinyin: boolean; choose: (target: SwipeFrame, direction: SwipeDirection) => void}) {
  return <div className="as-horizon" aria-label="More in this family" data-swipe-control>
    {frames.slice(0, peekPositions.length).map((frame, index) => {
      const [x, y] = peekPositions[index];
      return <button key={frame.id} type="button" className="as-horizon-node" data-peek={index}
        style={{left: x * 100 + '%', top: y * 100 + '%'}}
        aria-label={'Open ' + frame.text + (pinyin ? ' · ' + frame.pinyin : '')}
        onClick={() => choose(frame, x < .5 ? 'left' : 'right')}>
        <span lang="zh-Hans">{frame.text}</span>
      </button>;
    })}
  </div>;
}
