import { env } from 'cloudflare:workers';
import { sentenceAudioTickets } from '../../../lib/sentence-audio-token';
import {
  checkSentenceWithDeepSeek, JsonBodyTooLarge, parseDailyLimit, readBoundedJson,
  reserveSentenceCheckSql, sentenceCheckRequest,
} from '../../../lib/sentence-check-deepseek';

export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'no-store' };
function httpsOrigin(value: string | undefined) {
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.origin === value ? value : undefined;
  } catch {
    return undefined;
  }
}

function config() {
  const bindings = env as typeof env & {
    DEEPSEEK_SENTENCE_CHECK_API_KEY?: string;
    DEEPSEEK_SENTENCE_CHECK_DAILY_LIMIT?: string;
    DEEPSEEK_SENTENCE_CHECK_ORIGIN?: string;
    SENTENCE_CHECK_AUDIO_SECRET?: string;
  };
  const key = bindings.DEEPSEEK_SENTENCE_CHECK_API_KEY?.trim();
  const dailyLimit = parseDailyLimit(bindings.DEEPSEEK_SENTENCE_CHECK_DAILY_LIMIT);
  const db = bindings.DB;
  const origin = httpsOrigin(bindings.DEEPSEEK_SENTENCE_CHECK_ORIGIN);
  const audioSecret = bindings.SENTENCE_CHECK_AUDIO_SECRET;
  return key && dailyLimit && db && origin ? { key, dailyLimit, db, origin, audioSecret } : undefined;
}

export async function GET() {
  let enabled = false;
  try {
    const settings = config();
    if (settings) {
      enabled = Boolean(await settings.db.prepare(
        'SELECT utc_day, daily_used, utc_minute, minute_used FROM sentence_check_ai_quota WHERE id = 1',
      ).first());
    }
  } catch {
    // Missing binding, table, or quota row means the mode is off.
  }
  return Response.json({ enabled }, { headers });
}

const fail = (error: string, status: number) => Response.json({ error }, { status, headers });

export async function POST(request: Request) {
  const settings = config();
  if (!settings) return fail('unavailable', 503);
  if (request.headers.get('origin') !== settings.origin) {
    return fail('invalid_origin', 403);
  }
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') {
    return fail('unsupported_media_type', 415);
  }

  let raw: unknown;
  try {
    raw = await readBoundedJson(request, 2048);
  } catch (error) {
    return error instanceof JsonBodyTooLarge ? fail('payload_too_large', 413) : fail('invalid_request', 400);
  }
  const input = sentenceCheckRequest.safeParse(raw);
  if (!input.success) return fail('invalid_request', 400);

  try {
    // A failed provider attempt consumes one slot; no retry or refund.
    const reserved = await settings.db.prepare(reserveSentenceCheckSql).bind(settings.dailyLimit).first();
    if (!reserved) return fail('rate_limited', 429);
  } catch {
    return fail('unavailable', 503);
  }
  try {
    const feedback = await checkSentenceWithDeepSeek(settings.key, input.data);
    // A signing failure should leave grammar feedback usable.
    const audio = await sentenceAudioTickets(settings.audioSecret, feedback).catch(() => undefined);
    return Response.json(audio ? { ...feedback, audio } : feedback, { headers });
  } catch {
    return fail('provider_unavailable', 502);
  }
}
