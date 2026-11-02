const MAX_AUTHORIZATION_LENGTH = 4096;
const CHALLENGE = 'Basic realm="Sadabot demo", charset="UTF-8"';

function unauthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: { 'WWW-Authenticate': CHALLENGE },
  });
}

function unavailable() {
  return new Response('Demo authentication is not configured', { status: 503 });
}

function decodeBasic(value) {
  const match = /^Basic ([A-Za-z0-9+/]+={0,2})$/i.exec(value);
  if (!match) return null;

  const encoded = match[1];
  if (encoded.length % 4 === 1) return null;

  try {
    const binary = atob(encoded);
    const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
    // Reject non-canonical padding and malformed encodings accepted by permissive atob.
    const canonical = btoa(binary).replace(/=+$/, '');
    if (canonical !== encoded.replace(/=+$/, '')) return null;
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

async function digest(value) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));
}

function constantTimeEqual(left, right) {
  let difference = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return difference === 0;
}

async function authorize(request, env) {
  const username = env.DEMO_USERNAME;
  const password = env.DEMO_PASSWORD;
  if (typeof username !== 'string' || !username || typeof password !== 'string' || !password || username.includes(':')) {
    return unavailable();
  }

  const authorization = request.headers.get('Authorization');
  if (!authorization || authorization.length > MAX_AUTHORIZATION_LENGTH) return unauthorized();

  const provided = decodeBasic(authorization);
  if (provided === null || !provided.includes(':')) return unauthorized();

  const [expectedDigest, providedDigest] = await Promise.all([
    digest(`${username}:${password}`),
    digest(provided),
  ]);
  return constantTimeEqual(expectedDigest, providedDigest) ? null : unauthorized();
}

function addSecurityHeaders(response) {
  const protectedResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  protectedResponse.headers.set('Cache-Control', 'no-store');
  protectedResponse.headers.append('Vary', 'Authorization');
  protectedResponse.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  protectedResponse.headers.set('X-Content-Type-Options', 'nosniff');
  protectedResponse.headers.set('Referrer-Policy', 'no-referrer');
  return protectedResponse;
}

export default {
  async fetch(request, env) {
    const authFailure = await authorize(request, env);
    if (authFailure) return addSecurityHeaders(authFailure);

    let response;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response = new Response('Method not allowed', {
        status: 405,
        headers: { Allow: 'GET, HEAD' },
      });
    } else {
      // Keep asset failures visible to the platform; only authorization parsing is contained.
      const assetUrl = new URL(request.url);
      if (assetUrl.pathname === '/') assetUrl.pathname = '/index.html';
      response = await env.ASSETS.fetch(new Request(assetUrl, request));
    }
    return addSecurityHeaders(response);
  },
};
