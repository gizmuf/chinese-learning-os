const canonicalOrigin = 'https://chineseos.l00p.network';
const canonicalHostname = new URL(canonicalOrigin).host;
const hongKongOrigin = 'https://cos.l00p.network';
const tutorPath = '/api/reading-tutor';
const planPath = `${tutorPath}/plan`;
const callbackPath = `${planPath}/callback`;
const sessionCookie = '__Host-cos-tutor';
const flowCookie = '__Host-cos-tutor-flow';

export function createTutorGatewayRoute({planEnabled = false} = {}) {
  return function tutorGatewayRoute(request, path) {
    if (path !== tutorPath && !path.startsWith(`${tutorPath}/`)) return null;

    const methods = path === tutorPath ? ['GET', 'POST']
      : path === planPath ? ['POST']
      : path === callbackPath ? ['GET'] : null;
    if (!methods) return {status: 404, error: 'unknown_route'};
    if (!methods.includes(request.method)) return {status: 405, error: 'method_not_allowed'};

    const {host, origin} = request.headers;
    const canonicalHost = host === canonicalHostname;
    if (path !== tutorPath && (!planEnabled || !canonicalHost || origin === hongKongOrigin)) {
      return {status: 503, error: 'unavailable'};
    }
    if (request.method === 'POST' && (origin !== canonicalOrigin && (path !== tutorPath || origin !== hongKongOrigin))) {
      return {status: 403, error: 'invalid_origin'};
    }

    const headers = {'accept-encoding': 'identity'};
    if (origin) headers.origin = origin;
    if (!origin && request.method === 'GET' && canonicalHost) headers.origin = canonicalOrigin;
    for (const name of ['content-type', 'content-length']) {
      if (request.headers[name]) headers[name] = request.headers[name];
    }

    const cookies = planEnabled && canonicalHost && headers.origin === canonicalOrigin;
    if (cookies) {
      headers.host = canonicalHostname;
      const parts = (request.headers.cookie ?? '').split(';').map(part => part.trim());
      const names = path === callbackPath ? [flowCookie, sessionCookie] : [sessionCookie];
      const allowed = names.flatMap(name => {
        const matches = parts.filter(part => part.startsWith(`${name}=`));
        return matches.length === 1 ? matches : [];
      });
      if (allowed.length) headers.cookie = allowed.join('; ');
    }

    const responseCookies = !cookies ? null : path !== tutorPath ? 'plan'
      : request.method === 'POST' ? 'clear-session' : null;
    return {headers, responseCookies};
  };
}

export function filterTutorResponse(headers, route, status) {
  delete headers['access-control-allow-origin'];
  delete headers['access-control-allow-credentials'];
  const rawCookies = headers['set-cookie'] ?? [];
  delete headers['set-cookie'];
  if (!route.responseCookies) return;

  // Pass the exact host-only cookie format emitted by tutorCookie().
  const cookie = /^__Host-cos-tutor(?:-flow)?=[\w.-]*; Max-Age=\d+; Path=\/; Secure; HttpOnly; SameSite=Lax$/;
  const allowed = rawCookies.filter(value => cookie.test(value) && (
    route.responseCookies === 'plan' || (status === 401 && value.startsWith(`${sessionCookie}=; Max-Age=0;`))
  ));
  if (allowed.length) headers['set-cookie'] = allowed;
}
