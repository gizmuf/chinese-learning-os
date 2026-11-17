'use client';

import { HanziGroupPdf } from './hanzi-group-pdf';
import HanziQuickReview from './hanzi-quick-review';

type LessonEntry = { hanzi: string; pinyin: string } & ({ meaning: { en: string } } | { english: string });

export default function LessonGroupActions({ title, entries }: {
  title: string;
  entries: readonly LessonEntry[];
}) {
  if (!entries.length) return null;
  const cards = entries.map(({ hanzi, pinyin, ...translation }) => ({
    hanzi,
    pinyin,
    meaning: 'english' in translation ? translation.english : translation.meaning.en,
  }));

  return <div className="course-actions">
    <HanziGroupPdf entries={cards} title={title}/>
    <HanziQuickReview entries={cards}/>
  </div>;
}
