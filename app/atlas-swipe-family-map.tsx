'use client';

import {useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent, type PointerEvent} from 'react';
import {ArrowLeft, ChevronLeft, ChevronRight, X} from 'lucide-react';
import {SwipeArtwork} from './atlas-swipe-art';
import {SwipeLabel} from './atlas-swipe-label';
import type {SwipeDirection, SwipeFrame} from './atlas-swipe-model';

const fullTurn = 2 * Math.PI;
const samples = 144;
const supportDirections = Array.from({length: 24}, (_, index) => {
  const angle = (index + 1) * Math.PI / 48;
  return {x: Math.cos(angle), y: Math.sin(angle)};
});

type Point = {x: number; y: number};
type Track = {radius: Point; length: number; points: (Point & {distance: number})[]};
type Ring = Track & {capacity: number};
type Drag = {id: number; x: number; y: number; angle: number; moved: boolean};

function orbitTrack(radius: Point): Track {
  let previous = {x: 0, y: -radius.y};
  let distance = 0;
  const points = Array.from({length: samples + 1}, (_, index) => {
    const theta = index * fullTurn / samples - Math.PI / 2;
    const point = {x: radius.x * Math.cos(theta), y: radius.y * Math.sin(theta)};
    distance += Math.hypot(point.x - previous.x, point.y - previous.y);
    previous = point;
    return {...point, distance};
  });
  return {radius, length: distance, points};
}

function pointOnTrack(track: Track, turns: number): Point {
  const distance = (turns - Math.floor(turns)) * track.length;
  let before = 0;
  let after = samples;
  while (after - before > 1) {
    const middle = (before + after) >> 1;
    if (track.points[middle].distance <= distance) before = middle;
    else after = middle;
  }
  const a = track.points[before], b = track.points[after];
  const ratio = (distance - a.distance) / (b.distance - a.distance);
  return {x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio};
}

function trackCapacity(track: Track, cardWidth: number, cardHeight: number) {
  let capacity = Math.floor(track.length / Math.hypot(cardWidth + 3, cardHeight + 3) + 1);
  while (capacity > 2) {
    let fits = true;
    // Check adjacent hit areas along the entire track, including during a turn.
    for (let index = 0; index < samples * 2; index++) {
      const turns = index / (samples * 2);
      const a = pointOnTrack(track, turns), b = pointOnTrack(track, turns + 1 / capacity);
      if (Math.abs(a.x - b.x) < cardWidth + 4 && Math.abs(a.y - b.y) < cardHeight + 4) {
        fits = false;
        break;
      }
    }
    if (fits) return capacity;
    capacity--;
  }
  return Math.max(1, capacity);
}

function innerOrbit(radius: Point, cardWidth: number, cardHeight: number, art: number) {
  let best: Point | undefined;
  let bestPerimeter = 0;
  const centreX = (cardWidth + art) / 2, centreY = (cardHeight + art) / 2;
  for (let x = radius.x - cardWidth - 4; x > centreX; x -= 3) {
    let y = radius.y - cardHeight - 4;
    // Keep adjacent tracks far enough apart for the rectangular cards, even at
    // their diagonals. Wider tracks use more of the space beside the artwork.
    for (const unit of supportDirections) {
      const clearance = Math.hypot(radius.x * unit.x, radius.y * unit.y)
        - (cardWidth + 4) * unit.x - (cardHeight + 4) * unit.y;
      y = Math.min(y, Math.sqrt(Math.max(0, clearance ** 2 - (x * unit.x) ** 2)) / unit.y);
    }
    if (y <= 0 || Math.hypot(centreX / x, centreY / y) >= 1) continue;
    const perimeter = 3 * (x + y) - Math.sqrt((3 * x + y) * (x + 3 * y));
    if (perimeter <= bestPerimeter) continue;
    best = {x, y};
    bestPerimeter = perimeter;
  }
  return best;
}

function orbitLayout(width: number, height: number, count: number, inside: boolean) {
  const dense = count > 8;
  const cardWidth = dense ? width < 356 ? 54 : width < 530 ? 56 : 60 : 74;
  const cardHeight = dense ? 60 : 73;
  const rings: Ring[] = [];
  if (!width || !height) return {cardWidth, cardHeight, dense, rings};

  const art = dense ? width < 530 ? Math.min((width + 2) * .19, 76) : 120
    : width >= 530 ? Math.min((width + 2) * .35, 171) : Math.min((width + 2) * .31, 126);
  let radius: Point | undefined = {
    x: Math.max(1, (width - cardWidth) / 2 - 6),
    y: Math.max(1, (height - cardHeight) / 2 - (inside ? 72 : 50)),
  };
  let remaining = Math.min(width < 530 ? 20 : 50, count);
  while (remaining > 0 && radius) {
    const track = orbitTrack(radius);
    const capacity = Math.min(remaining, trackCapacity(track, cardWidth, cardHeight));
    rings.push({...track, capacity});
    remaining -= capacity;
    if (remaining) radius = innerOrbit(radius, cardWidth, cardHeight, art);
  }
  return {cardWidth, cardHeight, dense, rings};
}

function placeFamily(frames: SwipeFrame[], angle: number, layout: Ring[]) {
  let start = 0;
  return layout.flatMap((ring, ringIndex) => {
    const batch = frames.slice(start, start + ring.capacity);
    start += ring.capacity;
    return batch.map((frame, index) => {
      const {x, y} = pointOnTrack(ring, (index + (ringIndex ? .5 : 0)) / batch.length + angle / fullTurn);
      const direction: SwipeDirection = Math.abs(x) >= Math.abs(y)
        ? x < 0 ? 'left' : 'right'
        : y < 0 ? 'up' : 'down';
      const style = {
        left: 'calc(50% + ' + x + 'px)',
        top: 'calc(var(--as-centre-y) + ' + y + 'px)',
      } as CSSProperties;
      return {frame, style, direction, ringIndex};
    });
  });
}

export function SwipeFamilyMap({anchor, frames, current, origin, inside, pinyin, english, choose, close, restore, widen}: {
  anchor: string;
  frames: SwipeFrame[];
  current: string;
  origin?: string;
  inside: boolean;
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

  const {cardWidth, cardHeight, dense, rings} = useMemo(() =>
    orbitLayout(size.width, size.height, frames.length, inside), [size, frames.length, inside]);
  const limit = Math.max(1, rings.reduce((count, ring) => count + ring.capacity, 0));
  const pages = Math.max(1, Math.ceil(frames.length / limit));
  const actual = Math.min(page, pages - 1);
  const offset = actual * limit;
  const range = frames.slice(offset, offset + limit);
  const points = placeFamily(range, angle, rings);

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
    data-dragging={dragging || undefined} data-dense={dense || undefined}
    style={{'--as-orbit-card-width': cardWidth + 'px', '--as-orbit-card-height': cardHeight + 'px'} as CSSProperties}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd}
    onPointerCancel={event => pointerEnd(event, true)} onLostPointerCapture={event => pointerEnd(event, true)}
    onClickCapture={clickCapture}>
    {rings.filter((_, ringIndex) => points.some(point => point.ringIndex === ringIndex)).map(({radius}, ringIndex) => <div aria-hidden="true" key={ringIndex} className="as-orbit-ring"
      style={{width: radius.x * 2, height: radius.y * 2}}/>)}
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
        style={style} onClick={() => { if (!centred) choose(frame, direction); }}>
        {centred ? <><i aria-hidden="true"/><span className="as-visually-hidden" lang="zh-Hans">{frame.text}</span></> : <>
          {frames.length <= 8 && <>
            <span className="as-orbit-ink" aria-hidden="true"><SwipeArtwork frame={frame}/></span>
            <span className="as-visually-hidden" lang="zh-Hans">{frame.text}</span>
          </>}
          {frames.length > 8 && <strong className="as-label-hanzi" lang="zh-Hans">{frame.text}</strong>}
          <SwipeLabel frame={frame} showPinyin={pinyin} showMeaning={english}/>
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
  [.065, .235], [.935, .235], [.065, .785], [.935, .785],
  [.195, .235], [.805, .235], [.195, .785], [.805, .785],
] as const;

export function SwipeFamilyPeek({frames, pinyin, english, choose}: {
  frames: SwipeFrame[]; pinyin: boolean; english: boolean; choose: (target: SwipeFrame, direction: SwipeDirection) => void;
}) {
  return <div className="as-horizon" role="group" aria-label="More in this family" data-swipe-control>
    {frames.slice(0, peekPositions.length).map((frame, index) => {
      const [x, y] = peekPositions[index];
      return <button key={frame.id} type="button" className="as-horizon-node"
        style={{left: x * 100 + '%', top: y * 100 + '%'}}
        onClick={() => choose(frame, x < .5 ? 'left' : 'right')}>
        <strong className="as-label-hanzi" lang="zh-Hans">{frame.text}</strong>
        <SwipeLabel frame={frame} showPinyin={pinyin} showMeaning={english}/>
      </button>;
    })}
  </div>;
}
