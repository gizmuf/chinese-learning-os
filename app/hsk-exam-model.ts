import exam from '../data/hsk-exam-characters.json';

export const recognitionCharsByLevel = exam.recognition;
export const writingCharsByBand = exam.writing;
export type ExamLevel = '1' | '2' | '3';

export function examCharacters(level: ExamLevel, mode: 'recognition' | 'writing'): string[] {
  if (mode === 'writing') {
    return [...writingCharsByBand['1-2'], ...(level === '3' ? writingCharsByBand['3'] : '')];
  }
  return (['1', '2', '3'] as const).slice(0, Number(level))
    .flatMap(band => [...recognitionCharsByLevel[band]]);
}
