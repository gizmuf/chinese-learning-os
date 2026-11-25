export type SentenceCheckLocale = 'en' | 'fr' | 'ru' | 'tr';
export type SentenceCheckResult = {
  status: 'correct' | 'corrected' | 'uncertain';
  correction: string;
  pinyin: string;
  explanation: string;
  natural: string;
  naturalPinyin: string;
};

type Words = readonly [hanzi: string, pinyin: string];
type Localized = Record<SentenceCheckLocale, string>;
type Feedback = {status: 'correct' | 'corrected'; sentence: Words; note: Localized; natural?: Words};

const notes = {
  comparisonFix: {
    en: 'In this comparison, put the adjective directly after 比 and the person you are comparing with. Leave out 很.',
    fr: 'Dans cette comparaison, place l’adjectif juste après 比 et la personne à laquelle tu compares. Enlève 很.',
    ru: 'В этом сравнении прилагательное идёт сразу после 比 и того, с кем сравнивают. Убери 很.',
    tr: 'Bu karşılaştırmada sıfatı 比 ve karşılaştırılan kişiden hemen sonra getir. 很 kullanma.',
  },
  comparisonOk: {
    en: 'This follows the usual order: subject + 比 + person compared with + adjective. 更 can go before the adjective.',
    fr: 'L’ordre est correct : sujet + 比 + personne à laquelle on compare + adjectif. 更 peut précéder l’adjectif.',
    ru: 'Порядок слов верный: подлежащее + 比 + тот, с кем сравнивают + прилагательное. Перед прилагательным можно поставить 更.',
    tr: 'Sözcük dizilişi doğru: özne + 比 + karşılaştırılan kişi + sıfat. 更 sıfattan önce gelebilir.',
  },
  pastFix: {
    en: 'If you mean the trip did not happen, use 没 before 去 and leave out 了. 不 can express a choice or change of plan, which is a different reading.',
    fr: 'Si tu veux dire que le déplacement n’a pas eu lieu, mets 没 avant 去 et enlève 了. 不 peut exprimer un choix ou un changement de projet, ce qui donne un autre sens.',
    ru: 'Если речь о том, что поход не состоялся, поставь 没 перед 去 и убери 了. 不 может выражать решение или изменение планов — это другой смысл.',
    tr: 'Gitme eyleminin gerçekleşmediğini kastediyorsan 去 önüne 没 getir ve 了 ekini çıkar. 不 bir tercih veya plan değişikliği bildirebilir; bu farklı bir anlamdır.',
  },
  pastOk: {
    en: '没 before 去 says the trip did not happen.',
    fr: '没 avant 去 indique que le déplacement n’a pas eu lieu.',
    ru: '没 перед 去 показывает, что поход не состоялся.',
    tr: '去 önündeki 没, gitme eyleminin gerçekleşmediğini belirtir.',
  },
  experienceFix: {
    en: 'Use 没 to say you have never had an experience. Keep 过 after the verb.',
    fr: 'Utilise 没 pour dire que tu n’as jamais fait cette expérience. Garde 过 après le verbe.',
    ru: 'Чтобы сказать, что такого опыта никогда не было, используй 没. Оставь 过 после глагола.',
    tr: 'Bir deneyimi hiç yaşamadığını söylemek için 没 kullan. 过 fiilden sonra kalır.',
  },
  experienceOk: {
    en: '没 + verb + 过 says you have never done something.',
    fr: '没 + verbe + 过 indique que tu n’as jamais fait quelque chose.',
    ru: '没 + глагол + 过 означает, что такого опыта никогда не было.',
    tr: '没 + fiil + 过, bir şeyi daha önce hiç yapmadığını dile getirir.',
  },
  locationFix: {
    en: 'For where someone is doing an activity, put 在 and the place before the activity.',
    fr: 'Pour dire où quelqu’un fait une activité, mets 在 et le lieu avant l’activité.',
    ru: 'Чтобы указать, где происходит действие, поставь 在 и место перед действием.',
    tr: 'Bir etkinliğin nerede yapıldığını söylerken 在 ve yer adını etkinlikten önce getir.',
  },
  locationOk: {
    en: '在 and the place come before the activity to say where it happens.',
    fr: '在 et le lieu précèdent l’activité pour indiquer où elle se déroule.',
    ru: '在 и место стоят перед действием и указывают, где оно происходит.',
    tr: '在 ve yer adı etkinlikten önce gelir ve etkinliğin nerede yapıldığını belirtir.',
  },
  uncertain: {
    en: 'I could not confidently check this sentence. This check covers a few common patterns. Try one short sentence with a clear subject and verb.',
    fr: 'Je ne peux pas évaluer cette phrase avec certitude. La vérification couvre quelques constructions courantes. Essaie une phrase courte avec un sujet et un verbe clairs.',
    ru: 'Не могу уверенно проверить это предложение. Проверка охватывает несколько распространённых конструкций. Попробуй короткое предложение с явным подлежащим и глаголом.',
    tr: 'Bu cümleyi güvenle değerlendiremedim. Bu kontrol birkaç yaygın yapıyı kapsıyor. Öznesi ve fiili açık, kısa bir cümle dene.',
  },
} satisfies Record<string, Localized>;

const words = (...pieces: Words[]): Words => [pieces.map(piece => piece[0]).join(''), pieces.map(piece => piece[1]).join(' ')];
const subject = [['我', 'wǒ'], ['你', 'nǐ'], ['他', 'tā'], ['她', 'tā'], ['我们', 'wǒmen'], ['他们', 'tāmen']] satisfies Words[];
const destination = [['学校', 'xuéxiào'], ['公司', 'gōngsī'], ['医院', 'yīyuàn'], ['北京', 'Běijīng']] satisfies Words[];
const past = [['昨天', 'zuótiān'], ['前天', 'qiántiān'], ['上周', 'shàng zhōu']] satisfies Words[];
const adjectives = [['高', 'gāo'], ['矮', 'ǎi'], ['忙', 'máng'], ['快', 'kuài'], ['慢', 'màn'], ['累', 'lèi']] satisfies Words[];
const experiences = [['去过北京', 'qùguo Běijīng'], ['去过中国', 'qùguo Zhōngguó'], ['吃过火锅', 'chīguo huǒguō'], ['看过这部电影', 'kànguo zhè bù diànyǐng'], ['坐过地铁', 'zuòguo dìtiě']] satisfies Words[];
const locationActivities = [
  [['图书馆', 'túshūguǎn'], ['看书', 'kàn shū']],
  [['学校', 'xuéxiào'], ['学习', 'xuéxí']],
  [['家', 'jiā'], ['吃饭', 'chī fàn']],
  [['公园', 'gōngyuán'], ['跑步', 'pǎo bù']],
  [['公司', 'gōngsī'], ['上班', 'shàng bān']],
] satisfies [Words, Words][];

const feedback = new Map<string, Feedback>();
function correction(source: Words, sentence: Words, note: Localized, natural?: Words) {
  feedback.set(source[0], {status: 'corrected', sentence, note, natural});
}
function correct(sentence: Words, note: Localized) {
  feedback.set(sentence[0], {status: 'correct', sentence, note});
}

// Only combine known words in bounded sentence shapes. In particular, do not
// change arbitrary occurrences of 不, 很, 过 or 了 in other contexts.
for (const person of subject) {
  for (const other of subject) {
    if (person === other) continue;
    const comparison = words(person, ['比', 'bǐ'], other);
    for (const adjective of adjectives) {
      const answer = words(comparison, adjective);
      const natural = words(comparison, ['更', 'gèng'], adjective);
      correction(words(comparison, ['很', 'hěn'], adjective), answer, notes.comparisonFix, natural);
      correct(answer, notes.comparisonOk);
      correct(natural, notes.comparisonOk);
    }
  }

  for (const time of past) {
    for (const place of destination) {
      const went = words(['没', 'méi'], ['去', 'qù'], place);
      const answer = words(person, time, went);
      const natural = words(time, person, went);
      correction(words(person, time, ['不去了', 'bú qù le'], place), answer, notes.pastFix, natural);
      correct(answer, notes.pastOk);
      correct(natural, notes.pastOk);
      correct(words(person, time, ['没有', 'méiyǒu'], ['去', 'qù'], place), notes.pastOk);
    }
  }

  for (const experience of experiences) {
    const answer = words(person, ['没', 'méi'], experience);
    const natural = words(person, ['没有', 'méiyǒu'], experience);
    correction(words(person, ['不', 'bù'], experience), answer, notes.experienceFix, natural);
    correct(answer, notes.experienceOk);
    correct(natural, notes.experienceOk);
  }

  for (const [place, activity] of locationActivities) {
    const answer = words(person, ['在', 'zài'], place, activity);
    const natural = words(person, ['在', 'zài'], [place[0] + '里', place[1] + ' li'], activity);
    correction(words(person, activity, ['在', 'zài'], place), answer, notes.locationFix, natural);
    correct(answer, notes.locationOk);
    correct(natural, notes.locationOk);
  }
}

export function checkSentenceRules(sentence: string, locale: SentenceCheckLocale): SentenceCheckResult {
  const input = sentence.trim();
  // Recognize declarative punctuation only; don't turn questions or clauses
  // with internal punctuation into declarations.
  const match = feedback.get(input.replace(/[。.！!]$/u, '').replace(/[ \t\u3000]/gu, ''));
  if (!match) {
    return {status: 'uncertain', correction: '', pinyin: '', explanation: notes.uncertain[locale], natural: '', naturalPinyin: ''};
  }
  const emphatic = /[！!]$/u.test(input);
  const mark = emphatic ? '！' : '。';
  const romanMark = emphatic ? '!' : '.';
  return {
    status: match.status,
    correction: match.sentence[0] + mark,
    pinyin: match.sentence[1] + romanMark,
    explanation: match.note[locale],
    natural: match.natural ? match.natural[0] + mark : '',
    naturalPinyin: match.natural ? match.natural[1] + romanMark : '',
  };
}
