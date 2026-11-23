'use client';

import {useMemo, useState} from 'react';
import {Search} from 'lucide-react';
import {useI18n} from './i18n';
import HanziQuickReview from './hanzi-quick-review';
import {useStudyLookup} from './study-lookup-context';
import {libraryVocabularyGroups, searchVocabularyGroups, type VocabularyGrouping} from './library-vocabulary-groups-model';
import type {BrowseScope} from './hsk-scope';
import './library-vocabulary-groups.css';

const pageSize = 14;

export default function LibraryVocabularyGroups({scope}: {scope: BrowseScope}) {
  const {locale} = useI18n();
  const lookup = useStudyLookup();
  const [kind, setKind] = useState<VocabularyGrouping>('component');
  const [onlyLevel, setOnlyLevel] = useState(false);
  const [query, setQuery] = useState('');
  const [shown, setShown] = useState(pageSize);
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
        {group.entries.map(({word, highlights}) => <li key={word.id} data-vocabulary-word={word.hanzi}>
          <button type="button" lang="zh-Hans" className="lvg-hanzi" aria-label={'Definition of ' + word.hanzi}
            onClick={event => lookup?.open(word.hanzi, event.currentTarget)}>
            {[...word.hanzi].map((glyph, position) => highlights.includes(glyph)
              ? <mark key={position}>{glyph}</mark> : glyph)}
          </button>
          <span className="lvg-pinyin">{word.pinyin}</span>
          <span className="lvg-meaning">{word.meaning}</span>
          <small className="lvg-hsk">HSK {word.level === '7-9' ? '7–9' : word.level}</small>
        </li>)}
      </ul>
    </section>)}
    {!results.length && <p className="lvg-total">No group matches your search.</p>}
    {results.length > shown && <button className="secondary lvg-more" type="button"
      onClick={() => setShown(count => count + pageSize)}>Show more groups</button>}
  </section>;
}
