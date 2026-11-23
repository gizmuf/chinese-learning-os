'use client';

import {useMemo, useState} from 'react';
import {Eye, Search} from 'lucide-react';
import {useI18n} from './i18n';
import HanziQuickReview from './hanzi-quick-review';
import {useWordAids} from './use-word-aids';
import {useStudyLookup} from './study-lookup-context';
import {libraryVocabularyGroups, searchVocabularyGroups, type VocabularyGrouping} from './library-vocabulary-groups-model';
import type {BrowseScope} from './hsk-scope';
import './library-vocabulary-groups.css';

const pageSize = 14;
const wordAidsKey = 'chinese-os:word-groups:word-aids';

export default function LibraryVocabularyGroups({scope}: {scope: BrowseScope}) {
  const {locale} = useI18n();
  const lookup = useStudyLookup();
  const [kind, setKind] = useState<VocabularyGrouping>('component');
  const [onlyLevel, setOnlyLevel] = useState(false);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(pageSize);
  const {aids, toggleAid, rowAids, toggleRow} = useWordAids<string>(wordAidsKey);
  const meaningLabel = {en:'English', fr:'Français', ru:'Русский', tr:'Türkçe'}[locale];
  const model = useMemo(() => libraryVocabularyGroups(locale, scope, onlyLevel, kind),
    [locale, scope, onlyLevel, kind]);
  const results = searchVocabularyGroups(model, query);
  const reviewEntries = results.flatMap(group => group.entries.map(({word}) => word));

  return <section className="lvg" aria-label="Grouped HSK vocabulary">
    <div className="lvg-controls">
      <div className="lvg-modes" role="group" aria-label="Group by">
        <button type="button" aria-pressed={kind === 'component'}
          onClick={() => { setKind('component'); setShown(pageSize); }}>Shared component</button>
        <button type="button" aria-pressed={kind === 'hanzi'}
          onClick={() => { setKind('hanzi'); setShown(pageSize); }}>Shared character</button>
      </div>
      {scope !== 'all' && scope !== 1 && <label className="lvg-level">
        <input type="checkbox" checked={onlyLevel}
          onChange={event => { setOnlyLevel(event.target.checked); setShown(pageSize); }}/>
        HSK {scope === '7-9' ? '7–9' : scope} only
      </label>}
      <label className="lvg-search">
        <Search size={17} aria-hidden="true"/>
        <input type="search" aria-label="Find a word group" placeholder="Find a word or part"
          value={query} onChange={event => { setQuery(event.target.value); setShown(pageSize); }}/>
      </label>
    </div>
    <div className="lvg-results">
      <div className="lvg-modes lvg-aids" role="group" aria-label="Words display">
        <button type="button" aria-pressed={aids.pinyin} onClick={() => toggleAid('pinyin')}>Pinyin</button>
        <button type="button" aria-pressed={aids.english} onClick={() => toggleAid('english')}>{meaningLabel}</button>
      </div>
      <p className="lvg-total" role="status">
        {query.trim() ? `${results.length} matching ${results.length === 1 ? 'group' : 'groups'}` : model.total.toLocaleString() + ' vocabulary entries'}
      </p>
      <HanziQuickReview entries={reviewEntries}/>
    </div>
    {results.slice(0, shown).map(group => <section className="lvg-group" key={group.id} data-group={group.id}>
      <header className="lvg-group-tools">
        <h2>
          <span lang={group.kind === 'pinyin' ? undefined : 'zh-Hans'}>{group.label}</span>
          <small>{group.kind === 'pinyin' ? 'Pinyin' : group.entries.length + ' words'}</small>
        </h2>
        <HanziQuickReview entries={group.entries.map(({word}) => word)}/>
      </header>
      <ul>
        {group.entries.map(({word, highlights}) => {
          const {pinyin, english} = rowAids(word.id);
          const showBoth = !(pinyin && english);
          return <li key={word.id} data-vocabulary-word={word.hanzi}>
            <button type="button" lang="zh-Hans" className="lvg-hanzi" aria-label={'Definition of ' + word.hanzi}
              onClick={event => lookup?.open(word.hanzi, event.currentTarget)}>
              {[...word.hanzi].map((glyph, position) => highlights.includes(glyph)
                ? <mark key={position}>{glyph}</mark> : glyph)}
            </button>
            <button type="button" className="lvg-row-hints" aria-pressed={pinyin && english}
              aria-label={(showBoth ? 'Show' : 'Hide') + ' pinyin and ' + meaningLabel + ' for ' + word.hanzi}
              onClick={() => toggleRow(word.id)}>
              {pinyin && <span className="lvg-pinyin" lang="zh-Latn-pinyin">{word.pinyin}</span>}
              {english && <span className="lvg-meaning" lang={locale}>{word.meaning}</span>}
              {!pinyin && !english && <span className="lvg-hint-label"><Eye size={16} aria-hidden="true"/>Show hints</span>}
              <small className="lvg-hsk">HSK {word.level === '7-9' ? '7–9' : word.level}</small>
            </button>
          </li>;
        })}
      </ul>
    </section>)}
    {!results.length && <p className="lvg-total">No group matches your search.</p>}
    {results.length > shown && <button className="secondary lvg-more" type="button"
      onClick={() => setShown(count => count + pageSize)}>Show more groups</button>}
  </section>;
}
