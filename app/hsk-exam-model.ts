import exam from '../data/hsk-exam-characters.json';

export const recognitionCharsByLevel = exam.recognition;
export const writingCharsByBand = exam.writing;
export type ExamLevel = '1' | '2' | '3';
export type ExamMode = 'recognition' | 'writing';

export function examCharacters(level: ExamLevel, mode: ExamMode): string[] {
  if (mode === 'writing') {
    return [...writingCharsByBand['1-2'], ...(level === '3' ? writingCharsByBand['3'] : '')];
  }
  return (['1', '2', '3'] as const).slice(0, Number(level))
    .flatMap(band => [...recognitionCharsByLevel[band]]);
}

export type ExamChecklist = Record<ExamMode, Set<string>>;

const eligible = {
  recognition: new Set(examCharacters('3', 'recognition')),
  writing: new Set(examCharacters('3', 'writing')),
};

/** Official cumulative recognition list used by the character study cards. */
export function hasRecognitionStudyCard(glyph: string) {
  return eligible.recognition.has(glyph);
}

export function readExamChecklist(saved: string | null): ExamChecklist {
  let value: Partial<Record<ExamMode, unknown>> | undefined;
  try { value = saved ? JSON.parse(saved) : undefined; } catch { /* Restore an empty list. */ }
  function known(mode: ExamMode): Set<string> {
    const glyphs = value?.[mode];
    return new Set(Array.isArray(glyphs)
      ? glyphs.filter((glyph): glyph is string => typeof glyph === 'string' && eligible[mode].has(glyph))
      : []);
  }
  return {recognition: known('recognition'), writing: known('writing')};
}
