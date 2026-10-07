const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/controllers/ClearanceController.ts'), 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const controllerModule = { exports: {} };
new Function('exports', 'module', compiled)(controllerModule.exports, controllerModule);
const { ClearanceController } = controllerModule.exports;

function environment(overrides = {}) {
  let count = 0;
  return {
    ALLOWED_ORIGIN: 'https://bwrp.net',
    SECRET_TARGET_HASH: 'TEST-ACCESS-KEY',
    SECRET_VIDEO_LINK: 'https://www.youtube.com/watch?v=abcdefghijk',
    DATABASE: { prepare: () => ({ bind: () => ({ first: async () => ({ count: ++count }) }) }) },
    ...overrides,
  };
}

function request(key, overrides = {}) {
  return new Request('https://bwrp.net/api/clearance/unlock', {
    method: 'POST',
    headers: { Origin: 'https://bwrp.net', 'Content-Type': 'application/json', 'CF-Connecting-IP': '192.0.2.1' },
    body: JSON.stringify({ key }),
    ...overrides,
  });
}

test('wrong keys never return the video; correct key returns a privacy embed without caching', async () => {
  const env = environment();
  const denied = await ClearanceController.unlock(request('wrong'), env);
  assert.equal(denied.status, 401);
  assert.equal((await denied.text()).includes('abcdefghijk'), false);
  const allowed = await ClearanceController.unlock(request(' test-access-key '), env);
  assert.equal(allowed.status, 200);
  assert.match(allowed.headers.get('Cache-Control'), /no-store/);
  assert.deepEqual(await allowed.json(), { videoUrl: 'https://www.youtube-nocookie.com/embed/abcdefghijk' });
});

test('missing configuration and rate-limiter failure deny even the right key', async () => {
  for (const env of [environment({ SECRET_TARGET_HASH: '' }), environment({ SECRET_VIDEO_LINK: '' }), environment({
    DATABASE: { prepare: () => { throw new Error('Unavailable'); } },
  })]) {
    const response = await ClearanceController.unlock(request('TEST-ACCESS-KEY'), env);
    assert.equal(response.status, 503);
    assert.equal((await response.text()).includes('abcdefghijk'), false);
  }
});

test('five attempts per minute; the sixth denies even the correct key', async () => {
  const env = environment();
  for (let i = 0; i < 5; i++) assert.equal((await ClearanceController.unlock(request('wrong'), env)).status, 401);
  const response = await ClearanceController.unlock(request('TEST-ACCESS-KEY'), env);
  assert.equal(response.status, 429);
  assert.equal(response.headers.get('Retry-After'), '60');
  assert.equal((await response.text()).includes('abcdefghijk'), false);
});

test('foreign origins, invalid JSON, empty keys and oversized bodies are denied', async () => {
  const cases = [
    [request('TEST-ACCESS-KEY', { headers: { Origin: 'https://example.com', 'Content-Type': 'application/json' } }), 403],
    [request('TEST-ACCESS-KEY', { headers: { 'Content-Type': 'application/json' } }), 403],
    [request('', { body: '{' }), 400],
    [request(''), 400],
    [request('x'.repeat(2048)), 413],
    [request('TEST-ACCESS-KEY', { headers: { Origin: 'https://bwrp.net', 'Content-Type': 'text/plain' } }), 415],
  ];
  for (const [req, status] of cases) {
    const response = await ClearanceController.unlock(req, environment());
    assert.equal(response.status, status);
    assert.equal((await response.text()).includes('abcdefghijk'), false);
  }
});

test('accept supported YouTube links and reject arbitrary or malformed destinations', async () => {
  for (const link of ['https://youtu.be/abcdefghijk', 'https://www.youtube.com/embed/abcdefghijk?si=example', 'https://www.youtube-nocookie.com/embed/abcdefghijk']) {
    assert.equal((await ClearanceController.unlock(request('TEST-ACCESS-KEY'), environment({ SECRET_VIDEO_LINK: link }))).status, 200);
  }
  for (const link of ['https://example.com/embed/abcdefghijk', 'http://www.youtube.com/embed/abcdefghijk', 'https://www.youtube.com/embed/invalid', 'https://user:password@www.youtube.com/embed/abcdefghijk']) {
    assert.equal((await ClearanceController.unlock(request('TEST-ACCESS-KEY'), environment({ SECRET_VIDEO_LINK: link }))).status, 503);
  }
});

test('public page and JS contain no key comparison, video iframe or secret values', () => {
  const root = path.join(__dirname, '../..');
  const html = fs.readFileSync(path.join(root, 'clearance.html'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'assets/js/clearance.js'), 'utf8');
  assert.doesNotMatch(html, /<iframe|cdn\.tailwindcss\.com|TARGET_HASH|youtube\.com\/embed/);
  assert.doesNotMatch(js, /TARGET_HASH|SECRET_VIDEO_LINK/);
  assert.match(js, /fetch\('\/api\/clearance\/unlock'/);
});

test('security worker maps both clearance paths and permits the embed', async () => {
  const source = fs.readFileSync(path.join(__dirname, '../../security-worker/worker.js'), 'utf8');
  const { default: worker } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const originalFetch = global.fetch;
  global.fetch = async req => {
    assert.equal(new URL(req.url).pathname, '/clearance.html');
    return new Response('<html></html>', { headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' } });
  };
  try {
    for (const route of ['/clearance', '/clearance/']) {
      const response = await worker.fetch(new Request(`https://bwrp.net${route}`), {}, {});
      assert.equal(response.status, 200);
      assert.match(response.headers.get('Content-Security-Policy'), /frame-src https:\/\/www.youtube-nocookie.com/);
      assert.equal(response.headers.has('Access-Control-Allow-Origin'), false);
    }
  } finally {
    global.fetch = originalFetch;
  }
});
