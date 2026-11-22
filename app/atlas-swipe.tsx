'use client';

import {
  useEffect, useMemo, useRef, useState,
  type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent,
} from 'react';
import {ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Orbit, Pause, Play, Search} from 'lucide-react';
import {assemblyIndex, assemblyMeaning, type AssemblyPart} from './atlas-assembly-model';
import {type BrowseScope} from './hsk-scope';
import {
  characterFrames, focusCharacter, partFamily, scopedCharacterFrames, slotSwipeMap, swipeCharacterFrame, swipeDirection, swipeMap, swipeParts, swipeVectors, wordFrames,
  type CharacterFrame, type SwipeDirection, type SwipeFrame, type SwipeMap,
} from './atlas-swipe-model';
import {childSwipeRegions, rootSwipeRegions, type SwipeLens} from './atlas-swipe-regions';
import {SwipeFamilyMap, SwipeFamilyPeek} from './atlas-swipe-family-map';
import {movingInk, SwipeArtwork, type SwipeMotion} from './atlas-swipe-art';
import './atlas-swipe.css';

type Mode = 'characters' | 'words';
type Selection = {hanzi: string; part?: string; slot?: string};
type Gesture = {
  id: number; x: number; y: number; map: SwipeMap; picked: boolean;
  axis?: 'x' | 'y'; slot?: string; from?: SwipeFrame; inside: boolean; badge: boolean;
};
type FamilyOrbit = {part: AssemblyPart; origin: CharacterFrame; lens?: SwipeLens};
const animationDuration = 185;
const paceOptions = [.8, 1, 1.5, 2, 3, 4, 6];
const icons = {left: ChevronLeft, right: ChevronRight, up: ChevronUp, down: ChevronDown};
const arrowDirections: Partial<Record<string, SwipeDirection>> = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
};

function badgePosition(part: AssemblyPart): CSSProperties {
  const {x, w} = part.box;
  const position = part.positions[0];
  const centerX = x + w / 2;
  const horizontal = Math.max(.05, Math.min(.95, centerX));
  const offset = position === 'around' || part.positions.includes('top') ? .08 : .94;
  return {left: horizontal * 100 + '%', top: offset * 100 + '%'};
}

export default function AtlasSwipe({hanzi, part, slot, scope, onSelect, widen}: {
  hanzi?: string; part?: string; slot?: string; scope: BrowseScope;
  onSelect: (selection: Selection) => void; widen: () => void;
}) {
  const index = useMemo(() => assemblyIndex('en'), []);
  const [mode, setMode] = useState<Mode>('characters');
  const [all, setAll] = useState(false);
  const [lens, setLens] = useState<SwipeLens>();
  const [familyOrbit, setFamilyOrbit] = useState<FamilyOrbit>();
  const [wordAnchor, setWordAnchor] = useState(hanzi || '学');
  const [wordId, setWordId] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [pace, setPace] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [reveal, setReveal] = useState<{key: string; step: number}>();
  const [motion, setMotion] = useState<SwipeMotion>();
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | undefined>(undefined);
  const settling = useRef(false);
  const stopAnimation = useRef<(() => void) | undefined>(undefined);

  const character = index.characters.get(hanzi ?? '') ?? index.characters.get('学')!;
  const focus = useMemo(() => focusCharacter(index, character, part, slot), [index, character, part, slot]);
  const characterFrame = useMemo(() => swipeCharacterFrame(focus), [focus]);
  const baseRegions = useMemo(() => rootSwipeRegions(character), [character]);
  const inside = mode === 'characters' && lens?.hanzi === character.data.hanzi ? lens : undefined;
  const lensParent = inside?.trail.at(-1);
  const ancestors = inside?.trail.slice(0, -1).map(region => region.part.glyph) ?? [];
  const regions = lensParent ? childSwipeRegions(index, lensParent, ancestors) : baseRegions;
  const scopedFrames = useMemo(() => all ? mode === 'characters' ? scopedCharacterFrames(index, scope)
    : wordFrames('en', scope, '', true) : [], [all, index, mode, scope]);
  const familyFrames = useMemo(() => all ? [] : mode === 'characters' ? characterFrames(index, focus, scope)
    : wordFrames('en', scope, wordAnchor, false), [all, focus, index, mode, scope, wordAnchor]);
  const orbitFrames = useMemo(() => familyOrbit ? characterFrames(index, {
    character: familyOrbit.origin.character, part: familyOrbit.part,
  }, scope) : [], [familyOrbit, index, scope]);
  const inspected = inside && regions.find(region => region.part.id === inside.active);
  const frames = all ? scopedFrames : familyFrames;
  const word = mode === 'words' ? frames.find(frame => frame.id === wordId) ?? frames[0] : undefined;
  const current = word ?? characterFrame;
  const display = motion?.from ?? current;
  const map = useMemo(() => swipeMap(frames, current, mode === 'characters' && !all), [all, current, frames, mode]);
  const peek = useMemo(() => {
    if (all || inside || mode === 'words' || familyOrbit) return [];
    const visible = new Set(Object.values(map.neighbours).map(member => member?.id));
    visible.add(current.id);
    const start = Math.max(0, map.index - 4);
    return [...frames.slice(start), ...frames.slice(0, start)].filter(member => !visible.has(member.id)).slice(0, 8);
  }, [all, current.id, familyOrbit, frames, inside, map, mode]);
  const parts = useMemo(() => {
    if (mode === 'words') return [];
    const available = inside ? regions.map(region => region.part) : swipeParts(index, character);
    return available.map(piece => ({piece, count: partFamily(index, piece.glyph, scope).length}));
  }, [character, index, inside, mode, regions, scope]);
  const stackBadges = !!inside || map.vertical;
  const orderedBadges = stackBadges ? [...parts].sort(({piece: a}, {piece: b}) =>
    a.box.y + a.box.h / 2 - b.box.y - b.box.h / 2) : parts;
  const broadFamily = !all && !frames.length && mode === 'characters' && !!current.anchor
    && partFamily(index, current.anchor, 'all').length > 0;
  const revealKey = mode + ':' + current.id;
  const step = reveal?.key === revealKey ? reveal.step : 0;
  const animationActive = motion !== undefined;
  const mapOpen = familyOrbit !== undefined;
  const componentDepth = inside?.trail.length ?? 0;

  useEffect(() => {
    const element = viewport.current;
    if ((!mapOpen && !componentDepth) || !element) return;
    const bounds = element.getBoundingClientRect();
    if (bounds.height <= innerHeight && (bounds.top < 0 || bounds.bottom > innerHeight))
      element.scrollIntoView({block: 'nearest'});
  }, [componentDepth, mapOpen]);

  useEffect(() => {
    const pinyin = window.setTimeout(() => setReveal({key: revealKey, step: 1}), pace * 250);
    const english = window.setTimeout(() => setReveal({key: revealKey, step: 2}), pace * 520);
    return () => { window.clearTimeout(pinyin); window.clearTimeout(english); };
  }, [pace, revealKey]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopAnimation.current?.();
    };
  }, []);

  function applyFrame(target: SwipeFrame) {
    setLens(undefined);
    if (target.character) onSelect({hanzi: target.text, part: target.anchor || undefined, slot: target.character.part?.id});
    else {
      setWordId(target.id);
      setWordAnchor(target.anchor);
    }
  }

  function clearMotion() {
    stopAnimation.current?.();
    stopAnimation.current = undefined;
    settling.current = false;
    gesture.current = undefined;
    setMotion(undefined);
  }

  function transition(target: SwipeFrame, direction: SwipeDirection, progress = 0, complete = true, from?: SwipeFrame) {
    if (settling.current) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (complete) applyFrame(target);
      setMotion(undefined);
      return;
    }
    settling.current = true;
    let timer: number | undefined;
    const draw = window.requestAnimationFrame(() => {
      setMotion({target, direction, progress: complete ? 1 : 0, settling: true, from});
      timer = window.setTimeout(() => {
        if (complete) applyFrame(target);
        stopAnimation.current = undefined;
        settling.current = false;
        setMotion(undefined);
      }, animationDuration);
    });
    stopAnimation.current = () => { window.cancelAnimationFrame(draw); window.clearTimeout(timer); };
    setMotion({target, direction, progress, settling: false, from});
  }

  const next = map.neighbours[map.next];
  const advance = useRef(() => {});
  useEffect(() => {
    advance.current = () => {
      if (next) transition(next, map.next);
      else setPlaying(false);
    };
  });
  useEffect(() => {
    if (!playing || animationActive) return;
    const timer = window.setTimeout(() => advance.current(), pace * 1000 - animationDuration);
    return () => window.clearTimeout(timer);
  }, [animationActive, pace, playing, revealKey]);

  function go(direction: SwipeDirection) {
    const target = map.neighbours[direction];
    if (!target) return;
    setPlaying(false);
    transition(target, direction);
  }

  function play() {
    if (playing) { setPlaying(false); return; }
    if (frames.length < 2 || settling.current) return;
    setFamilyOrbit(undefined);
    setLens(undefined);
    if (!next) applyFrame(frames[0]);
    setPlaying(true);
  }

  function changeMode(nextMode: Mode) {
    if (mode === nextMode) return;
    clearMotion();
    setPlaying(false);
    setError('');
    if (nextMode === 'words') {
      setWordAnchor(character.data.hanzi);
      setWordId('');
    }
    setFamilyOrbit(undefined);
    setLens(undefined);
    setMode(nextMode);
  }

  function changeRange(full: boolean) {
    if (all === full) return;
    clearMotion();
    setPlaying(false);
    setFamilyOrbit(undefined);
    setLens(undefined);
    setAll(full);
    if (!full) return;
    const first = (mode === 'characters' ? scopedCharacterFrames(index, scope)
      : wordFrames('en', scope, wordAnchor, true))[0];
    if (first) applyFrame(first);
  }

  function find(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = query.trim();
    if (!text) return;
    let target: SwipeFrame | undefined;
    if (mode === 'characters') {
      const seed = index.characters.get(text);
      const containing = partFamily(index, text, scope)[0]?.character;
      if (containing && (!seed || character.parts.some(piece => piece.glyph === text))) {
        target = swipeCharacterFrame(focusCharacter(index, character.parts.some(piece => piece.glyph === text) ? character : containing, text));
      } else if (seed) {
        target = swipeCharacterFrame(focusCharacter(index, seed, text));
      }
    } else {
      const anchor = [...text][0];
      const words = wordFrames('en', scope, anchor, false);
      target = words.find(frame => frame.text === text) ?? ([...text].length === 1 ? words[0] : undefined);
    }
    if (!target) {
      setError(mode === 'characters' ? 'Enter a hanzi or a component from the Atlas.' : 'No matching word in this HSK scope.');
      return;
    }
    clearMotion();
    setPlaying(false);
    setAll(false);
    setFamilyOrbit(undefined);
    applyFrame(target);
    setError('');
    setQuery('');
  }

  function mapFromTarget(element: Element, partSlot?: string) {
    const chosen = parts.find(entry => entry.piece.id === partSlot)?.piece;
    if (chosen && !element.closest('.as-count')) {
      const exact = slotSwipeMap(index, character, chosen, scope);
      return exact ? {...exact, picked: true} : {
        map: {...map, neighbours: {}}, picked: true,
      };
    }
    if (chosen && (all || focus.part?.id !== chosen.id)) {
      const nextFocus = {character, part: chosen};
      const newFrame = swipeCharacterFrame(nextFocus);
      setAll(false);
      applyFrame(newFrame);
      return {map: swipeMap(characterFrames(index, nextFocus, scope), newFrame, true), picked: true};
    }
    const glyph = element.closest('[data-swipe-anchor]')?.getAttribute('data-swipe-anchor');
    if (word && glyph && (all || glyph !== word.anchor)) {
      const newFrame = {...word, anchor: glyph};
      setAll(false);
      applyFrame(newFrame);
      return {map: swipeMap(wordFrames('en', scope, glyph, false), newFrame, false), picked: true};
    }
    return {map, picked: !!(chosen || glyph)};
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    const element = event.target as Element;
    const badge = !!element.closest('.as-count');
    if (!event.isPrimary || event.button !== 0 || settling.current || element.closest('[data-swipe-control]')) return;
    if (mode === 'words' && !word) return;
    setPlaying(false);
    let partSlot = element.closest('[data-swipe-slot]')?.getAttribute('data-swipe-slot') ?? undefined;
    const outline = event.currentTarget.querySelector<SVGSVGElement>('.as-current .as-paths');
    if (!partSlot && outline && mode === 'characters') {
      const bounds = outline.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width;
      const y = (event.clientY - bounds.top) / bounds.height;
      const hits = regions.filter(({part: {box}}) => x >= box.x + .035 && x <= box.x + box.w - .035 &&
        y >= box.y + .035 && y <= box.y + box.h - .035);
      if (hits.length === 1) partSlot = hits[0].part.id;
    }
    const selection = inside ? {map, picked: true} : mapFromTarget(element, partSlot);
    gesture.current = {id: event.pointerId, x: event.clientX, y: event.clientY, slot: partSlot, inside: !!inside, badge, ...selection};
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId || active.inside) return;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (!active.axis) {
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 10) return;
      active.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
    }
    const direction = swipeDirection(dx, dy, active.axis);
    const target = active.map.neighbours[direction];
    const distance = Math.abs(active.axis === 'x' ? dx : dy);
    const progress = Math.min(.88, distance / Math.min(200, event.currentTarget.clientWidth * .32));
    if (target && !matchMedia('(prefers-reduced-motion: reduce)').matches)
      setMotion({target, direction, progress, settling: false, from: active.from});
    else setMotion(undefined);
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const active = gesture.current;
    if (!active || active.id !== event.pointerId) return;
    gesture.current = undefined;
    const dx = event.clientX - active.x;
    const dy = event.clientY - active.y;
    if (!active.axis && active.slot && Math.max(Math.abs(dx), Math.abs(dy)) < 10) {
      const piece = parts.find(entry => entry.piece.id === active.slot)?.piece;
      if (piece) {
        if (active.badge) openFamily(piece);
        else tapPart(piece);
      }
      return;
    }
    if (active.inside) return;
    const direction = active.axis ? swipeDirection(dx, dy, active.axis) : active.map.next;
    const target = active.map.neighbours[direction];
    const distance = active.axis === 'x' ? Math.abs(dx) : Math.abs(dy);
    if (target && (active.axis ? distance >= 36 : !active.picked)) {
      transition(target, direction, motion?.direction === direction ? motion.progress : 0, true, active.from);
    } else if (motion) transition(motion.target, motion.direction, motion.progress, false, motion.from);
  }

  function cancelPointer(event: PointerEvent<HTMLDivElement>) {
    if (gesture.current?.id !== event.pointerId) return;
    gesture.current = undefined;
    if (motion) transition(motion.target, motion.direction, motion.progress, false, motion.from);
  }

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (familyOrbit && event.key === 'Escape') {
      event.preventDefault();
      setFamilyOrbit(undefined);
      return;
    }
    if (inside || familyOrbit) return;
    const direction = arrowDirections[event.key];
    if (!direction) return;
    event.preventDefault();
    go(direction);
  }

  function openFamily(piece: AssemblyPart) {
    if (settling.current) return;
    setPlaying(false);
    const origin = inside ? focus : {character, part: piece};
    const originalLens = inside && {...inside, active: piece.id};
    if (originalLens) setLens(originalLens);
    else {
      setAll(false);
      applyFrame(swipeCharacterFrame(origin));
    }
    setFamilyOrbit(current => current?.part.glyph === piece.glyph
      ? current : {part: piece, origin, lens: originalLens});
  }

  function chooseOrbitMember(target: SwipeFrame, direction: SwipeDirection) {
    if (target.id === current.id) return;
    setPlaying(false);
    transition(target, direction);
  }

  function returnToOrbitOrigin() {
    if (!familyOrbit) return;
    clearMotion();
    applyFrame(swipeCharacterFrame(familyOrbit.origin));
    setLens(familyOrbit.lens);
    setFamilyOrbit(undefined);
  }

  function tapPart(piece: AssemblyPart) {
    if (settling.current) return;
    const region = regions.find(entry => entry.part.id === piece.id);
    const parents = lensParent ? [...ancestors, lensParent.part.glyph] : [];
    const canOpen = region && childSwipeRegions(index, region, parents).length > 0;
    if (inside) {
      setPlaying(false);
      if (inside.active !== piece.id) {
        if (familyOrbit && !canOpen) openFamily(piece);
        else {
          setFamilyOrbit(undefined);
          setLens({...inside, active: piece.id});
        }
      } else if (canOpen) {
        setFamilyOrbit(undefined);
        setLens({...inside, trail: [...inside.trail, region], active: undefined});
      } else openFamily(piece);
      return;
    }
    if (!canOpen) {
      openFamily(piece);
      return;
    }
    setPlaying(false);
    setFamilyOrbit(undefined);
    setAll(false);
    applyFrame(swipeCharacterFrame({character, part: piece}));
    setLens({hanzi: character.data.hanzi, trail: [region]});
  }

  const glyphMeaning = (glyph: string) => {
    const entry = index.characters.get(glyph);
    return entry ? assemblyMeaning(entry, true) : '';
  };

  const badgeButtons = orderedBadges.map(({piece, count}) =>
    <button type="button" key={piece.id} className="as-count" data-swipe-slot={piece.id}
      data-component={piece.glyph} data-family-count={count}
      aria-pressed={inside ? inside.active === piece.id : !all && focus.part?.id === piece.id}
      aria-label={'Show family for ' + piece.glyph + ' · ' + piece.positions[0] + ' · ' + count + ' characters'}
      title={piece.glyph + ' · ' + count + ' characters'}
      style={familyOrbit || stackBadges ? undefined : badgePosition(piece)}
      onClick={event => { if (familyOrbit || !event.detail) openFamily(piece); }}>
      <span><b lang="zh-Hans">{piece.glyph}</b>{count}</span>
    </button>);

  return <section className="as" aria-label="Swipe Atlas" data-mode={mode}>
    <div className="as-toolbar">
      <div className="as-mode" role="group" aria-label="Study material">
        <button type="button" aria-pressed={mode === 'characters'} onClick={() => changeMode('characters')}>Characters</button>
        <button type="button" aria-pressed={mode === 'words'} onClick={() => changeMode('words')}>Words</button>
      </div>
      <form className="as-find" onSubmit={find}>
        <input type="search" aria-label={mode === 'characters' ? 'Find hanzi or component' : 'Find word or hanzi'}
          placeholder={mode === 'characters' ? 'Hanzi or part' : 'Word or hanzi'}
          enterKeyHint="search" autoComplete="off" maxLength={12} value={query}
          onChange={event => { setQuery(event.target.value); setError(''); }}/>
        <button type="submit" aria-label="Find"><Search size={17}/></button>
      </form>
      <label className="as-select">
        <select aria-label="Study range" value={all ? 'all' : 'family'} onChange={event => changeRange(event.target.value === 'all')}>
          <option value="family">Current family</option>
          <option value="all">{scope === 'all' ? 'Entire Atlas' : 'Entire HSK scope'}</option>
        </select>
      </label>
      {mode === 'characters' && focus.part && <button type="button" className="as-open-map"
        aria-label="Family map" aria-expanded={!!familyOrbit} onClick={() => familyOrbit ? setFamilyOrbit(undefined)
          : openFamily(inspected?.part ?? lensParent?.part ?? focus.part!)}>
        <Orbit size={17}/><span>Family map</span>
      </button>}
    </div>
    {error && <p className="as-error" role="alert">{error}</p>}
    <div className="as-stage">
      <div ref={viewport} className="as-viewport" role="group" tabIndex={0} aria-label="Swipe characters"
        aria-describedby="as-gesture-help" data-study-lookup="off" data-axis={map.vertical ? 'vertical' : 'horizontal'} data-depth={componentDepth} data-family-map={!!familyOrbit} data-small-family={!!familyOrbit && orbitFrames.length <= 8}
        data-motion={motion ? motion.settling ? 'settling' : 'dragging' : 'rest'}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onLostPointerCapture={cancelPointer} onPointerCancel={cancelPointer} onKeyDown={keyDown}>
        <div className="as-registration" aria-hidden="true"/>
        {inside && <nav className="as-levels" aria-label="Component levels" data-swipe-control>
          <button type="button" aria-label={'Back to ' + character.data.hanzi} onClick={() => { setFamilyOrbit(undefined); setLens(undefined); }}>
            <ChevronLeft size={15}/><span lang="zh-Hans">{character.data.hanzi}</span>
          </button>
          {inside.trail.map(({part: step}, index) => index === inside.trail.length - 1
            ? <span key={step.id} lang="zh-Hans" aria-current={inspected ? undefined : 'step'}>{step.glyph}</span>
            : <button type="button" key={step.id} aria-label={'Back to ' + step.glyph} onClick={() => {
              setFamilyOrbit(undefined);
              setLens({...inside, trail: inside.trail.slice(0, index + 1), active: undefined});
            }}><span lang="zh-Hans">{step.glyph}</span></button>)}
          {inspected && <span className="as-inspected" aria-current="step" lang="zh-Hans"
            aria-label={'Selected ' + inspected.part.glyph}>{inspected.part.glyph}</span>}
        </nav>}
        {familyOrbit ? <SwipeFamilyMap key={familyOrbit.part.glyph + ':' + scope}
          anchor={familyOrbit.part.glyph} frames={orbitFrames} current={current.id}
          origin={familyOrbit.origin.character.data.hanzi !== current.text ? familyOrbit.origin.character.data.hanzi : undefined}
          pinyin={showPinyin} english={showMeaning} choose={chooseOrbitMember} close={() => setFamilyOrbit(undefined)}
          restore={returnToOrbitOrigin} widen={scope !== 'all' ? widen : undefined}/>
          : peek.length > 0 && <SwipeFamilyPeek frames={peek} pinyin={showPinyin} choose={chooseOrbitMember}/>}
        {Object.entries(swipeVectors).map(([key, [x, y]]) => {
          const direction = key as SwipeDirection;
          const target = map.neighbours[direction];
          const Icon = icons[direction];
          if (!target || inside || familyOrbit) return null;
          const orthogonal = direction !== map.next && direction !== map.previous;
          const label = orthogonal ? target.character?.part?.positions[0] : undefined;
          return <button type="button" className="as-neighbour" key={direction} data-swipe-control data-swipe-direction={direction}
            aria-label={(label ? 'Move to ' + label + ' · ' : direction === map.next ? 'Next · ' : 'Previous · ') + target.text}
            style={{'--as-x': x, '--as-y': y, '--as-enter': motion?.direction === direction ? motion.progress : 0} as CSSProperties}
            onClick={() => go(direction)}>
            <span className="as-peek" aria-hidden="true"><SwipeArtwork frame={target}/></span>
            <span className="as-direction"><Icon size={15} aria-hidden="true"/>{label}</span>
          </button>;
        })}
        {mode === 'words' && !word ? <div className="as-empty">
          <p>No words with <span lang="zh-Hans">{wordAnchor}</span> in this HSK scope.</p>
          <button type="button" onClick={() => changeRange(true)}>Browse all words in scope</button>
        </div> : <div className="as-composition">
          <div className="as-glyph as-current" role="img" aria-label={current.text} data-character={current.text}
            style={motion && movingInk(display, motion, false)}>
            <SwipeArtwork frame={display} interactive regions={inside ? regions : undefined} active={inside?.active}/>
          </div>
          {motion && <div className="as-glyph as-incoming" aria-hidden="true" style={movingInk(display, motion, true)}>
            <SwipeArtwork frame={motion.target}/>
          </div>}
          {!familyOrbit && <div className="as-badges" aria-label="Component family sizes" data-stack={stackBadges} hidden={!!motion}>
            {badgeButtons}
          </div>}
        </div>}
      </div>
      <div className="as-caption" aria-live="off">
        {familyOrbit && <div className="as-map-parts" role="group" aria-label="Component family sizes">{badgeButtons}</div>}
        {(mode === 'characters' || word) && <>
          <p className="as-reading" data-revealed={showPinyin && step >= 1 || undefined}>
            {showPinyin && step >= 1 && <>
              {inside && <span className="as-reading-glyph" lang="zh-Hans">{current.text}</span>}{current.pinyin}
            </>}
          </p>
          <p className="as-meaning" data-revealed={showMeaning && step >= 2 || undefined}>
            {showMeaning && step >= 2 ? current.meaning : ''}
          </p>
          {word && showMeaning && step >= 2 && [...word.text].length > 1 &&
            <div className="as-word-parts" aria-label="Individual character meanings">
              {[...word.text].map((glyph, position) => {
                const meaning = glyphMeaning(glyph);
                return meaning && <span key={position}><strong lang="zh-Hans">{glyph}</strong>{meaning}</span>;
              })}
            </div>}
        </>}
      </div>
      {broadFamily && <p className="as-narrow">No matches in this HSK scope. <button type="button" onClick={widen}>Show all HSK levels</button></p>}
      <footer className="as-controls">
        <div className="as-playback">
          <button type="button" className="as-play" aria-label={playing ? 'Pause continuous play' : 'Play continuous'}
            disabled={frames.length < 2} onClick={play}>
            {playing ? <Pause size={18}/> : <Play size={18}/>}<span>{playing ? 'Pause' : 'Play'}</span>
          </button>
          <label className="as-select">
            <select aria-label="Pace" value={pace} onChange={event => setPace(Number(event.target.value))}>
              {paceOptions.map(seconds => <option value={seconds} key={seconds}>{seconds} s</option>)}
            </select>
          </label>
        </div>
        {map.total > 0 && <button type="button" className="as-progress" data-current={map.index + 1} data-total={map.total}
          aria-label={inside ? 'Position in family' : 'Next · ' + (map.index + 1) + ' of ' + map.total}
          aria-disabled={!!inside || !next} onClick={() => { if (!inside && next) go(map.next); }}>
          {!all && current.anchor && <span lang="zh-Hans">{inside?.trail.at(-1)?.part.glyph ?? current.anchor}</span>}
          {map.index >= 0 ? (map.index + 1) + ' / ' + map.total : map.total + ' in scope'}
          {!inside && next && <ChevronRight size={15} aria-hidden="true"/>}
        </button>}
        <div className="as-settings" aria-label="Reveal settings" role="group">
          <label><input type="checkbox" checked={showPinyin} onChange={event => setShowPinyin(event.target.checked)}/> Pinyin</label>
          <label><input type="checkbox" checked={showMeaning} onChange={event => setShowMeaning(event.target.checked)}/> English</label>
        </div>
      </footer>
    </div>
    <p className="as-help" id="as-gesture-help">
      {familyOrbit ? 'Drag the map to turn it. Tap any character to bring it into the centre.'
        : inside ? 'Tap a part to inspect it, or tap its count to see its family.'
        : mode === 'characters' ? 'Drag the strokes to swap a part. Tap a count to see its family.'
        : 'Drag a hanzi to browse the words that use it.'} {!inside && !familyOrbit && 'Tap the space around it to go next.'}
    </p>
  </section>;
}
