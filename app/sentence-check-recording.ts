const recordings = new Map([
  ['他比我高。', '/audio/sentence-check/comparison.mp3'],
  ['他比我更高。', '/audio/sentence-check/comparison-natural.mp3'],
  ['他比我高很多。', '/audio/sentence-check/comparison-more.mp3'],
  ['他比我高得多。', '/audio/sentence-check/comparison-far-more.mp3'],
  ['我昨天没去学校。', '/speaking-chunks/audio/past-3.mp3'],
  ['昨天我没去学校。', '/audio/sentence-check/past-natural.mp3'],
]);

export function sentenceCheckRecording(hanzi: string) {
  return recordings.get(hanzi);
}
