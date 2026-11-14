export type ReadingLabLevel = 2 | 3 | 4 | 5;

export type ReadingLabExample = {
  hanzi: string;
  pinyin: string;
  english: string;
};

export type ReadingLabToken = {
  text: string;
  pinyin: readonly string[];
};

export type ReadingLabChunk = {
  id: string;
  tokens: readonly ReadingLabToken[];
};

export type ReadingLabParagraph = {
  id: string;
  english: string;
  sentenceEnglish: readonly string[];
  chunks: readonly ReadingLabChunk[];
};

export type ReadingLabGrammar = {
  id: string;
  pattern: string;
  note: string;
  example: ReadingLabExample;
  sourceChunks: readonly string[];
  frameId?: string;
};

export type ReadingLabQuestion = {
  id: string;
  question: string;
  answer: string;
  evidence: {paragraphId: string; chunkId: string};
};

export type ReadingLabWriting = {
  prompt: string;
  english: string;
  requirements: readonly string[];
  example?: ReadingLabExample;
};

export type ReadingLabReading = {
  id: string;
  level: ReadingLabLevel;
  title: ReadingLabExample;
  topic: string;
  levelIntent: string;
  paragraphs: readonly ReadingLabParagraph[];
  grammar: readonly ReadingLabGrammar[];
  questions: readonly ReadingLabQuestion[];
  writing: ReadingLabWriting;
  glossaryCandidates: readonly string[];
};
