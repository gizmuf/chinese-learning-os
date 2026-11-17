import {cloudWords, type CloudLevel, type CloudWord} from './atlas-cloud-model';
import {HanziGroupPdf} from './hanzi-group-pdf';
import HanziQuickReview from './hanzi-quick-review';
import type {HanziGroupPdfEntry} from './notebook-pdf';
import './atlas-family-study-actions.css';

export function atlasWordStudyEntries(words: readonly CloudWord[], scope: CloudLevel) {
  const englishById = new Map(cloudWords('en', scope).map(word => [word.id, word.meaning]));
  return words.map(({id, hanzi, pinyin}) => ({hanzi, pinyin, meaning: englishById.get(id) ?? ''}));
}

export default function AtlasFamilyStudyActions({entries, title}: {
  entries: readonly HanziGroupPdfEntry[];
  title: string;
}) {
  if (!entries.length) return null;
  return <div className="atlas-family-study-actions">
    <HanziGroupPdf entries={entries} title={title}/>
    <HanziQuickReview entries={entries}/>
  </div>;
}
