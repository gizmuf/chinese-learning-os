import {env} from 'cloudflare:workers';
import {finishPlan, isPlanHost, noStore, planConfig, type TutorBindings} from '../../../../../lib/reading-tutor-plan';

export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const config = planConfig(env as TutorBindings);
  if (!config || !isPlanHost(request)) return new Response('ChatGPT plan access is unavailable.', {status: 503, headers: noStore});
  return finishPlan(config, request);
}
