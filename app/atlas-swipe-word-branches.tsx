import {useLayoutEffect, useMemo, useRef, useState} from 'react';
import {SwipeLabel} from './atlas-swipe-label';
import type {SwipeDirection, SwipeFrame} from './atlas-swipe-model';
import {wordBranches, type WordCross} from './atlas-swipe-word-branches-model';
import type {BrowseScope} from './hsk-scope';
import './atlas-swipe-word-branches.css';

type Side = 'left' | 'right';
const sides: Side[] = ['left', 'right'];
const directions: SwipeDirection[] = ['up', 'left', 'right', 'down'];
const directionNames = {up: 'Above', left: 'Left', right: 'Right', down: 'Below'};

export type WordBranchReturn = {
  side: Side; word: SwipeFrame; scroll: Record<Side, number>; candidates: Partial<Record<Side, string>>;
};

function LinkedWord({word, anchor, vertical, pinyin, english}: {
  word: SwipeFrame; anchor: string; vertical?: boolean; pinyin: boolean; english: boolean;
}) {
  return <>
    <span className="as-branch-word" lang="zh-Hans">{Array.from(word.text).map((glyph, position) =>
      <span key={position} data-branch-shared={anchor === glyph ? vertical ? 'vertical' : 'horizontal' : undefined}>{glyph}</span>)}</span>
    <SwipeLabel frame={word} showPinyin={pinyin} showMeaning={english}/>
  </>;
}

export function SwipeWordBranches({cross, scope, pinyin, english, restoration, onRestored, go, choose, pause}: {
  cross: WordCross; scope: BrowseScope; pinyin: boolean; english: boolean;
  restoration?: WordBranchReturn;
  onRestored: () => void;
  go: (direction: SwipeDirection, distance: number) => void;
  choose: (word: SwipeFrame, from: WordBranchReturn) => void;
  pause: () => void;
}) {
  const rails = useRef<Partial<Record<Side, HTMLDivElement | null>>>({});
  const [sources, setSources] = useState<Partial<Record<Side, string>>>(() => restoration?.candidates ?? {});
  const branches = useMemo(() => sides.map(side => ({
    side,
    options: cross.peers[side].map(candidate => ({
      candidate,
      groups: cross.horizontal ? wordBranches(candidate, cross.horizontal, scope) : [],
    })).filter(option => option.groups.length),
  })), [cross, scope]);

  useLayoutEffect(() => {
    if (!restoration) return;
    for (const side of sides) {
      const rail = rails.current[side];
      if (rail) rail.scrollTop = restoration.scroll[side];
    }
    const goBack = Array.from(rails.current[restoration.side]?.querySelectorAll<HTMLButtonElement>('[data-branch-result]') ?? [])
      .find(button => button.dataset.branchResult === restoration.word.id && button.dataset.branchAnchor === restoration.word.anchor);
    goBack?.focus({preventScroll: true});
    onRestored();
  }, [onRestored, restoration]);

  return <>
    {directions.map(direction => {
      const vertical = direction === 'up' || direction === 'down';
      const anchor = vertical ? cross.vertical : cross.horizontal;
      const peers = cross.peers[direction];
      if (!anchor || !peers.length) return null;
      return <div className="as-word-axis" key={direction} role="group" aria-label={directionNames[direction] + ' · words with ' + anchor}
        data-word-axis={direction} data-word-axis-anchor={anchor} data-swipe-control>
        {peers.map((word, distance) =>
          <button type="button" className="as-axis-word" key={word.id} onClick={() => go(direction, distance)}
            data-swipe-direction={direction} data-word-distance={distance} data-word-peer={word.text}>
            <LinkedWord word={word} anchor={anchor} vertical={vertical} pinyin={pinyin} english={english}/>
          </button>)}
      </div>;
    })}
    {branches.map(({side, options}) => {
      const active = options.find(option => option.candidate.id === sources[side]) ?? options[0];
      if (!active) return null;
      return <section className="as-word-branch" key={side} data-word-branch-rail={side}
        data-word-branch-candidate={active.candidate.text} data-swipe-control onPointerDown={pause} onWheel={pause}
        aria-label={'Words linked through ' + active.candidate.text}>
        {options.length > 1 && <div className="as-branch-sources" role="group" aria-label={'Choose ' + side + ' word family'}>
          {options.map(({candidate, groups}) =>
            <button type="button" key={candidate.id} aria-pressed={active.candidate.id === candidate.id}
              aria-label={'Other hanzi in ' + candidate.text} lang="zh-Hans" onClick={() => {
                setSources(previous => ({...previous, [side]: candidate.id}));
                const rail = rails.current[side];
                if (rail) rail.scrollTop = 0;
              }}>{groups.map(group => group.anchor).join(' · ')}</button>)}
        </div>}
        <div className="as-branch-list" data-word-branch-scroll={side} ref={node => {rails.current[side] = node;}}
          role="group" aria-label={'Related words for ' + active.candidate.text} tabIndex={0} onKeyDown={pause}>
          {active.groups.map(({anchor, words}) =>
            <section key={anchor} className="as-branch-group" data-branch-group={anchor} aria-label={'Words with ' + anchor}>
              <h3 className="as-branch-heading">With <span lang="zh-Hans">{anchor}</span></h3>
              {words.length ? words.map(word =>
                <button type="button" key={word.id} className="as-branch-result" data-branch-result={word.id}
                  data-branch-anchor={anchor} onClick={() => choose(word, {side, word, candidates: sources, scroll: {
                    left: rails.current.left?.scrollTop ?? 0,
                    right: rails.current.right?.scrollTop ?? 0,
                  }})}>
                  <LinkedWord word={word} anchor={anchor} pinyin={pinyin} english={english}/>
                </button>) : <p className="as-branch-empty">No other words in this HSK scope.</p>}
            </section>)}
        </div>
      </section>;
    })}
  </>;
}
