import {env} from 'cloudflare:workers';
import {z} from 'zod';
import {readingLabHref, readingLabReturn, readReadingLabRoute} from '../../../reading-lab-route';
import {lessonGrammar} from '../../../../lib/reading-tutor';
import {flowCookie, forgetFlow, forgetGrant, isPlanHost, noStore, planConfig, sessionCookie, startPlan, tutorCookie, type TutorBindings} from '../../../../lib/reading-tutor-plan';
import {JsonBodyTooLarge, readBoundedJson} from '../../../../lib/sentence-check-deepseek';

export const dynamic = 'force-dynamic';
const command = z.discriminatedUnion('action', [
  z.object({action: z.literal('disconnect')}).strict(),
  z.object({action: z.literal('connect'), returnTo: z.string().max(1500)}).strict(),
]);
export async function POST(request: Request) {
  const config = planConfig(env as TutorBindings);
  if (!config || !isPlanHost(request)) return Response.json({error: 'unavailable'}, {status: 503, headers: noStore});
  if (request.headers.get('origin') !== config.origin) return new Response(null, {status: 403, headers: noStore});
  if (request.headers.get('content-type')?.split(';', 1)[0]?.trim().toLowerCase() !== 'application/json') return new Response(null, {status: 415, headers: noStore});
  let body;
  try { body = command.parse(await readBoundedJson(request, 2048)); }
  catch (error) { return new Response(null, {status: error instanceof JsonBodyTooLarge ? 413 : 400, headers: noStore}); }
  try {
    if (body.action === 'disconnect') {
      await Promise.all([forgetFlow(config, request), forgetGrant(config, request)]);
      const headers = new Headers(noStore);
      headers.append('Set-Cookie', tutorCookie(sessionCookie, '', 0));
      headers.append('Set-Cookie', tutorCookie(flowCookie, '', 0));
      return Response.json({disconnected: true}, {headers});
    }
    const returnTo = readingLabReturn(body.returnTo);
    const route = readReadingLabRoute(returnTo ?? '');
    const context = returnTo && lessonGrammar(route.article, route.grammar, route.chunk);
    if (!context) return new Response(null, {status: 400, headers: noStore});
    await forgetFlow(config, request);
    return await startPlan(config, readingLabHref({...route, paragraph: context.paragraphId ?? route.paragraph}));
  } catch { return Response.json({error: 'provider_unavailable'}, {status: 502, headers: noStore}); }
}
