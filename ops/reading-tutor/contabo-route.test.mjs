import assert from 'node:assert/strict';
import test from 'node:test';
import {createTutorGatewayRoute, filterTutorResponse} from './contabo-route.mjs';

const path = '/api/reading-tutor';
const canonicalHost = 'chineseos.l00p.network';
const canonical = `https://${canonicalHost}`;
const hongKong = 'https://cos.l00p.network';
const cookie = '__Host-cos-tutor=session; guest=guest-session; __Host-cos-tutor-flow=flow';

test('guest tutor forwards the exact allowlisted paths, methods, and headers', () => {
  const route = createTutorGatewayRoute();
  const req = {
    method: 'POST',
    headers: {
      host: canonicalHost, origin: hongKong, 'content-type': 'application/json', 'content-length': '2',
      cookie, authorization: 'Bearer secret', 'x-forwarded-host': 'foreign.invalid',
      'oai-authenticated-user-example': 'guest', 'x-extra-header': 'guest',
    },
  };
  const forwarded = route(req, path);
  assert.deepEqual(forwarded.headers, {
    origin: hongKong, 'accept-encoding': 'identity', 'content-type': 'application/json', 'content-length': '2',
  });
  assert.equal(route({...req, headers: {...req.headers, origin: 'https://foreign.invalid'}}, path).status, 403);
  assert.equal(route({...req, headers: {host: canonicalHost}}, path).status, 403);
  assert.equal(route({...req, method: 'PUT'}, path).status, 405);
  assert.equal(route(req, `${path}/plan`).status, 503);
  assert.equal(route({...req, method: 'GET'}, `${path}/plan/callback`).status, 503);
  assert.equal(route(req, `${path}/future`).status, 404);
  assert.equal(route(req, '/api/elsewhere'), null);
  assert.equal(route({method: 'GET', headers: {host: canonicalHost}}, path).headers.origin, canonical);
  assert.equal(route({method: 'GET', headers: {host: canonicalHost, origin: hongKong}}, path).headers.origin, hongKong);

  const response = {
    'set-cookie': ['guest=secret'], 'access-control-allow-origin': '*',
    'access-control-allow-credentials': 'true', 'cache-control': 'no-store',
  };
  filterTutorResponse(response, forwarded);
  assert.deepEqual(response, {'cache-control': 'no-store'});
});

test('future plan session cookies stay within the exact canonical tutor paths', () => {
  const route = createTutorGatewayRoute({planEnabled: true});
  const get = {method: 'GET', headers: {host: canonicalHost, cookie}};
  assert.equal(route(get, path).headers.host, canonicalHost);
  assert.equal(route({...get, headers: {...get.headers, origin: hongKong}}, path).headers.host, undefined);
  assert.equal(route(get, path).headers.cookie, '__Host-cos-tutor=session');
  assert.equal(route({...get, headers: {...get.headers, origin: hongKong}}, path).headers.cookie, undefined);
  assert.equal(route({...get, headers: {...get.headers, host: 'foreign.invalid'}}, path).headers.cookie, undefined);
  const callback = route(get, `${path}/plan/callback`);
  assert.equal(callback.headers.cookie, '__Host-cos-tutor-flow=flow; __Host-cos-tutor=session');
  assert.equal(route({...get, headers: {...get.headers, cookie: `${cookie}; __Host-cos-tutor=duplicate`}}, path).headers.cookie, undefined);
  const session = '__Host-cos-tutor=session; Max-Age=3600; Path=/; Secure; HttpOnly; SameSite=Lax';
  const flow = '__Host-cos-tutor-flow=; Max-Age=0; Path=/; Secure; HttpOnly; SameSite=Lax';
  const response = {'set-cookie': [session, flow, 'guest=secret', `${session}; Domain=l00p.network`]};
  filterTutorResponse(response, callback);
  assert.deepEqual(response['set-cookie'], [session, flow]);
  filterTutorResponse(response, route(get, path));
  assert.equal(response['set-cookie'], undefined);
  const ask = route({method: 'POST', headers: {...get.headers, origin: canonical}}, path);
  const clearSession = session.replace('session; Max-Age=3600', '; Max-Age=0');
  const reconnect = {'set-cookie': [session, flow, clearSession]};
  filterTutorResponse(reconnect, ask, 401);
  assert.deepEqual(reconnect['set-cookie'], [clearSession]);
});
