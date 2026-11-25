import {env} from 'cloudflare:workers';
import {askReadingTutor, lessonGrammar, TutorProviderError, tutorRequest} from '../../../lib/reading-tutor';
import {JsonBodyTooLarge, parseDailyLimit, readBoundedJson, reserveSentenceCheckSql} from '../../../lib/sentence-check-deepseek';
import {forgetGrant, getGrant, isPlanHost, noStore, planConfig, planOrigin, sessionCookie, tutorCookie, type TutorBindings} from '../../../lib/reading-tutor-plan';

export const dynamic = 'force-dynamic';
const bindings = () => env as TutorBindings;
const fail = (error: string, status: number, headers: HeadersInit = noStore) => Response.json({error}, {status, headers});
const additionalOrigin = 'https://cos.l00p.network';
function deepseek(b: TutorBindings) {
  const key = b.DEEPSEEK_SENTENCE_CHECK_API_KEY?.trim();
  const limit = parseDailyLimit(b.DEEPSEEK_SENTENCE_CHECK_DAILY_LIMIT);
  const origin = b.DEEPSEEK_SENTENCE_CHECK_ORIGIN;
  if (!b.DB || !key || !limit || !origin) return null;
  try {
    const url = new URL(origin);
    if (url.origin !== origin || (url.protocol !== 'https:' && !(url.protocol === 'http:' && url.hostname === '127.0.0.1'))) return null;
  } catch { return null; }
  const origins = [origin];
  if (b.DEEPSEEK_READING_TUTOR_ADDITIONAL_ORIGIN === additionalOrigin) origins.push(additionalOrigin);
  return {key, limit, origins, db: b.DB};
}
export async function GET(request: Request) {
  const b = bindings();
  const ds = deepseek(b);
  const config = planConfig(b);
  const origin = request.headers.get('origin');
  const [enabled, plan] = await Promise.all([
    ds && (!origin || ds.origins.includes(origin)) ? (async () => {
      return Boolean(await ds.db.prepare('SELECT id FROM sentence_check_ai_quota WHERE id=1').first());
    })().catch(() => false) : false,
    config && isPlanHost(request) && (!origin || origin === config.origin) ? (async () => {
      await Promise.all([
        config.db.prepare('SELECT session_hash FROM reading_tutor_plan_sessions LIMIT 1').first(),
        config.db.prepare('SELECT flow_hash FROM reading_tutor_plan_flows LIMIT 1').first(),
      ]);
      return await getGrant(config, request) ? 'connected' : 'connect';
    })().catch(() => 'unavailable') : 'unavailable',
  ]);
  return Response.json({deepseek: enabled, chatgpt: plan}, {headers: noStore});
}
export async function POST(request: Request) {
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') return fail('unsupported_media_type', 415);
  const b = bindings();
  const ds = deepseek(b);
  const config = planConfig(b);
  const origin = request.headers.get('origin');
  if (!origin || (origin !== planOrigin && origin !== additionalOrigin && !ds?.origins.includes(origin))) {
    return fail('invalid_origin', 403);
  }
  let input;
  try { input = tutorRequest.parse(await readBoundedJson(request, 65536)); }
  catch (error) { return fail(error instanceof JsonBodyTooLarge ? 'payload_too_large' : 'invalid_request', error instanceof JsonBodyTooLarge ? 413 : 400); }
  const context = lessonGrammar(input.article, input.grammar, input.sourceChunk);
  if (!context) return fail('unknown_lesson', 400);
  let credential: string, model: string | undefined;
  try {
    if (input.provider === 'chatgpt') {
      if (!config || origin !== config.origin || !isPlanHost(request)) return fail('unavailable', 503);
      const grant = await getGrant(config, request);
      if (!grant) return fail('reconnect', 401);
      credential = grant.access;
      model = grant.model;
    } else {
      if (!ds?.origins.includes(origin)) return fail('unavailable', 503);
      const reserved = await ds.db.prepare(reserveSentenceCheckSql).bind(ds.limit).first();
      if (!reserved) return fail('rate_limited', 429);
      credential = ds.key;
    }
  } catch {
    return fail('unavailable', 503);
  }
  try {
    const answer = await askReadingTutor(input, context, credential, model);
    return Response.json({answer, provider: input.provider}, {headers: noStore});
  } catch (error) {
    if (error instanceof TutorProviderError) {
      if (error.code === 'rate_limited') return fail(error.code, 429);
      if (error.code === 'plan_ineligible') return fail(error.code, 403);
      if (error.code === 'reconnect' && config) {
        await forgetGrant(config, request).catch(() => {});
        return fail(error.code, 401, {...noStore, 'Set-Cookie': tutorCookie(sessionCookie, '', 0)});
      }
    }
    return fail('provider_unavailable', 502);
  }
}
