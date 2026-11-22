'use client';

import {
  useEffect, useId, useLayoutEffect, useMemo, useRef, useState,
  type CSSProperties, type FormEvent, type KeyboardEvent, type PointerEvent,
} from 'react';
import {BookOpen, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Orbit, Pause, Play, Search} from 'lucide-react';
import {assemblyIndex, assemblyMeaning, type AssemblyPart} from './atlas-assembly-model';
import {type BrowseScope} from './hsk-scope';
import {
  characterFrames, focusCharacter, partFamily, scopedCharacterFrames, slotSwipeMap, swipeCharacterFrame, swipeDirection, swipeMap, swipeParts, swipeVectors, wordFrames,
  type CharacterFrame, type SwipeDirection, type SwipeFrame, type SwipeMap,
} from './atlas-swipe-model';
import {childSwipeRegions, rootSwipeRegions, type SwipeLens} from './atlas-swipe-regions';
import {SwipeFamilyMap, SwipeFamilyOrbit, SwipeFamilyPeek} from './atlas-swipe-family-map';
import {contextualWordParts, SwipeLabel} from './atlas-swipe-label';
import {movingInk, SwipeArtwork, type SwipeMotion} from './atlas-swipe-art';
import AtlasSwipeStoryPanel from './atlas-swipe-story-panel';
import {findSwipeStory} from './atlas-swipe-story-data';
import './atlas-swipe.css';
import './atlas-swipe-story-entry.css';
import './atlas-swipe-word-focus.css';
import {SwipeWordBranches, type WordBranchReturn} from './atlas-swipe-word-branches';
import {otherWordHanzi, wordCross} from './atlas-swipe-word-branches-model';

type Mode = 'characters' | 'words';
type WordView = 'swipe' | 'connections';
type WordOrigin = {frame: SwipeFrame; vertical?: string; all: boolean; scope: BrowseScope; from: WordBranchReturn};
type Selection = {hanzi: string; part?: string; slot?: string};
type Gesture = {
  id: number; x: number; y: number; map: SwipeMap; picked: boolean;
  axis?: 'x' | 'y'; slot?: string; from?: SwipeFrame; inside: boolean; badge: boolean; wordGlyph?: string;
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

export default function AtlasSwipe({hanzi, part, slot, scope, entryWord, wordView, openFamilyOnEntry = false,
  onSelect, onFamilyMapChange, onWordViewChange, widen}: {
  hanzi?: string; part?: string; slot?: string; scope: BrowseScope; entryWord?: string;
  wordView?: 'connections'; onWordViewChange?: (view: WordView, word?: string) => void;
  openFamilyOnEntry?: boolean; onFamilyMapChange: (open: boolean) => void;
  onSelect: (selection: Selection) => void; widen: () => void;
}) {
  const index = useMemo(() => assemblyIndex('en'), []);
  const character = index.characters.get(hanzi ?? '') ?? index.characters.get('学')!;
  const focus = useMemo(() => focusCharacter(index, character, part, slot), [index, character, part, slot]);
  const [mode, setMode] = useState<Mode>(entryWord || wordView ? 'words' : 'characters');
  const [wordsView, setWordsView] = useState<WordView>(wordView ?? 'swipe');
  const [all, setAll] = useState(false);
  const [lens, setLens] = useState<SwipeLens>();
  const [familyOrbit, setFamilyOrbit] = useState<FamilyOrbit | undefined>(() =>
    openFamilyOnEntry && !entryWord && !wordView && focus.part ? {part: focus.part, origin: focus} : undefined);
  const [familyLayout, setFamilyLayout] = useState<'compare' | 'orbit'>('compare');
  const [wordAnchor, setWordAnchor] = useState(() => [...(entryWord ?? '')][0] ?? (hanzi || '学'));
  const [wordVerticalAnchor, setWordVerticalAnchor] = useState<string>();
  const [wordSelection, setWordSelection] = useState<{id?: string; text?: string}>({text: entryWord});
  const [wordHistory, setWordHistory] = useState<WordOrigin[]>([]);
  const [wordRestoration, setWordRestoration] = useState<WordBranchReturn>();
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [pace, setPace] = useState(2);
  const [playing, setPlaying] = useState(false);
  const [showPinyin, setShowPinyin] = useState(true);
  const [showMeaning, setShowMeaning] = useState(true);
  const [reveal, setReveal] = useState<{key: string; step: number}>();
  const [motion, setMotion] = useState<SwipeMotion>();
  const [openStory, setOpenStory] = useState<{key: string; focus?: string}>();
  const storyAreaId = useId();
  const storyArea = useRef<HTMLDivElement>(null);
  const storyButton = useRef<HTMLButtonElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const storyScroll = useRef(0);
  const gesture = useRef<Gesture | undefined>(undefined);
  const settling = useRef(false);
  const stopAnimation = useRef<(() => void) | undefined>(undefined);

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
  const word = mode === 'words'
    ? frames.find(frame => wordSelection.id ? frame.id === wordSelection.id : frame.text === wordSelection.text) ?? frames[0]
    : undefined;
  const current = word ?? characterFrame;
  const display = motion?.from ?? current;
  const connections = mode === 'words' && wordsView === 'connections';
  const cross = useMemo(() => connections && word ? wordCross(word, scope, wordVerticalAnchor) : undefined,
    [connections, scope, word, wordVerticalAnchor]);
  const map = useMemo<SwipeMap>(() => {
    const base = swipeMap(frames, current, mode === 'characters' && !all);
    return cross ? {...base, neighbours: {
      left: cross.peers.left[0], right: cross.peers.right[0], up: cross.peers.up[0], down: cross.peers.down[0],
    }, previous: cross.horizontal ? 'left' : 'up', next: cross.horizontal ? 'right' : 'down'} : base;
  }, [all, cross, current, frames, mode]);
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
  const step = !playing ? 2 : reveal?.key === revealKey ? reveal.step : 0;
  const animationActive = motion !== undefined;
  const story = !inside && !familyOrbit && (mode === 'characters' || word) ? findSwipeStory({...current, mode}) : undefined;
  const storyKey = [scope, all, mode, current.id, current.anchor, current.character?.part?.id].join(':');
  if (openStory && (openStory.key !== storyKey || !story)) setOpenStory(undefined);
  const storyActive = openStory?.key === storyKey && !!story;
  const storyFocus = storyActive ? openStory.focus : undefined;
  const showWordBranches = !!(cross && !storyActive);
  const returnWord = wordHistory.at(-1);
  if (returnWord && returnWord.scope !== scope) {
    setWordHistory([]);
    setWordRestoration(undefined);
  }
  const storyCharacter = story?.kind === 'character' ? index.characters.get(story.target) : undefined;
  const storyArtwork = storyActive && word && storyCharacter
    ? swipeCharacterFrame({character: storyCharacter}) : undefined;
  const relatedCharacter = story?.related && index.characters.get(story.related.hanzi);
  const retainedPart = relatedCharacter?.parts.find(piece => storyCharacter?.parts.some(source => source.glyph === piece.glyph));

  useLayoutEffect(() => {
    if (!storyActive || !storyArea.current || !viewport.current) return;
    const artTop = viewport.current.getBoundingClientRect().top;
    const panelBottom = storyArea.current.getBoundingClientRect().bottom;
    const stickyBottom = document.querySelector('.app-shell .topbar')?.getBoundingClientRect().bottom ?? 0;
    const visibleBottom = window.visualViewport
      ? window.visualViewport.offsetTop + window.visualViewport.height : window.innerHeight;
    const adjustment = Math.min(Math.max(0, panelBottom - visibleBottom + 8), artTop - Math.max(stickyBottom, 0) - 8);
    if (adjustment) window.scrollBy({top: adjustment, behavior: 'instant'});
  }, [storyActive]);

  const mapOpen = familyOrbit !== undefined;
  const comparingFamily = mapOpen && familyLayout === 'compare';
  const componentDepth = inside?.trail.length ?? 0;

  useEffect(() => {
    if (!familyOrbit?.lens && openFamilyOnEntry !== mapOpen) onFamilyMapChange(mapOpen);
  }, [familyOrbit?.lens, mapOpen, onFamilyMapChange, openFamilyOnEntry]);

  useEffect(() => {
    const element = viewport.current;
    if ((!mapOpen && !componentDepth) || !element) return;
    const bounds = element.getBoundingClientRect();
    if (bounds.height <= innerHeight && (bounds.top < 0 || bounds.bottom > innerHeight))
      element.scrollIntoView({block: 'nearest'});
  }, [componentDepth, mapOpen]);

  useEffect(() => {
    if (!playing) return;
    const pinyin = window.setTimeout(() => setReveal({key: revealKey, step: 1}), pace * 250);
    const english = window.setTimeout(() => setReveal({key: revealKey, step: 2}), pace * 520);
    return () => { window.clearTimeout(pinyin); window.clearTimeout(english); };
  }, [pace, playing, revealKey]);

  useEffect(() => {
    const onVisibility = () => { if (document.hidden) setPlaying(false); };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      stopAnimation.current?.();
    };
  }, []);

  function applyFrame(target: SwipeFrame) {
    setOpenStory(undefined);
    setLens(undefined);
    if (target.character) onSelect({hanzi: target.text, part: target.anchor || undefined, slot: target.character.part?.id});
    else {
      setWordSelection({id: target.id});
      setWordAnchor(target.anchor);
      setWordVerticalAnchor(undefined);
      setWordRestoration(undefined);
    }
  }

  function applySwipe(target: SwipeFrame, direction: SwipeDirection) {
    if (!cross) {
      applyFrame(target);
      return;
    }
    setAll(false);
    if (direction === 'up' || direction === 'down') {
      const anchor = cross.horizontal && target.text.includes(cross.horizontal) ? cross.horizontal
        : otherWordHanzi(target.text, target.anchor)[0] ?? target.anchor;
      applyFrame({...target, anchor});
      setWordVerticalAnchor(target.anchor);
    } else {
      applyFrame(target);
      if (cross.vertical && target.text.includes(cross.vertical)) setWordVerticalAnchor(cross.vertical);
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
      if (complete) applySwipe(target, direction);
      setMotion(undefined);
      return;
    }
    settling.current = true;
    let timer: number | undefined;
    const draw = window.requestAnimationFrame(() => {
      setMotion({target, direction, progress: complete ? 1 : 0, settling: true, from});
      timer = window.setTimeout(() => {
        if (complete) applySwipe(target, direction);
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
    if (!playing || animationActive || storyActive) return;
    const timer = window.setTimeout(() => advance.current(), pace * 1000 - animationDuration);
    return () => window.clearTimeout(timer);
  }, [animationActive, pace, playing, revealKey, storyActive]);

  function go(direction: SwipeDirection, distance = 0) {
    if (storyActive) return;
    const target = cross ? cross.peers[direction][distance] : map.neighbours[direction];
    if (!target) return;
    setPlaying(false);
    transition(target, direction);
  }

  function play() {
    if (storyActive) return;
    if (playing) { setPlaying(false); return; }
    if (frames.length < 2 || settling.current) return;
    setFamilyOrbit(undefined);
    setLens(undefined);
    if (!next) applyFrame(frames[0]);
    setReveal(undefined);
    setPlaying(true);
  }

  function changeMode(nextMode: Mode) {
    if (mode === nextMode) return;
    setOpenStory(undefined);
    clearMotion();
    setPlaying(false);
    setError('');
    setWordHistory([]);
    setWordRestoration(undefined);
    setWordVerticalAnchor(undefined);
    if (nextMode === 'words') {
      setWordAnchor(character.data.hanzi);
      setWordSelection({});
    } else if (connections || entryWord) {
      setWordsView('swipe');
      onWordViewChange?.('swipe');
    }
    setFamilyOrbit(undefined);
    setLens(undefined);
    setMode(nextMode);
  }

  function changeWordView(view: WordView) {
    if (wordsView === view) return;
    clearMotion();
    setPlaying(false);
    setWordsView(view);
    onWordViewChange?.(view, word?.text);
  }

  function chooseWordBranch(target: SwipeFrame, from: WordBranchReturn) {
    if (!word || storyActive || settling.current) return;
    clearMotion();
    setPlaying(false);
    setWordHistory(history => [...history, {frame: word, vertical: wordVerticalAnchor, all, scope, from}]);
    setAll(false);
    applyFrame(target);
    viewport.current?.focus({preventScroll: true});
  }

  function returnToWord() {
    if (!returnWord || returnWord.scope !== scope) return;
    clearMotion();
    setPlaying(false);
    setAll(returnWord.all);
    applyFrame(returnWord.frame);
    setWordVerticalAnchor(returnWord.vertical);
    setWordRestoration(returnWord.from);
    setWordHistory(history => history.slice(0, -1));
  }

  function changeRange(full: boolean) {
    if (all === full) return;
    setOpenStory(undefined);
    clearMotion();
    setPlaying(false);
    setFamilyOrbit(undefined);
    setLens(undefined);
    setWordHistory([]);
    setWordRestoration(undefined);
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
    setWordHistory([]);
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
    if (storyActive || !event.isPrimary || event.button !== 0 || settling.current || element.closest('[data-swipe-control]')) return;
    if (mode === 'words' && !word) return;
    if (showWordBranches && !element.closest('.as-composition')) return;
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
    const selection = inside || showWordBranches ? {map, picked: true} : mapFromTarget(element, partSlot);
    const wordGlyph = showWordBranches ? element.closest('[data-swipe-anchor]')?.getAttribute('data-swipe-anchor') ?? undefined : undefined;
    gesture.current = {id: event.pointerId, x: event.clientX, y: event.clientY, slot: partSlot, inside: !!inside, badge, wordGlyph, ...selection};
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
    if (word && active.wordGlyph && !active.axis && Math.max(Math.abs(dx), Math.abs(dy)) < 10) {
      if (active.wordGlyph !== cross?.horizontal) {
        setAll(false);
        applyFrame({...word, anchor: active.wordGlyph});
        if (cross?.horizontal) setWordVerticalAnchor(cross.horizontal);
      }
      return;
    }
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
    if (inside || familyOrbit || storyActive || event.target === storyButton.current
      || (event.target as Element).closest('[data-word-branch-rail]')) return;
    const direction = arrowDirections[event.key];
    if (!direction) return;
    event.preventDefault();
    go(direction);
  }

  function openFamily(piece: AssemblyPart) {
    if (storyActive || settling.current) return;
    setPlaying(false);
    const origin = inside ? focus : {character, part: piece};
    const originalLens = inside && {...inside, active: piece.id};
    if (originalLens) setLens(originalLens);
    else {
      setAll(false);
      applyFrame(swipeCharacterFrame(origin));
    }
    if (!familyOrbit || familyOrbit.part.glyph !== piece.glyph) setFamilyLayout('compare');
    setFamilyOrbit(current => current?.part.glyph === piece.glyph
      ? current : {part: piece, origin, lens: originalLens});
  }

  function cycleFamilyComponent(offset: number) {
    if (!familyOrbit) return;
    const unique = [...new Map(parts.map(({piece}) => [piece.glyph, piece])).values()];
    if (unique.length < 2) return;
    const selected = unique.findIndex(piece => piece.glyph === familyOrbit.part.glyph);
    if (selected < 0) return;
    openFamily(unique[(selected + offset + unique.length) % unique.length]);
  }

  function chooseOrbitMember(target: SwipeFrame, direction: SwipeDirection) {
    if (target.id === current.id) return;
    setPlaying(false);
    if (comparingFamily) applyFrame(target);
    else transition(target, direction);
  }

  function returnToOrbitOrigin() {
    if (!familyOrbit) return;
    clearMotion();
    applyFrame(swipeCharacterFrame(familyOrbit.origin));
    setLens(familyOrbit.lens);
    setFamilyOrbit(undefined);
  }

  function tapPart(piece: AssemblyPart) {
    if (storyActive || settling.current) return;
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

  function startStory() {
    if (!story || animationActive || gesture.current) return;
    setPlaying(false);
    storyScroll.current = window.scrollY;
    setOpenStory({key: storyKey, focus: story.frames[0]?.focus});
  }

  function closeStory() {
    setOpenStory(undefined);
    requestAnimationFrame(() => {
      window.scrollTo({top: storyScroll.current, behavior: 'instant'});
      storyButton.current?.focus({preventScroll: true});
    });
  }

  function compareStory(hanzi: string) {
    if (relatedCharacter?.data.hanzi !== hanzi || !retainedPart) return;
    setAll(false);
    setMode('characters');
    applyFrame(swipeCharacterFrame({character: relatedCharacter, part: retainedPart}));
    requestAnimationFrame(() => viewport.current?.focus());
  }

  const revealPinyin = showPinyin && step >= 1;
  const revealMeaning = showMeaning && step >= 2;
  const inlineWordCaption = !!word && !storyActive;
  const frameCaption = <>
    <p className="as-reading" hidden={!showPinyin} data-revealed={revealPinyin || undefined}
      data-reserve={inlineWordCaption && playing && !revealPinyin ? current.pinyin : undefined}>
      {revealPinyin && <>
        {inside && <span className="as-reading-glyph" lang="zh-Hans">{current.text}</span>}{current.pinyin}
      </>}
    </p>
    <p className="as-meaning" hidden={!showMeaning} data-revealed={revealMeaning || undefined}
      data-reserve={inlineWordCaption && playing && !revealMeaning ? current.meaning : undefined}>
      {revealMeaning && <>
        {inside && !showPinyin && <span className="as-reading-glyph" lang="zh-Hans">{current.text}</span>}{current.meaning}
      </>}
    </p>
  </>;
  const contextualParts = word && contextualWordParts[word.id];
  const wordParts = contextualParts ?? (word && [...word.text].length > 1 ? [...word.text].flatMap(text => {
    const entry = index.characters.get(text);
    return entry ? [{text, pinyin: entry.data.readings.join(' / '), meaning: assemblyMeaning(entry)}] : [];
  }) : []);

  const familyView = familyOrbit && {
    anchor: familyOrbit.part.glyph,
    frames: orbitFrames,
    origin: familyOrbit.origin.character.data.hanzi !== current.text ? familyOrbit.origin.character.data.hanzi : undefined,
    pinyin: showPinyin,
    english: showMeaning,
    choose: chooseOrbitMember,
    close: () => setFamilyOrbit(undefined),
    restore: returnToOrbitOrigin,
    widen: scope !== 'all' ? widen : undefined,
    switchLayout: () => setFamilyLayout(comparingFamily ? 'orbit' : 'compare'),
  };
  const activeRegion = inspected && inspected.part.glyph === familyOrbit?.part.glyph ? inspected
    : lensParent?.part.glyph === familyOrbit?.part.glyph ? lensParent : undefined;

  const badgeButtons = orderedBadges.map(({piece, count}) =>
    <button type="button" key={piece.id} className="as-count" data-swipe-slot={piece.id}
      data-component={piece.glyph} data-family-count={count} disabled={storyActive}
      aria-pressed={inside ? inside.active === piece.id : !all && focus.part?.id === piece.id}
      aria-label={'Show family for ' + piece.glyph + ' · ' + piece.positions[0] + ' · ' + count + ' characters'}
      title={piece.glyph + ' · ' + count + ' characters'}
      style={familyOrbit || stackBadges ? undefined : badgePosition(piece)}
      onClick={event => { if (familyOrbit || !event.detail) openFamily(piece); }}>
      <span><b lang="zh-Hans">{piece.glyph}</b>{count}</span>
    </button>);

  const mapPartButtons = <div className="as-map-parts" role="group" aria-label="Component family sizes">{badgeButtons}</div>;

  return <section className="as" aria-label="Swipe Atlas" data-mode={mode} data-word-view={mode === 'words' ? wordsView : undefined} onKeyDown={event => {
    if (storyActive && event.key === 'Escape') closeStory();
  }}>
    <div className="as-toolbar">
      <div className="as-mode" role="group" aria-label="Study material">
        <button type="button" aria-pressed={mode === 'characters'} onClick={() => changeMode('characters')}>Characters</button>
        <button type="button" aria-pressed={mode === 'words'} onClick={() => changeMode('words')}>Words</button>
      </div>
      {mode === 'words' && <div className="as-mode as-word-view" role="group" aria-label="Words view">
        <button type="button" aria-pressed={!connections} onClick={() => changeWordView('swipe')}>Swipe</button>
        <button type="button" aria-pressed={connections} onClick={() => changeWordView('connections')}>Connections</button>
      </div>}
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
      {mode === 'characters' && focus.part && <button type="button" className="as-open-map" disabled={storyActive}
        aria-label="Family map" aria-expanded={!!familyOrbit} onClick={() => familyOrbit ? setFamilyOrbit(undefined)
          : openFamily(inspected?.part ?? lensParent?.part ?? focus.part!)}>
        <Orbit size={17}/><span>Family map</span>
      </button>}
    </div>
    {error && <p className="as-error" role="alert">{error}</p>}
    <div className="as-stage" data-family-layout={mapOpen ? familyLayout : undefined} data-story-open={storyActive || undefined} data-playing={playing || undefined}>
      {connections && !storyActive && returnWord?.scope === scope &&
        <button type="button" className="as-word-return" onClick={returnToWord}>
          <ChevronLeft size={17} aria-hidden="true"/> Back to <span lang="zh-Hans">{returnWord.frame.text}</span>
        </button>}
      <div className="as-viewport" ref={viewport} role="group" tabIndex={storyActive ? -1 : 0}
        aria-label={mode === 'characters' ? 'Swipe characters' : 'Swipe words'}
        aria-describedby="as-gesture-help" data-study-lookup="off" data-axis={map.vertical ? 'vertical' : 'horizontal'}
        data-depth={componentDepth} data-family-map={!!familyOrbit} data-small-family={!!familyOrbit && orbitFrames.length <= 8}
        data-large-family={!!familyOrbit && orbitFrames.length > 32 || undefined}
        data-family-peek={!storyActive && peek.length > 0 || undefined}
        data-vertical-neighbour={!showWordBranches && !inside && !familyOrbit && !!(map.neighbours.up || map.neighbours.down) || undefined}
        data-word-focus={inlineWordCaption || undefined} data-word-branches={showWordBranches || undefined}
        data-word-axis-horizontal={showWordBranches ? cross.horizontal : undefined}
        data-word-axis-vertical={showWordBranches ? cross.vertical : undefined}
        data-motion={motion ? motion.settling ? 'settling' : 'dragging' : 'rest'}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
        onLostPointerCapture={cancelPointer} onPointerCancel={cancelPointer} onKeyDown={keyDown}>
        {!comparingFamily && !inlineWordCaption && <div className="as-registration" aria-hidden="true"/>}
        {story && <button type="button" ref={storyButton} className="as-story-trigger" data-swipe-control
          aria-expanded={storyActive} aria-controls={storyAreaId}
          aria-disabled={animationActive || undefined} onClick={startStory}>
          <BookOpen size={16} aria-hidden="true"/> Story
        </button>}
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
        {familyView ? (comparingFamily
          ? <SwipeFamilyMap {...familyView} current={current} originRegion={activeRegion}
              components={mapPartButtons} cycleComponent={cycleFamilyComponent}/>
          : <SwipeFamilyOrbit key={familyView.anchor + ':' + scope} {...familyView} current={current.id} inside={!!inside}/>)
          : !storyActive && peek.length > 0 && <SwipeFamilyPeek frames={peek} pinyin={showPinyin} english={showMeaning} choose={chooseOrbitMember}/>}
        {!showWordBranches && Object.entries(swipeVectors).map(([key, [x, y]]) => {
          const direction = key as SwipeDirection;
          const target = map.neighbours[direction];
          const Icon = icons[direction];
          if (!target || inside || familyOrbit || storyActive) return null;
          const orthogonal = direction !== map.next && direction !== map.previous;
          const label = orthogonal ? target.character?.part?.positions[0] : undefined;
          return <button type="button" className="as-neighbour" key={direction} data-swipe-control data-swipe-direction={direction}
            style={{'--as-x': x, '--as-y': y, '--as-enter': motion?.direction === direction ? motion.progress : 0} as CSSProperties}
            onClick={() => go(direction)}>
            <span className="as-visually-hidden">{label ? 'Move to ' : direction === map.next ? 'Next ' : 'Previous '}
              <span lang="zh-Hans">{target.text}</span></span>
            <span className="as-peek" aria-hidden="true"><SwipeArtwork frame={target}/></span>
            <SwipeLabel frame={target} showPinyin={showPinyin} showMeaning={showMeaning}/>
            <span className="as-direction"><Icon size={15} aria-hidden="true"/>{label}</span>
          </button>;
        })}
        {comparingFamily ? null : mode === 'words' && !word ? <div className="as-empty">
          <p>No words with <span lang="zh-Hans">{wordAnchor}</span> in this HSK scope.</p>
          <button type="button" onClick={() => changeRange(true)}>Browse all words in scope</button>
        </div> : <div className="as-composition">
          <div className="as-glyph as-current" role="img" aria-label={current.text} data-character={current.text}
            style={motion && movingInk(display, motion, false)}>
            <SwipeArtwork frame={storyArtwork ?? display} interactive regions={inside ? regions : undefined}
              active={inside?.active} storyFocus={storyFocus} wordVerticalAnchor={showWordBranches ? cross.vertical : undefined}/>
          </div>
          {motion && <div className="as-glyph as-incoming" aria-hidden="true" style={movingInk(display, motion, true)}>
            <SwipeArtwork frame={motion.target}/>
          </div>}
          {inlineWordCaption && <div className="as-word-focus-caption">{frameCaption}</div>}
          {!word && !familyOrbit && <div className="as-badges" aria-label="Component family sizes" data-stack={stackBadges} hidden={!!motion}>
            {badgeButtons}
          </div>}
        </div>}
        {showWordBranches &&
          <SwipeWordBranches key={[scope, current.id, cross.horizontal, cross.vertical, all].join(':')}
            cross={cross} scope={scope} pinyin={showPinyin} english={showMeaning}
            restoration={wordRestoration} onRestored={() => setWordRestoration(undefined)}
            go={go} choose={chooseWordBranch} pause={() => setPlaying(false)}/>}
      </div>
      <div className="as-caption" aria-live="off">
        {familyOrbit && !comparingFamily && mapPartButtons}
        {!comparingFamily && (mode === 'characters' || word) && <>
          {!inlineWordCaption && frameCaption}
          {wordParts.length > 0 && (revealPinyin || revealMeaning) &&
            <div className="as-word-parts">
              <span className="as-word-parts-heading">{contextualParts ? 'In this word' : 'Individual characters · dictionary'}</span>
              {wordParts.map((frame, position) => <span className="as-word-part" key={position}>
                <strong lang="zh-Hans">{frame.text}</strong>
                {revealPinyin && frame.pinyin && <span className="as-label-reading">{frame.pinyin}</span>}
                {revealMeaning && <SwipeLabel frame={frame} showPinyin={false} showMeaning/>}
              </span>)}
            </div>}
        </>}
      </div>
      <div className="as-story-area" id={storyAreaId} ref={storyArea} hidden={!storyActive}>
        {storyActive && <AtlasSwipeStoryPanel key={story.id} story={story} showPinyin={showPinyin} showMeaning={showMeaning}
          onClose={closeStory} onCompare={retainedPart ? compareStory : undefined} onFocusPart={focus =>
            setOpenStory(active => active?.key === storyKey ? {...active, focus} : active)}/>}
      </div>
      {broadFamily && !mapOpen && <p className="as-narrow">No matches in this HSK scope. <button type="button" onClick={widen}>Show all HSK levels</button></p>}
      <div className="as-controls" role="group" aria-label="Swipe controls">
        <div className="as-playback">
          <button type="button" className="as-play" aria-label={playing ? 'Pause continuous play' : 'Play continuous'}
            disabled={storyActive || frames.length < 2} onClick={play}>
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
          aria-disabled={storyActive || !!inside || !next} onClick={() => { if (!inside && next) go(map.next); }}>
          {!all && current.anchor && <span lang="zh-Hans">{inside?.trail.at(-1)?.part.glyph ?? current.anchor}</span>}
          {map.index >= 0 ? (map.index + 1) + ' / ' + map.total : map.total + ' in scope'}
          {!inside && next && <ChevronRight size={15} aria-hidden="true"/>}
        </button>}
        <div className="as-settings" aria-label="Reveal settings" role="group">
          <label><input type="checkbox" checked={showPinyin} onChange={event => setShowPinyin(event.target.checked)}/> Pinyin</label>
          <label><input type="checkbox" checked={showMeaning} onChange={event => setShowMeaning(event.target.checked)}/> English</label>
        </div>
      </div>
    </div>
    <p className="as-help" id="as-gesture-help">
      {comparingFamily ? 'Drag the selected character sideways to browse, or up and down to switch parts.'
        : familyOrbit ? 'Drag the map to turn it. Tap any character to bring it into the centre.'
        : inside ? 'Tap a part to inspect it, or tap its count to see its family.'
        : mode === 'characters' ? 'Drag the strokes to swap a part. Tap a count to see its family.'
        : connections ? 'Swipe the centre across or up and down. Tap a hanzi to make it the horizontal link.'
        : 'Drag a hanzi to browse the words that use it.'} {!inside && !familyOrbit && !connections && 'Tap the space around it to go next.'}
    </p>
  </section>;
}
