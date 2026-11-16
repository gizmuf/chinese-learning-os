import type {Copy} from './course-data';
import content from '../data/practical-2026-11-16/content.json';
import audio from '../data/practical-2026-11-16/audio.json';

export type PracticalExample = {hanzi: string; pinyin: string; meaning: Copy};
export type PracticalLine = PracticalExample & {
  chunks: string[]; source: 'pdf' | 'adapted'; variants?: PracticalExample[];
};
type PracticalScene = {id: string; title: Copy; lines: PracticalLine[]};
type PracticalFamily = {anchor: string; examples: string[]; note: Copy};

export const practicalLesson = content as {
  title: Copy; scenes: PracticalScene[]; families?: PracticalFamily[];
};
export const practicalLessonId = 'practical-2026-11-16';
export const practicalLessonHref = '/?course=intensive&material=' + practicalLessonId;
export const practicalLessonAudio = audio as Record<string, string>;

export function activePracticalScene(search: string) {
  const scene = new URLSearchParams(search).get('scene');
  return practicalLesson.scenes.find(item => item.id === scene) ?? practicalLesson.scenes[0];
}

const drinkSlots = {
  tea: {hanzi: '茶', pinyin: 'chá'},
  coffee: {hanzi: '咖啡', pinyin: 'kāfēi'},
} as const;
const temperatureSlots = {
  hot: {hanzi: '热', pinyin: 'rè'},
  iced: {hanzi: '冰', pinyin: 'bīng'},
} as const;

export function buildPracticalSentence(drink: keyof typeof drinkSlots, temperature: keyof typeof temperatureSlots) {
  const [beverage, heat] = [drinkSlots[drink], temperatureSlots[temperature]];
  return {
    chunks: ['我想喝', heat.hanzi+'的', beverage.hanzi+'。'],
    hanzi: '我想喝'+heat.hanzi+'的'+beverage.hanzi+'。',
    pinyin: 'Wǒ xiǎng hē '+heat.pinyin+' de '+beverage.pinyin+'.',
  };
}
