export const readingAudioSentenceLimit = 24;
export const readingAudioTextLimit = 1600;
export const readingAudioSentenceSize = 200;

export function parseReadingAudioSentences(raw: unknown): string[] | undefined {
  if (!raw || typeof raw !== 'object' || !('sentences' in raw)) return;
  const {sentences} = raw;
  if (!Array.isArray(sentences) || !sentences.length || sentences.length > readingAudioSentenceLimit) return;
  if (!sentences.every((text): text is string => typeof text === 'string' && text === text.trim()
    && text.length <= readingAudioSentenceSize && /\p{Script=Han}/u.test(text) && !/\p{C}/u.test(text))) return;
  if (sentences.reduce((sum, text) => sum + text.length, 0) > readingAudioTextLimit) return;
  return Array.from(new Set(sentences));
}

export const reserveReadingAudioSql = `
UPDATE reading_lab_audio_quota
SET daily_used = CASE WHEN utc_day = date('now') THEN daily_used + ?1 ELSE ?1 END,
    utc_day = date('now')
WHERE id = 1 AND (CASE WHEN utc_day = date('now') THEN daily_used ELSE 0 END) + ?1 <= ?2
RETURNING daily_used
`;
