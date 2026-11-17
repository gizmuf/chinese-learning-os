export const hanziFamilyLessonId = 'hanzi-families-2026-11-17';
export const hanziFamilyLessonTitle = 'Hanzi, words and their families';
export const hanziFamilyLessonHref = '/?course=intensive&material=' + hanziFamilyLessonId;

export function hanziFamilyBackLink(search: string) {
  const query = new URLSearchParams(search);
  if (query.get('from') !== 'lessons') return '/?course=intensive';
  const origin = 'https://chinese-os.local';
  try {
    const target = new URL(query.get('returnTo') ?? '/?study=library', origin);
    if (target.origin === origin && target.pathname === '/' && target.searchParams.get('study') === 'library') {
      return target.pathname + target.search + target.hash;
    }
  } catch {}
  return '/?study=library';
}

export type HanziExercise = {
  id: string;
  kind: 'choice' | 'writing' | 'gap' | 'build';
  prompt: string;
  context?: string;
  choices?: string[];
  answer: string;
  accepted?: string[];
  explanation: string;
  pinyin?: string;
  meaning?: string;
};

export function matchesHanziAnswer(exercise: HanziExercise, draft: string) {
  const normalize = (value: string) => value.normalize('NFKC').replace(/[\s，。！？、,.!?；;：「」“”]/gu, '');
  const answer = normalize(draft);
  return answer.length > 0 && [exercise.answer, ...exercise.accepted ?? []].some(value => normalize(value) === answer);
}
