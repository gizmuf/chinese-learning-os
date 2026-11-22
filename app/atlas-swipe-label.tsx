import type {SwipeFrame} from './atlas-swipe-model';

type WordPart = Pick<SwipeFrame, 'text' | 'pinyin' | 'meaning'>;

export const contextualWordParts: Partial<Record<string, readonly WordPart[]>> = {
  'hsk1-127': [
    {text: '面', pinyin: 'miàn', meaning: 'flour / dough'},
    {text: '条', pinyin: 'tiáo', meaning: 'strand'},
    {text: '儿', pinyin: '-r', meaning: 'rhotic suffix'},
  ],
};

type LabelProps = {
  frame: Pick<SwipeFrame, 'pinyin' | 'meaning'>;
  showPinyin: boolean;
  showMeaning: boolean;
};

export function SwipeLabel({frame, showPinyin, showMeaning}: LabelProps) {
  const reading = showPinyin && frame.pinyin.split(' / ')[0];
  const gloss = showMeaning && frame.meaning.split(/[;,]/u).map(sense => sense.trim()).find(Boolean);
  return <>
    {reading && <span className="as-label-reading">{reading}</span>}
    {gloss && <span className="as-label-gloss" lang="en">{gloss}</span>}
  </>;
}
