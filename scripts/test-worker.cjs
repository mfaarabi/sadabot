const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const { default: worker } = await import('../worker/index.mjs');
  const env = { DEMO_USERNAME: 'synthetic-user', DEMO_PASSWORD: 'synthetic:password' };
  const calls = [];
  const assets = {
    async fetch(request) {
      calls.push(request);
      return new Response(request.method === 'HEAD' ? null : 'asset body', {
        status: request.url.endsWith('/missing.css') ? 404 : 200,
        headers: { Vary: 'Accept-Encoding' },
      });
    },
  };
  const configured = { ...env, ASSETS: assets };
  const auth = (user = env.DEMO_USERNAME, password = env.DEMO_PASSWORD) =>
    `Basic ${Buffer.from(`${user}:${password}`, 'utf8').toString('base64')}`;
  const request = (url = '/', method = 'GET', authorization) =>
    new Request(new URL(url, 'https://demo.example/'), { method, headers: authorization ? { Authorization: authorization } : {} });
  const secure = response => {
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.match(response.headers.get('Vary') || '', /(?:^|,\s*)Authorization(?:,|$)/i);
    assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow, noarchive');
    assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(response.headers.get('Referrer-Policy'), 'no-referrer');
  };

  for (const missingEnv of [
    { ...configured, DEMO_USERNAME: '' },
    { ...configured, DEMO_PASSWORD: '' },
    { ...configured, DEMO_USERNAME: 'bad:name' },
  ]) {
    const before = calls.length;
    const response = await worker.fetch(request('/'), missingEnv);
    assert.equal(response.status, 503);
    assert.equal(calls.length, before);
    secure(response);
  }

  for (const [url, header] of [
    ['/', undefined],
    ['/style.css', auth('wrong', env.DEMO_PASSWORD)],
    ['/app.js', auth(env.DEMO_USERNAME, 'wrong')],
    ['/', 'Basic !!!!'],
    ['/', `Basic ${Buffer.from([0xc3, 0x28]).toString('base64')}`],
    ['/', `Basic ${'A'.repeat(4097)}`],
  ]) {
    const before = calls.length;
    const response = await worker.fetch(request(url, 'GET', header), configured);
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('WWW-Authenticate'), 'Basic realm="Sadabot demo", charset="UTF-8"');
    assert.equal(calls.length, before);
    secure(response);
  }

  for (const method of ['GET', 'HEAD']) {
    const response = await worker.fetch(request('/?from=home', method, auth()), configured);
    assert.equal(response.status, 200);
    assert.equal(calls.at(-1).url, 'https://demo.example/index.html?from=home');
    assert.equal(calls.at(-1).method, method);
    secure(response);
  }

  const utf8Env = { ...configured, DEMO_USERNAME: 'usér', DEMO_PASSWORD: 'pāss:word' };
  let response = await worker.fetch(request('/direct.css', 'GET', auth('usér', 'pāss:word')), utf8Env);
  assert.equal(response.status, 200);
  assert.equal(calls.at(-1).url, 'https://demo.example/direct.css');
  secure(response);

  response = await worker.fetch(request('/missing.css', 'GET', auth()), configured);
  assert.equal(response.status, 404, 'authenticated asset 404 should pass through');
  secure(response);

  const beforeHead = calls.length;
  response = await worker.fetch(request('/asset.js', 'HEAD', auth()), configured);
  assert.equal(response.status, 200);
  assert.equal(response.body, null);
  assert.equal(calls.length, beforeHead + 1);
  secure(response);

  const beforePost = calls.length;
  response = await worker.fetch(request('/', 'POST', auth()), configured);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('Allow'), 'GET, HEAD');
  assert.equal(calls.length, beforePost);
  secure(response);

  const configPath = path.resolve(__dirname, '../wrangler.jsonc');
  if (fs.existsSync(configPath)) {
    const config = fs.readFileSync(configPath, 'utf8');
    assert.match(config, /"run_worker_first"\s*:\s*true/, 'wrangler assets.run_worker_first must be true');
  }

  console.log('worker tests passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
