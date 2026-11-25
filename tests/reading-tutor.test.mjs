import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import test from 'node:test';
import {build} from 'esbuild';
import {exportJWK, generateKeyPair, SignJWT} from 'jose';

const settings = {};
globalThis.tutorFixtureBindings = settings;
const bundle = await build({
  stdin: {contents: `export * as tutor from './app/api/reading-tutor/route';
    export * as checker from './app/api/sentence-check/route';
    export * as plan from './app/api/reading-tutor/plan/route';
    export * as callback from './app/api/reading-tutor/plan/callback/route';
    export {readPlanResponse} from './lib/reading-tutor';`, resolveDir: process.cwd()},
  bundle: true, platform: 'node', format: 'esm', write: false,
  plugins: [{name: 'bindings', setup(build) {
    build.onResolve({filter: /^cloudflare:workers$/}, () => ({path: 'bindings', namespace: 'fixture'}));
    build.onLoad({filter: /.*/, namespace: 'fixture'}, () => ({contents: 'export const env=globalThis.tutorFixtureBindings'}));
  }}],
});
const {tutor, checker, plan, callback, readPlanResponse} = await import('data:text/javascript;base64,' + Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const origin = 'https://chineseos.l00p.network', alibaba = 'https://cos.l00p.network', issuer = 'https://auth.openai.com';
const page = '?atlas=1&reader=1&hsk=3&article=podcast-53-after-work&at=p1&grammar=as-soon-as';
const input = {article: 'podcast-53-after-work', grammar: 'as-soon-as', language: 'pl', question: 'A jeśli pominę 一?', history: [], provider: 'chatgpt'};
const post = (body, cookie = '', website = origin) => new Request(origin + '/api/reading-tutor', {
  method: 'POST', headers: {Origin: website, Cookie: cookie, 'Content-Type': 'application/json'}, body: JSON.stringify(body),
});
const planResponse = (...events) => new Response(events.map(e => 'data: ' + JSON.stringify(e) + '\r\n\r\n').join(''), {headers: {'Content-Type': 'text/event-stream'}});
const cookiePair = (response, name) => response.headers.getSetCookie().find(c => c.startsWith(name + '='))?.split(';')[0];
const request = (resource, cookie = '', headers = {}) => new Request(origin + resource, {headers: {Cookie: cookie, ...headers}});
function databaseFixture(t) {
  const sql = new DatabaseSync(':memory:');
  const db = {prepare(query) {
    const statement = sql.prepare(query); let params = [];
    return {bind(...args) {params = args; return this;}, async first() {return statement.get(...params);}, async run() {return statement.run(...params);}};
  }};
  t.after(() => {sql.close(); for (const key of Object.keys(settings)) delete settings[key];});
  return {db, sql};
}

test('plan consent verifies PKCE and identity, consumes flow once and returns to the pinned sentence', async t => {
  const {db, sql} = databaseFixture(t);
  sql.exec(readFileSync('scripts/reading-tutor-plan.sql', 'utf8'));
  Object.assign(settings, {DB: db, COS_CHATGPT_CLIENT_ID: 'registered-cos-test', COS_CHATGPT_REDIRECT_URI: origin + '/api/reading-tutor/plan/callback',
    COS_CHATGPT_TOKEN_AUTH_METHOD: 'none', COS_CHATGPT_SESSION_KEY: Buffer.alloc(32, 9).toString('base64url')});
  const pair = await generateKeyPair('RS256'), jwk = await exportJWK(pair.publicKey);
  let authParameters, consent = true, nonceMismatch = false, providerStatus = 200, providerCalls = 0, exchanges = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    switch (String(url)) {
      case issuer + '/.well-known/openid-configuration': return Response.json({issuer, authorization_endpoint: issuer + '/authorize', token_endpoint: issuer + '/token', jwks_uri: issuer + '/jwks'});
      case issuer + '/jwks': return Response.json({keys: [{...jwk, kid: 'fixture', alg: 'RS256'}]});
      case issuer + '/token': {
        exchanges++;
        const verifier = init.body.get('code_verifier');
        assert.equal(Buffer.from(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))).toString('base64url'), authParameters.get('code_challenge'));
        const id = await new SignJWT({nonce: nonceMismatch ? 'other' : authParameters.get('nonce')}).setProtectedHeader({alg: 'RS256', kid: 'fixture'})
          .setIssuer(issuer).setAudience(settings.COS_CHATGPT_CLIENT_ID).setSubject('learner').setIssuedAt().setExpirationTime('5m').sign(pair.privateKey);
        return Response.json({id_token: id, scope: consent ? authParameters.get('scope') : 'openid profile email', token_type: 'Bearer', expires_in: 300, access_token: 'fixture-grant'});
      }
      case 'https://api.openai.com/v1/models': return Response.json({models: [{visibility: 'list', slug: 'available-to-learner'}]});
      case 'https://api.openai.com/v1/responses': {
        const body = JSON.parse(init.body); providerCalls++; assert.equal(init.headers.Authorization, 'Bearer fixture-grant');
        assert.equal(init.redirect, 'manual');
        assert.equal(body.store, false); assert.equal(body.stream, true); assert.equal(body.model, 'available-to-learner');
        assert.match(body.instructions, /我一到家就给你打电话/);
        assert.deepEqual(body.input, [
          {role: 'user', content: 'earlier'}, {role: 'assistant', content: 'earlier reply'}, {role: 'user', content: input.question},
        ]);
        if (providerStatus !== 200) return Response.json({error: {code: 'subscription_sharing_user_not_eligible'}}, {status: providerStatus});
        return planResponse({type: 'response.output_text.delta', delta: 'Test answer'}, {type: 'response.completed'});
      }
      default: throw new Error('Unexpected provider request');
    }
  });
  async function begin(returnTo = page) {
    const result = await plan.POST(post({action: 'connect', returnTo}));
    assert.equal(result.status, 200);
    authParameters = new URL((await result.json()).url).searchParams;
    assert.equal(authParameters.get('code_challenge_method'), 'S256');
    return cookiePair(result, '__Host-cos-tutor-flow');
  }
  const finish = (cookie, state, query = 'code=fixture') => callback.GET(request('/api/reading-tutor/plan/callback?' + query + '&state=' + state, cookie));
  assert.equal((await plan.POST(post({action: 'connect', returnTo: 'https://other.example'}))).status, 400);
  assert.equal((await plan.POST(post({action: 'connect', returnTo: page + '&chunk=p1-c99'}))).status, 400);
  let flow = await begin();
  assert.equal((await finish(flow, 'wrong')).status, 400);
  assert.equal((await finish('', authParameters.get('state'))).status, 400);
  assert.match((await finish(flow, authParameters.get('state'), 'error=access_denied')).headers.get('location'), /tutorReturn=declined/);
  assert.equal((await finish(flow, authParameters.get('state'))).status, 400);
  assert.equal(exchanges, 0);
  flow = await begin();
  consent = false; assert.match((await finish(flow, authParameters.get('state'))).headers.get('location'), /tutorReturn=declined/);
  flow = await begin();
  consent = true; nonceMismatch = true; assert.match((await finish(flow, authParameters.get('state'))).headers.get('location'), /tutorReturn=error/);
  nonceMismatch = false;
  const pinned = page + '&chunk=p1-c1';
  flow = await begin(pinned.replace('at=p1', 'at=p9'));
  const state = authParameters.get('state');
  const results = await Promise.all([finish(flow, state), finish(flow, state)]);
  assert.deepEqual(results.map(response => response.status).sort(), [303, 400]);
  assert.equal(exchanges, 3);
  const result = results.find(response => response.status === 303);
  const back = new URL(result.headers.get('location')); assert.equal(back.searchParams.get('tutorReturn'), 'connected');
  back.searchParams.delete('tutorReturn'); assert.equal(back.search, pinned);
  assert.match(result.headers.getSetCookie().find(cookie => cookie.startsWith('__Host-cos-tutor=')), /Max-Age=\d+; Path=\/; Secure; HttpOnly; SameSite=Lax/);
  const session = cookiePair(result, '__Host-cos-tutor'); assert.ok(session && !session.includes('fixture-grant'));
  assert.ok(!sql.prepare('SELECT credential FROM reading_tutor_plan_sessions').get().credential.includes('fixture-grant'));
  assert.equal((await (await tutor.GET(request('/api/reading-tutor', session))).json()).chatgpt, 'connected');
  assert.equal((await (await tutor.GET(request('/api/reading-tutor', session, {Origin: alibaba}))).json()).chatgpt, 'unavailable');
  assert.equal((await tutor.POST(post(input, session, 'https://other.example'))).status, 403);
  assert.equal((await tutor.POST(post(input))).status, 401);
  assert.equal((await tutor.POST(post({...input, grammar:'unknown'}, session))).status, 400);
  const followUp = {...input, history: [{question: 'earlier', answer: 'earlier reply'}]};
  assert.equal((await (await tutor.POST(post(followUp, session))).json()).answer, 'Test answer');
  providerStatus = 403;
  const ineligible = await tutor.POST(post(followUp, session));
  assert.equal(ineligible.status, 403);
  assert.equal((await ineligible.json()).error, 'plan_ineligible');
  assert.equal((await (await tutor.GET(request('/api/reading-tutor', session))).json()).chatgpt, 'connected');
  providerStatus = 401;
  const revoked = await tutor.POST(post(followUp, session));
  assert.equal(revoked.status, 401);
  assert.match(revoked.headers.get('set-cookie'), /Max-Age=0/);
  assert.equal(providerCalls, 3);
  assert.equal((await tutor.POST(post(input, session))).status, 401);
  flow = await begin();
  const disconnected = await plan.POST(post({action:'disconnect'}, flow));
  assert.equal(disconnected.status, 200);
  assert.equal(disconnected.headers.getSetCookie().length, 2);
  assert.equal((await finish(flow, authParameters.get('state'))).status, 400);
});

test('DeepSeek follows the pinned reading sentence on both hosts and shares the checker quota', async t => {
  const {db, sql} = databaseFixture(t);
  sql.exec(`CREATE TABLE sentence_check_ai_quota (
    id INTEGER PRIMARY KEY CHECK (id = 1), utc_day TEXT NOT NULL DEFAULT '', daily_used INTEGER NOT NULL DEFAULT 0,
    utc_minute TEXT NOT NULL DEFAULT '', minute_used INTEGER NOT NULL DEFAULT 0
  ) STRICT;
  INSERT INTO sentence_check_ai_quota(id) VALUES (1);`);
  Object.assign(settings, {
    DB: db, DEEPSEEK_SENTENCE_CHECK_API_KEY: 'fixture', DEEPSEEK_SENTENCE_CHECK_ORIGIN: origin,
    DEEPSEEK_SENTENCE_CHECK_DAILY_LIMIT: '3', DEEPSEEK_READING_TUTOR_ADDITIONAL_ORIGIN: alibaba,
  });
  let tutorCalls = 0, checkerCalls = 0;
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://api.deepseek.com/chat/completions');
    assert.equal(init.redirect, 'manual');
    const body = JSON.parse(init.body);
    assert.equal(body.model, 'deepseek-flash');
    let content;
    if (body.response_format) {
      checkerCalls++;
      content = JSON.stringify({status: 'correct', correction: '我在家。', pinyin: 'wǒ zài jiā.', explanation: 'Clear sentence.', natural: '', naturalPinyin: ''});
    } else {
      tutorCalls++;
      assert.match(body.messages[0].content, /我以前一下班就看手机。/);
      assert.match(body.messages[0].content, /Wǒ yǐ qián yí xià bān jiù kàn shǒu jī/);
      assert.match(body.messages[0].content, /I used to go on my phone as soon as I got off work\./);
      assert.doesNotMatch(body.messages[0].content, /我一到家就给你打电话。/);
      assert.deepEqual(body.messages.slice(1).map(message => message.content), ['earlier', 'earlier reply', input.question]);
      content = 'reply';
    }
    return Response.json({choices:[{finish_reason:'stop', message:{role: 'assistant', content}}]});
  });
  const withHistory = {...input, provider:'deepseek', sourceChunk: 'p1-c1', history:[{question:'earlier',answer:'earlier reply'}]};
  assert.equal((await (await tutor.GET(request('/api/reading-tutor'))).json()).deepseek, true);
  assert.deepEqual(await (await tutor.GET(request('/api/reading-tutor', '', {Origin: alibaba}))).json(), {deepseek: true, chatgpt: 'unavailable'});
  assert.equal((await tutor.POST(post({...withHistory, question:''}))).status, 400);
  assert.equal((await tutor.POST(post({...withHistory, system:'fake'}))).status, 400);
  assert.equal((await tutor.POST(post({...withHistory, sourceChunk: 'p1-c2'}))).status, 400);
  assert.equal((await tutor.POST(post(withHistory, '', 'https://outside.example'))).status, 403);
  assert.equal(sql.prepare('SELECT daily_used FROM sentence_check_ai_quota').get().daily_used, 0);
  assert.equal((await (await tutor.POST(post(withHistory, '', alibaba))).json()).answer, 'reply');
  const check = () => checker.POST(new Request(origin + '/api/sentence-check', {
    method: 'POST', headers: {Origin: origin, 'Content-Type': 'application/json'}, body: JSON.stringify({sentence: '我在家。', locale: 'en'}),
  }));
  assert.equal((await check()).status, 200);
  assert.equal((await (await tutor.POST(post(withHistory))).json()).provider, 'deepseek');
  assert.equal((await tutor.POST(post(withHistory))).status, 429);
  assert.equal((await check()).status, 429);
  assert.equal(tutorCalls, 2);
  assert.equal(checkerCalls, 1);
  assert.equal(sql.prepare('SELECT daily_used FROM sentence_check_ai_quota').get().daily_used, 3);
});

test('an incomplete plan stream cannot become a tutor answer', async () => {
  await assert.rejects(readPlanResponse(planResponse({type:'response.output_text.delta',delta:'partial'})));
  await assert.rejects(readPlanResponse(planResponse({type:'response.failed',response:{error:{code:'subscription_sharing_usage_limit_exceeded'}}})), /rate_limited/);
});
