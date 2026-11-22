'use client';

import {memo, type CSSProperties} from 'react';
import familyStrokes from '../data/atlas-swipe-shared-strokes.json';
import type {SwipeRegion} from './atlas-swipe-regions';
import {useAssemblyOutline} from './atlas-assembly-glyph';
import {type CharacterFrame, type SwipeDirection, type SwipeFrame, swipeVectors} from './atlas-swipe-model';

const supplementalStrokes: Record<string, {
  anchor: string;
  strokeCount: number;
  strokes: {index: number; path: string}[];
}> = familyStrokes.entries;

export type SwipeMotion = {
  target: SwipeFrame;
  direction: SwipeDirection;
  progress: number;
  settling: boolean;
  from?: SwipeFrame;
};

function CharacterInk({focus, interactive, regions, active, storyFocus, familyAnchor}: {
  focus: CharacterFrame; interactive: boolean; regions?: SwipeRegion[]; active?: string; storyFocus?: string; familyAnchor?: string;
}) {
  const {character, part} = focus;
  const {strokes, groups} = useAssemblyOutline(character);
  const glyph = character.data.hanzi;
  const wholeHighlight = storyFocus === glyph || undefined;
  if (!strokes) return <span className="as-fallback as-piece" lang="zh-Hans" data-story-highlight={wholeHighlight}>{glyph}</span>;
  const nested = groups && regions?.length ? regions : undefined;
  const outlined = nested ?? (groups && character.parts.map((piece, index) => ({part: piece, strokes: groups[index]})));
  // Supplemental source assignments cover known shared strokes when other strokes are unassigned.
  const supplement = familyAnchor && !outlined ? supplementalStrokes[glyph] : undefined;
  const verified = supplement && supplement.anchor === familyAnchor && supplement.strokeCount === strokes.length
    && supplement.strokes.every(({index, path}) => strokes[index] === path);
  const sharedStrokes = new Set(verified ? supplement.strokes.map(({index}) => index) : []);
  const keepWhole = part?.id === 'whole' && (!familyAnchor || familyAnchor === glyph);
  const familyHighlight = outlined?.some(region => region.part.glyph === familyAnchor) || sharedStrokes.size > 0 || keepWhole;
  const nestedStrokes = new Set(nested?.flatMap(region => region.strokes));
  const highlightPart = outlined?.some(({part: piece}) => storyFocus === piece.glyph);
  return <svg viewBox="0 0 1024 1024" aria-hidden="true" focusable="false" className="as-paths"
    data-family-unmapped={familyAnchor && !familyHighlight || undefined}>
    {nested && <g className="as-piece as-context-ink" data-story-highlight={wholeHighlight ?? (highlightPart ? false : undefined)}>
      <g transform="translate(0 900) scale(1 -1)">
        {strokes.map((path, index) => !nestedStrokes.has(index) && <path key={index} d={path}/>)}
      </g>
    </g>}
    {outlined ? outlined.map(({part: piece, strokes: indexes}) =>
      <g key={piece.id} className="as-piece" data-kept={nested ? !active || active === piece.id : familyAnchor ? piece.glyph === familyAnchor : piece.id === part?.id}
        data-swipe-slot={interactive ? piece.id : undefined} data-piece={piece.glyph}
        data-inside-position={nested ? piece.positions[0] : undefined}
        data-story-highlight={wholeHighlight ?? (highlightPart ? storyFocus === piece.glyph : undefined)}>
        <g transform="translate(0 900) scale(1 -1)">
          {indexes.map(stroke => <path key={stroke} d={strokes[stroke]}/>)}
        </g>
      </g>) : <g className="as-piece" data-kept={keepWhole} data-story-highlight={wholeHighlight}>
      <g transform="translate(0 900) scale(1 -1)">{strokes.map((path, index) =>
        <path key={index} d={path} className={sharedStrokes.has(index) ? 'as-piece' : undefined}
          data-kept={sharedStrokes.has(index) || undefined}/>)}</g>
    </g>}
  </svg>;
}

export const SwipeArtwork = memo(function SwipeArtwork({frame, interactive = false, regions, active, storyFocus, familyAnchor, wordVerticalAnchor}: {
  frame: SwipeFrame; interactive?: boolean; regions?: SwipeRegion[]; active?: string; storyFocus?: string; familyAnchor?: string;
  wordVerticalAnchor?: string;
}) {
  if (frame.character) return <CharacterInk focus={frame.character} interactive={interactive}
    regions={regions} active={active} storyFocus={storyFocus} familyAnchor={familyAnchor}/>;
  const glyphs = Array.from(frame.text);
  const wholeHighlight = storyFocus === frame.text;
  const highlightGlyph = !!storyFocus && glyphs.includes(storyFocus);
  return <span className="as-word-ink" style={{'--as-length': glyphs.length} as CSSProperties} lang="zh-Hans">
    {glyphs.map((glyph, position) => <span key={position} className="as-piece" data-kept={glyph === frame.anchor}
      data-swipe-anchor={interactive ? glyph : undefined}
      data-word-vertical={glyph === wordVerticalAnchor || undefined}
      data-story-highlight={wholeHighlight || (highlightGlyph ? storyFocus === glyph : undefined)}>{glyph}</span>)}
  </span>;
});

export function movingInk(frame: SwipeFrame, motion: SwipeMotion, incoming: boolean): CSSProperties {
  const {progress, direction, target} = motion;
  const [x, y] = swipeVectors[direction];
  const shared = !!frame.anchor && frame.anchor === target.anchor;
  const shift = incoming ? (1 - progress) * 510 : -progress * 420;
  const fade = incoming ? progress : 1 - progress;
  const fixed = !!motion.from && shared;
  const oldPart = frame.character?.part?.box;
  const nextPart = target.character?.part?.box;
  const shiftKept = incoming ? progress - 1 : progress;
  const pinX = shared && !fixed && oldPart && nextPart
    ? (nextPart.x + nextPart.w / 2 - oldPart.x - oldPart.w / 2) * 920 * shiftKept : 0;
  const pinY = shared && !fixed && oldPart && nextPart
    ? (nextPart.y + nextPart.h / 2 - oldPart.y - oldPart.h / 2) * 920 * shiftKept : 0;
  return {
    '--as-path-x': x * shift + 'px', '--as-path-y': y * shift + 'px',
    '--as-text-x': x * shift / 13 + '%', '--as-text-y': y * shift / 13 + '%',
    '--as-piece-opacity': fade,
    '--as-kept-x': (shared ? pinX : x * shift) + 'px',
    '--as-kept-y': (shared ? pinY : y * shift) + 'px',
    '--as-kept-opacity': fixed ? (incoming ? 0 : 1)
      : shared ? Math.min(1, Math.max(0, incoming ? (progress - .48) * 1.93 : (1 - progress) * 2)) : fade,
    '--as-kept-text-x': shared ? '0%' : x * shift / 13 + '%',
    '--as-kept-text-y': shared ? '0%' : y * shift / 13 + '%',
  } as CSSProperties;
}
