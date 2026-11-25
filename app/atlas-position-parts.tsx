'use client';

import {useEffect, useRef, useState} from 'react';
import {ArrowRight} from 'lucide-react';
import {AssemblyThumbnail} from './atlas-assembly-glyph';
import {mappedAssemblyGroups} from './atlas-assembly-outlines';
import {assemblyMeaning, type AssemblyCharacter, type AssemblyPart} from './atlas-assembly-model';
import {extendedWords} from './atlas-cloud-extended';
import {componentById} from './atlas-model';
import type {BrowseScope} from './hsk-scope';
import {useI18n} from './i18n';
import {componentGlosses, componentNotes, memoryCues, partPosition, positionPartsCopy as copy} from './atlas-position-parts-copy';
import type {Locale} from './translate';

export const partsLayouts = ['beside', 'below', 'popup'] as const;
export type PartsLayout = typeof partsLayouts[number];
export const partsLayoutStorage = 'chineseos.atlas.positions.parts-layout';
export type PartsExample = {hanzi: string; pinyin: string; meaning: string};
type Characters = ReadonlyMap<string, AssemblyCharacter>;

const componentLabels = new Map([...componentById.values()].flatMap(component =>
  [component.glyph, ...component.aliases].map(glyph => [glyph, component.label] as const)));
const componentNames: Readonly<Record<string, string>> = {'扌': 'tíshǒupáng', '讠': 'yánzìpáng'};

function reviewedRole(parent: AssemblyCharacter, glyph: string) {
  const {phonetic, semantic} = parent.data.reviewed ?? {};
  const matches = (id: string | undefined) => {
    const component = id && componentById.get(id);
    return component && (component.glyph === glyph || component.aliases.includes(glyph));
  };
  return matches(phonetic) ? 'sound' : matches(semantic) ? 'meaning' : 'shape';
}

function options(parent: AssemblyCharacter, characters: Characters, locale: Locale) {
  return parent.parts.map(part => {
    const entry = characters.get(part.glyph);
    const note = componentNotes[parent.data.hanzi + part.glyph];
    const gloss = componentGlosses[part.glyph];
    const role = note?.role ?? reviewedRole(parent, part.glyph);
    const meaning = gloss?.meaning[locale] || componentLabels.get(part.glyph)?.[locale] || (entry && assemblyMeaning(entry, true));
    return {
      part, role, meaning,
      text: note?.text[locale] ?? copy[role === 'sound' ? 'soundNote' : role === 'meaning' ? 'meaningNote' : 'shapeNote'][locale],
      pinyin: componentNames[part.glyph] ?? gloss?.pinyin ?? entry?.data.readings[0],
    };
  });
}

// These two drawings use the same ten-stroke sequence for the right-hand 般.
// Other nested parts get their own outline unless a matching full-character map is available.
function nestedStrokes(character: AssemblyCharacter, part: AssemblyPart, branch: AssemblyCharacter, subpart: AssemblyPart) {
  if (character.data.hanzi !== '搬' || part.glyph !== '般') return;
  const parentStrokes = mappedAssemblyGroups(character)?.[character.parts.indexOf(part)];
  const childStrokes = mappedAssemblyGroups(branch)?.[branch.parts.indexOf(subpart)];
  if (parentStrokes?.length === 10 && childStrokes?.every(i => i < parentStrokes.length)) {
    return childStrokes.map(i => parentStrokes[i]);
  }
}

function PartsRows({parent, selected, select, characters, locale}: {
  parent: AssemblyCharacter; selected?: string; select: (id: string) => void;
  characters: Characters; locale: Locale;
}) {
  return <ul className="ab-parts-rows" aria-label={copy.title[locale] + ' · ' + parent.data.hanzi}>
    {options(parent, characters, locale).map(({part, role, meaning, text, pinyin}) => <li key={part.id}>
      <button type="button" aria-pressed={selected === part.id} data-breakdown-part={part.glyph} onClick={() => select(part.id)}>
        <span lang="zh-Hans" className="ab-hanzi">{part.glyph}</span>
        <span className="ab-part-label">
          {(pinyin || meaning || part.glyph === '？') &&
            <strong>{[pinyin, meaning].filter(Boolean).join(' · ') || copy.unknown[locale]}</strong>}
          <small>{partPosition(part.positions[0], locale)}</small>
        </span>
        <small className="ab-part-role">{copy[role][locale]}</small>
      </button>
      {selected === part.id && <p className="ab-part-explanation">{text}</p>}
    </li>)}
  </ul>;
}

function CharacterBreakdown({character, characters, familyPart}: {
  character: AssemblyCharacter; characters: Characters; familyPart: string;
}) {
  const {locale} = useI18n();
  const [selected, setSelected] = useState<string>();
  const [trail, setTrail] = useState<string[]>([]);
  const initial = character.parts.find(part => part.glyph !== familyPart && part.glyph !== '？') ?? character.parts[0];
  const part = character.parts.find(part => part.id === selected) ?? initial;
  const firstBranch = part && part.glyph !== character.data.hanzi ? characters.get(part.glyph) : undefined;

  // A level is shown only when the chosen component has a structural record.
  const branches = [];
  const seen = new Set([character.data.hanzi]);
  let branch = firstBranch;
  for (let depth = 0; branch?.parts.length && !seen.has(branch.data.hanzi); depth++) {
    seen.add(branch.data.hanzi);
    const active = branch.parts.find(item => item.id === trail[depth]);
    branches.push({character: branch, active});
    branch = active ? characters.get(active.glyph) : undefined;
  }
  const first = branches[0];
  const emphasis = part && first?.active ? nestedStrokes(character, part, first.character, first.active) : undefined;
  const memory = memoryCues[character.data.hanzi]?.[locale];
  const sourced = ['看', '打', '找', '拍', '拿', '搬', '话'].includes(character.data.hanzi);
  const reading = character.data.readings[0];
  const meaning = character.data.meaning || assemblyMeaning(character);
  return <>
    <div className="ab-breakdown-main">
      <div className="ab-breakdown-glyph">
        <AssemblyThumbnail character={character} active={item => item.id === part?.id} activeStrokes={emphasis}/>
        {reading && <strong lang="zh-Latn-pinyin">{reading}</strong>}
        {meaning && <span>{meaning}</span>}
      </div>
      {part ? <PartsRows parent={character} characters={characters} selected={part.id}
        select={id => {setSelected(id); setTrail([]);}} locale={locale}/> : <p>{copy.empty[locale]}</p>}
    </div>
    {branches.map(({character: inner, active}, depth) => <section className="ab-inside-part" key={inner.data.hanzi}>
      <h5>{copy.inside[locale]} <span lang="zh-Hans" className="ab-hanzi">{inner.data.hanzi}</span></h5>
      <div className="ab-inside-layout">
        {active && <div className="ab-breakdown-glyph">
          <AssemblyThumbnail character={inner} active={item => item.id === active.id}/>
        </div>}
        <PartsRows parent={inner} characters={characters} selected={active?.id}
          select={id => setTrail([...trail.slice(0, depth), id])} locale={locale}/>
      </div>
    </section>)}
    {(memory || sourced) && <div className="ab-breakdown-notes">
      {memory && <details><summary>{copy.cue[locale]}</summary><p>{memory}</p></details>}
      {sourced && <a href={'https://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/search.php?word=' + encodeURIComponent(character.data.hanzi)}
        target="_blank" rel="noreferrer">{copy.source[locale]}</a>}
    </div>}
  </>;
}

export function PositionParts({character, characters, familyPart, example, scope, close, showWords}: {
  character: AssemblyCharacter; characters: Characters; familyPart: string; example?: PartsExample;
  scope: BrowseScope; close?: () => void; showWords: (hanzi: string) => void;
}) {
  const {locale} = useI18n();
  const [wordMode, setWordMode] = useState(false);
  const [wordGlyph, setWordGlyph] = useState(character.data.hanzi);
  const title = useRef<HTMLHeadingElement>(null);
  const studied = character.data.hanzi;
  const preferred = studied === '打' ? '打电话' : example?.hanzi;
  const vocabulary = extendedWords(studied, locale, scope).filter(item => Array.from(item.hanzi).length > 1);
  const item = vocabulary.find(word => word.hanzi === preferred) ?? vocabulary[0];
  const word = item ? {hanzi: item.hanzi, pinyin: item.pinyin, meaning: item.english} : example;
  const wordCharacters = word ? Array.from(new Set(word.hanzi)).flatMap(glyph => characters.get(glyph) ?? []) : [];
  const canInspectWord = wordCharacters.length > 1;
  const shown = wordMode && canInspectWord ? characters.get(wordGlyph) ?? character : character;

  useEffect(() => {
    if (!close) return;
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && title.current?.closest('.ab-family')?.contains(document.activeElement)) {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [close]);

  return <section id="ab-position-breakdown" className="ab-breakdown" aria-labelledby="ab-position-breakdown-title">
    <header className="ab-breakdown-head">
      <h4 id="ab-position-breakdown-title" ref={title}>{copy.title[locale]} <span lang="zh-Hans" className="ab-hanzi">{shown.data.hanzi}</span></h4>
      {close && <button type="button" onClick={close}>{copy.close[locale]}</button>}
    </header>
    {canInspectWord && <div className="ab-breakdown-modes" role="group" aria-label={copy.title[locale]}>
      <button type="button" aria-pressed={!wordMode} onClick={() => setWordMode(false)}>{copy.character[locale]}</button>
      <button type="button" aria-pressed={wordMode} onClick={() => setWordMode(true)}>{copy.word[locale]}</button>
    </div>}
    {wordMode && canInspectWord && word && <div className="ab-word-parts">
      <p><strong lang="zh-Hans" className="ab-hanzi">{word.hanzi}</strong>
        <span lang="zh-Latn-pinyin">{word.pinyin}</span><span>{word.meaning}</span></p>
      <div role="group" aria-label={word.hanzi}>
        {wordCharacters.map(entry => <button type="button" key={entry.data.hanzi} aria-pressed={shown === entry}
          onClick={() => setWordGlyph(entry.data.hanzi)}>
          <span lang="zh-Hans" className="ab-hanzi">{entry.data.hanzi}</span>
          {entry.data.readings[0] && <small lang="zh-Latn-pinyin">{entry.data.readings[0]}</small>}
        </button>)}
      </div>
    </div>}
    <CharacterBreakdown key={shown.data.hanzi + familyPart} character={shown} characters={characters} familyPart={familyPart}/>
    <div className="ab-breakdown-example">
      {!wordMode && word && <div>
        <small>{copy.example[locale]}</small>
        <p><strong lang="zh-Hans" className="ab-hanzi">{word.hanzi}</strong> <span lang="zh-Latn-pinyin">{word.pinyin}</span></p>
        <span>{word.meaning}</span>
      </div>}
      <button type="button" onClick={() => showWords(studied)}>
        {copy.words[locale]} <span lang="zh-Hans">{studied}</span><ArrowRight size={15} aria-hidden="true"/>
      </button>
    </div>
  </section>;
}
