import {useI18n} from './i18n';
import {
  grammarCounts, grammarCoverage, grammarCoverageTotals, grammarSyllabusHref, grammarSyllabusPages,
  type GrammarLevel,
} from './grammar-curriculum';
import type {GrammarUnit} from './grammar-foundations';

export const curriculumCopy = {
  en: {
    title: 'HSK 1–3 grammar',
    intro: 'Build from basic Mandarin sentences to comparisons, complements and connected ideas.',
    legacy: 'Existing HSK 3 course. The syllabus links identify specific rules where the material matches.',
    levels: 'Grammar by level', overview: 'Lessons', checklist: 'Syllabus checklist',
    syllabus: 'Official HSK 3.0 syllabus', pages: 'pp.',
    syllabusNote: 'Topics group related syllabus rules. Linked lessons cover the construction or a stated subset. A missing link means this course has no lesson mapped to that row.',
    topics: 'topics', cards: 'lesson cards', exercises: 'exercises', linked: 'topics with linked material',
    full: 'Guided practice', partial: 'Partial coverage', covers: 'Practice covers', gap: 'Lesson needed',
    outside: 'This topic is outside your current HSK scope.', widen: 'Include this level',
    guide: 'Open guideline and exercise',
  },
  fr: {
    title: 'Grammaire HSK 1–3',
    intro: 'Des phrases simples aux comparaisons, compléments et liens entre les idées en mandarin.',
    legacy: 'Cours HSK 3 existant. Les liens du programme indiquent les règles abordées.',
    levels: 'Grammaire par niveau', overview: 'Leçons', checklist: 'Liste du programme',
    syllabus: 'Programme officiel HSK 3.0', pages: 'p.',
    syllabusNote: 'Les thèmes regroupent des règles du programme. Un lien présente la structure ou une partie du thème. Sans lien, aucune leçon du cours n’est associée à ce thème.',
    topics: 'thèmes', cards: 'fiches', exercises: 'exercices', linked: 'thèmes avec un lien',
    full: 'Pratique guidée', partial: 'Couverture partielle', covers: 'Exercice sur', gap: 'Leçon à créer',
    outside: 'Ce thème dépasse votre niveau HSK sélectionné.', widen: 'Inclure ce niveau',
    guide: 'Ouvrir la règle et l’exercice',
  },
  ru: {
    title: 'Грамматика HSK 1–3',
    intro: 'От простых предложений к сравнениям, дополнениям и связному высказыванию на китайском.',
    legacy: 'Существующий курс HSK 3. Ссылки в программе указывают на конкретные изучаемые правила.',
    levels: 'Грамматика по уровням', overview: 'Уроки', checklist: 'Список тем программы',
    syllabus: 'Официальная программа HSK 3.0', pages: 'с.',
    syllabusNote: 'Темы объединяют близкие правила. Ссылка ведёт к уроку по конструкции или её части. Без ссылки урок к теме пока не привязан.',
    topics: 'темы', cards: 'карточки', exercises: 'упражнения', linked: 'темы со ссылками',
    full: 'Упражнение с подсказкой', partial: 'Частично', covers: 'В упражнении', gap: 'Требуется урок',
    outside: 'Эта тема выходит за выбранный диапазон HSK.', widen: 'Включить этот уровень',
    guide: 'Открыть правило и упражнение',
  },
  tr: {
    title: 'HSK 1–3 dil bilgisi',
    intro: 'Basit Çince cümlelerden karşılaştırmalara, tümleçlere ve düşünceleri birbirine bağlamaya ilerleyin.',
    legacy: 'Mevcut HSK 3 kursu. Program bağlantıları içeriğin karşılık geldiği kuralları gösterir.',
    levels: 'Seviyeye göre dil bilgisi', overview: 'Dersler', checklist: 'Program listesi',
    syllabus: 'Resmî HSK 3.0 programı', pages: 's.',
    syllabusNote: 'Konular ilgili kuralları gruplar. Bağlantı, yapıyı veya bir bölümünü ele alan derse açılır. Bağlantı yoksa bu konuya bir ders atanmamıştır.',
    topics: 'konu', cards: 'ders kartı', exercises: 'alıştırma', linked: 'bağlantılı konu',
    full: 'Rehberli alıştırma', partial: 'Kısmi kapsam', covers: 'Alıştırma konusu', gap: 'Ders gerekiyor',
    outside: 'Bu konu seçili HSK kapsamının dışında.', widen: 'Bu seviyeyi dahil et',
    guide: 'Kuralı ve alıştırmayı aç',
  },
};

export type GrammarStudyGroup = {level: GrammarLevel; units: GrammarUnit[]};

export default function GrammarOverview({groups, checklist, onChecklist, onOpen}: {
  groups: GrammarStudyGroup[];
  checklist: boolean;
  onChecklist: (checklist: boolean) => void;
  onOpen: (unitId: string, cardId: string | undefined, origin: string) => void;
}) {
  const {locale} = useI18n();
  const t = curriculumCopy[locale];

  function openCard(cardId: string, units: GrammarUnit[], origin: string) {
    const unit = units.find(item => item.cards.some(card => card.id === cardId));
    if (unit) onOpen(unit.id, cardId, origin);
  }

  return <div className="grammar-curriculum" aria-label={t.levels}>
    <div className="grammar-overview-switch" role="group" aria-label={t.levels}>
      <button className="secondary" aria-pressed={!checklist} onClick={() => onChecklist(false)}>{t.overview}</button>
      <button className="secondary" aria-pressed={checklist} onClick={() => onChecklist(true)}>{t.checklist}</button>
    </div>
    {checklist && <p className="grammar-syllabus-note">{t.syllabusNote} <a href={grammarSyllabusHref}>{t.syllabus} ↗</a></p>}
    {groups.map(({level, units}) => {
      const count = grammarCounts(units);
      const coverage = grammarCoverageTotals(level);
      const cards = new Map(units.flatMap(unit => unit.cards.map(card => [card.id, card])));
      return <section className="grammar-level" key={level} aria-labelledby={'grammar-level-' + level}>
        <header className="grammar-level-heading">
          <h2 id={'grammar-level-' + level}>HSK {level}</h2>
          <p>{checklist ? <>{coverage.linked} / {coverage.topics} {t.linked} · {t.pages} {grammarSyllabusPages[level]}</>
            : <>{count.topics} {t.topics} · {count.cards} {t.cards} · {count.exercises} {t.exercises}</>}</p>
        </header>
        {!checklist && level === 3 && <p className="grammar-syllabus-note">{t.legacy}</p>}
        {checklist ? <ul className="grammar-coverage">
          {grammarCoverage[level].map((item, index) => {
            const origin = 'grammar-coverage-' + level + '-' + index;
            const card = item.card ? cards.get(item.card) : undefined;
            return <li key={item.label}>
              <div><strong lang="en">{item.label}</strong><p lang="zh-Hans">{item.patterns}</p>
                {item.partial && card && <p className="grammar-coverage-example">{t.covers} <span lang="zh-Hans">{card.pattern}</span></p>}
              </div>
              {card
                ? <button id={origin} className="secondary" onClick={() => openCard(card.id, units, origin)} aria-label={(item.partial ? t.partial : t.full) + ' · ' + item.label}>{item.partial ? t.partial : t.full} →</button>
                : <span>{t.gap}</span>}
            </li>;
          })}
        </ul> : <div className="grammar-topics">
          {units.map(unit => <button id={'grammar-unit-' + unit.id} className="grammar-topic" key={unit.id} onClick={event => onOpen(unit.id, undefined, event.currentTarget.id)}>
            <h3>{unit.title[locale]}</h3>
            <p>{unit.cards.map(card => card.pattern).join(' · ')}</p>
            <span aria-hidden="true">→</span>
          </button>)}
        </div>}
      </section>;
    })}
  </div>;
}
