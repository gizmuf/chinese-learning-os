export const mandarin320Id = 'mandarin-320';
export const mandarin320Title = 'Mandarin 320';
export const mandarin320Href = '/?course=intensive&material=' + mandarin320Id;

export const mandarin320Activities = [
  ['words', 'Words and families'],
  ['appendix', 'Components and contrasts'],
  ['practice', 'Practice'],
] as const;

export const mandarin320Modes = [
  ['recall', 'Recall and write'],
  ['sentence', 'Use in a sentence'],
  ['contrast', 'Tell them apart'],
] as const;

export type Mandarin320Route = {
  activity: typeof mandarin320Activities[number][0];
  mode: typeof mandarin320Modes[number][0];
  item: number;
};

export function mandarin320Route(search: string): Mandarin320Route {
  const query = new URLSearchParams(search);
  const item = Number(query.get('item'));
  return {
    activity: mandarin320Activities.find(([name]) => name === query.get('activity'))?.[0] ?? 'words',
    mode: mandarin320Modes.find(([name]) => name === query.get('mode'))?.[0] ?? 'recall',
    item: Number.isSafeInteger(item) && item > 0 && item <= 320 ? item : 1,
  };
}
