import {base64url, createRemoteJWKSet, customFetch, EncryptJWT, jwtDecrypt, jwtVerify} from 'jose';
import {z} from 'zod';
import {readBoundedJson} from './sentence-check-deepseek';

const issuer = 'https://auth.openai.com';
const resource = 'https://api.openai.com/v1';
export const callbackPath = '/api/reading-tutor/plan/callback';
export const flowCookie = '__Host-cos-tutor-flow';
export const sessionCookie = '__Host-cos-tutor';
export const planOrigin = 'https://chineseos.l00p.network';
const planScopes = ['resource.invoke', 'chatgpt.tokens.use.direct'];
export type TutorBindings = {
  DB?: D1Database; COS_CHATGPT_CLIENT_ID?: string; COS_CHATGPT_REDIRECT_URI?: string;
  COS_CHATGPT_TOKEN_AUTH_METHOD?: string; COS_CHATGPT_CLIENT_SECRET?: string; COS_CHATGPT_SESSION_KEY?: string;
  DEEPSEEK_SENTENCE_CHECK_API_KEY?: string; DEEPSEEK_SENTENCE_CHECK_DAILY_LIMIT?: string; DEEPSEEK_SENTENCE_CHECK_ORIGIN?: string;
  DEEPSEEK_READING_TUTOR_ADDITIONAL_ORIGIN?: string;
};

export function planConfig(bindings: TutorBindings) {
  const {DB: db, COS_CHATGPT_CLIENT_ID: client, COS_CHATGPT_REDIRECT_URI: redirect,
    COS_CHATGPT_TOKEN_AUTH_METHOD: method, COS_CHATGPT_CLIENT_SECRET: secret, COS_CHATGPT_SESSION_KEY: key} = bindings;
  if (!db || !client || !/^[\w.-]{1,200}$/.test(client) || client === 'dynamic_agent_client' || !redirect || !key || !/^[\w-]{43}$/.test(key)) return null;
  if ((method !== 'none' && method !== 'client_secret_basic') || (method === 'none' ? !!secret : !secret)) return null;
  try {
    if (redirect !== planOrigin + callbackPath) return null;
    const decoded = base64url.decode(key);
    if (decoded.length !== 32) return null;
    return {db, client, redirect, origin: planOrigin, method, secret, key: decoded};
  } catch { return null; }
}
type PlanConfig = NonNullable<ReturnType<typeof planConfig>>;
export const noStore = {'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer'};
export const isPlanHost = (request: Request) => new URL(request.url).host === new URL(planOrigin).host;
export const tutorCookie = (name: string, value: string, seconds: number) => name + '=' + value + '; Max-Age=' + seconds + '; Path=/; Secure; HttpOnly; SameSite=Lax';
const cookieValue = (request: Request, name: string) => (request.headers.get('cookie') ?? '').split(';').map(part => part.trim()).find(part => part.startsWith(name + '='))?.slice(name.length + 1);
const random = () => base64url.encode(crypto.getRandomValues(new Uint8Array(32)));
const hash = async (value: string) => base64url.encode(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))));
const now = () => Math.floor(Date.now() / 1000);
async function seal(config: PlanConfig, purpose: string, values: Record<string, string>, expires: number) {
  return new EncryptJWT(values).setProtectedHeader({alg: 'dir', enc: 'A256GCM'}).setIssuer(config.origin)
    .setAudience(config.client + '/' + purpose).setExpirationTime(expires).encrypt(config.key);
}
async function unseal(config: PlanConfig, purpose: string, value?: string) {
  if (!value) return null;
  try {
    const {payload} = await jwtDecrypt(value, config.key, {issuer: config.origin, audience: config.client + '/' + purpose,
      keyManagementAlgorithms: ['dir'], contentEncryptionAlgorithms: ['A256GCM'], requiredClaims: ['exp']});
    return payload;
  } catch { return null; }
}

const discoverySchema = z.object({issuer: z.literal(issuer), authorization_endpoint: z.string(), token_endpoint: z.string(), jwks_uri: z.string()});
const tokenSchema = z.object({
  id_token: z.string().min(1), access_token: z.string().min(1), token_type: z.string().regex(/^Bearer$/i),
  expires_in: z.number().int().positive(), scope: z.string(),
});
const modelCatalogSchema = z.object({models: z.array(z.object({visibility: z.string(), slug: z.string()}))});

async function discovery() {
  const response = await fetch(issuer + '/.well-known/openid-configuration', {redirect: 'manual', signal: AbortSignal.timeout(10000)});
  if (!response.ok) throw new Error('discovery');
  const d = discoverySchema.parse(await readBoundedJson(response, 32768));
  for (const raw of [d.authorization_endpoint, d.token_endpoint, d.jwks_uri]) {
    const url = new URL(raw);
    if (url.origin !== issuer || url.username || url.password || url.hash) throw new Error('discovery');
  }
  return d;
}
export async function startPlan(config: PlanConfig, returnTo: string) {
  const d = await discovery(), verifier = random(), nonce = random(), state = random();
  const location = new URL(d.authorization_endpoint);
  location.search = new URLSearchParams({client_id: config.client, redirect_uri: config.redirect, response_type: 'code',
    scope: ['openid', 'profile', 'email', ...planScopes].join(' '), resource, state, nonce,
    code_challenge: await hash(verifier), code_challenge_method: 'S256'}).toString();
  const ttl = 600;
  const expires = now() + ttl;
  const flow = await seal(config, 'flow', {returnTo, verifier, nonce, state}, expires);
  await config.db.prepare('DELETE FROM reading_tutor_plan_flows WHERE expires_at <= ?').bind(now()).run();
  await config.db.prepare('INSERT INTO reading_tutor_plan_flows(flow_hash, expires_at) VALUES (?, ?)').bind(await hash(state), expires).run();
  return Response.json({url: location.href}, {headers: {...noStore, 'Set-Cookie': tutorCookie(flowCookie, flow, ttl)}});
}
export async function getGrant(config: PlanConfig, request: Request) {
  const id = cookieValue(request, sessionCookie);
  if (!id || !/^[\w-]{43}$/.test(id)) return null;
  const digest = await hash(id);
  const row = await config.db.prepare('SELECT credential FROM reading_tutor_plan_sessions WHERE session_hash = ? AND expires_at > ?')
    .bind(digest, now()).first<{credential: string}>();
  const grant = await unseal(config, 'grant/' + digest, row?.credential);
  return typeof grant?.access === 'string' && typeof grant.model === 'string' ? {access: grant.access, model: grant.model} : null;
}
export async function forgetGrant(config: PlanConfig, request: Request) {
  const id = cookieValue(request, sessionCookie);
  if (id && /^[\w-]{43}$/.test(id)) await config.db.prepare('DELETE FROM reading_tutor_plan_sessions WHERE session_hash = ?').bind(await hash(id)).run();
}
export async function forgetFlow(config: PlanConfig, request: Request) {
  const flow = await unseal(config, 'flow', cookieValue(request, flowCookie));
  if (typeof flow?.state !== 'string') return;
  await config.db.prepare('DELETE FROM reading_tutor_plan_flows WHERE flow_hash = ?').bind(await hash(flow.state)).run();
}
function tokenRequest(config: PlanConfig, fields: Record<string, string>) {
  const body = new URLSearchParams({...fields, client_id: config.client, redirect_uri: config.redirect, resource});
  const headers = new Headers({'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'});
  if (config.method === 'client_secret_basic') {
    const formValue = (value: string) => new URLSearchParams({v: value}).toString().slice(2);
    headers.set('Authorization', 'Basic ' + btoa(formValue(config.client) + ':' + formValue(config.secret!)));
  }
  return {method: 'POST', headers, body, redirect: 'manual' as const, signal: AbortSignal.timeout(10000)};
}
export async function finishPlan(config: PlanConfig, request: Request) {
  const query = new URL(request.url).searchParams;
  const flow = await unseal(config, 'flow', cookieValue(request, flowCookie));
  const headers = new Headers(noStore);
  if (!flow || typeof flow.verifier !== 'string' || typeof flow.nonce !== 'string' || typeof flow.state !== 'string' ||
    typeof flow.returnTo !== 'string' || !flow.returnTo.startsWith('?') || query.get('state') !== flow.state ||
    ['state', 'code', 'error', 'iss', 'client_id'].some(key => query.getAll(key).length > 1) ||
    (query.has('iss') && query.get('iss') !== issuer) || (query.has('client_id') && query.get('client_id') !== config.client)) {
    return new Response('Sign-in expired. Return to your lesson and connect again.', {status: 400, headers});
  }
  try {
    const consumed = await config.db.prepare('DELETE FROM reading_tutor_plan_flows WHERE flow_hash = ? AND expires_at > ? RETURNING flow_hash')
      .bind(await hash(flow.state), now()).first();
    if (!consumed) return new Response('Sign-in expired. Return to your lesson and connect again.', {status: 400, headers});
  } catch {
    return new Response('Sign-in is temporarily unavailable. Return to your lesson and try again.', {status: 503, headers});
  }
  headers.append('Set-Cookie', tutorCookie(flowCookie, '', 0));
  const lesson = new URL('/', config.origin);
  lesson.search = flow.returnTo;
  let outcome = query.get('error') === 'access_denied' ? 'declined' : 'error';
  const code = query.get('code');
  if (!query.has('error') && code && code.length < 8192) {
    try {
      const d = await discovery();
      const tokenResponse = await fetch(d.token_endpoint, tokenRequest(config, {grant_type: 'authorization_code', code, code_verifier: flow.verifier}));
      if (!tokenResponse.ok) throw new Error('exchange');
      const raw = await readBoundedJson(tokenResponse, 65536);
      const scopes = z.object({scope: z.string().optional()}).parse(raw).scope?.split(/\s+/) ?? [];
      if (!planScopes.every(scope => scopes.includes(scope))) {
        outcome = 'declined';
        throw new Error('plan_permission');
      }
      const token = tokenSchema.parse(raw);
      const expires = now() + Math.min(token.expires_in, 3600);
      const {payload} = await jwtVerify(token.id_token, createRemoteJWKSet(new URL(d.jwks_uri), {
        timeoutDuration: 8000, [customFetch]: (url, options) => fetch(url, {...options, redirect: 'manual'}),
      }), {
        issuer, audience: config.client, algorithms: ['RS256'], requiredClaims: ['sub', 'iat', 'exp', 'nonce'],
      });
      if (payload.nonce !== flow.nonce || typeof payload.sub !== 'string' || !payload.sub ||
        ((Array.isArray(payload.aud) && payload.aud.length > 1 || payload.azp !== undefined) && payload.azp !== config.client)) throw new Error('identity');
      const response = await fetch(resource + '/models', {headers: {Authorization: 'Bearer ' + token.access_token}, redirect: 'manual', signal: AbortSignal.timeout(12000)});
      if (!response.ok) throw new Error('models');
      const catalog = modelCatalogSchema.parse(await readBoundedJson(response, 512000));
      const model = catalog.models.find(item => item.visibility === 'list' && /^[\w.-]{1,150}$/.test(item.slug))?.slug;
      if (!model) throw new Error('models');
      const id = random(), digest = await hash(id);
      await config.db.prepare('DELETE FROM reading_tutor_plan_sessions WHERE expires_at <= ?').bind(now()).run();
      const encrypted = await seal(config, 'grant/' + digest, {access: token.access_token, model}, expires);
      const ttl = expires - now();
      if (ttl < 1) throw new Error('expired');
      await config.db.prepare('INSERT INTO reading_tutor_plan_sessions(session_hash, credential, expires_at) VALUES (?, ?, ?)').bind(digest, encrypted, expires).run();
      await forgetGrant(config, request).catch(() => {});
      headers.append('Set-Cookie', tutorCookie(sessionCookie, id, ttl));
      outcome = 'connected';
    } catch { /* The learner can reconnect from the pinned sentence. */ }
  }
  lesson.searchParams.set('tutorReturn', outcome);
  headers.set('Location', lesson.href);
  return new Response(null, {status: 303, headers});
}
