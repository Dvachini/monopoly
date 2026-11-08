const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { startServer, once } = require('./helpers');

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('GET /health is ok', async () => {
  const srv = await startServer();
  const res = await fetch(`${srv.url}/health`);
  assert.strictEqual(res.status, 200);
  assert.deepStrictEqual(await res.json(), { ok: true });
  await srv.close();
});

test('unknown /api route is a JSON 404, not index.html', async () => {
  const srv = await startServer();
  const res = await fetch(`${srv.url}/api/anything`);
  assert.strictEqual(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepStrictEqual(await res.json(), { error: 'Not found' });
  await srv.close();
});

test('security headers: CSP set, x-powered-by gone', async () => {
  const srv = await startServer();
  const res = await fetch(`${srv.url}/health`);
  const csp = res.headers.get('content-security-policy');
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.strictEqual(res.headers.get('x-powered-by'), null);
  await srv.close();
});

test('without ./dist the client build in client/dist is served', async (t) => {
  const built = fs.existsSync(path.join(__dirname, '..', 'client', 'dist'));
  const rootBuilt = fs.existsSync(path.join(__dirname, '..', 'dist'));
  if (!built && !rootBuilt) return t.skip('no client build yet');
  const srv = await startServer();
  const res = await fetch(`${srv.url}/`);
  assert.strictEqual(res.status, 200);
  assert.match(res.headers.get('content-type'), /text\/html/);
  await srv.close();
});

test('errors give a generic JSON body', async () => {
  const srv = await startServer();
  const res = await fetch(`${srv.url}/%E0%A4%A`);
  assert.strictEqual(res.status, 400);
  assert.deepStrictEqual(await res.json(), { error: 'Internal error' });
  await srv.close();
});

test('socket origin: evil refused, allowed/same-origin/none accepted', async () => {
  const srv = await startServer();
  await assert.rejects(
    srv.connect({ extraHeaders: { Origin: 'https://evil.example' } }),
  );
  for (const origin of [
    'https://mono.dvachini.cc',
    'http://localhost:3000',
    srv.url,
  ]) {
    const s = await srv.connect({ extraHeaders: { Origin: origin } });
    assert.ok(s.connected, origin);
  }
  const none = await srv.connect();
  assert.ok(none.connected);
  await srv.close();
});

test('ALLOWED_ORIGINS option replaces the default list', async () => {
  const srv = await startServer({ allowedOrigins: ['https://other.example'] });
  const ok = await srv.connect({
    extraHeaders: { Origin: 'https://other.example' },
  });
  assert.ok(ok.connected);
  await assert.rejects(
    srv.connect({ extraHeaders: { Origin: 'https://mono.dvachini.cc' } }),
  );
  await srv.close();
});

test('a packet over 100KB drops the socket, the server keeps serving', async () => {
  const srv = await startServer();
  const big = await srv.connect();
  const closed = once(big, 'disconnect', 3000);
  big.emit('chat-message', { message: 'x'.repeat(200000) });
  await closed;

  await wait(50);
  const res = await fetch(`${srv.url}/health`);
  assert.strictEqual(res.status, 200);
  const next = await srv.connect();
  const p = once(next, 'room-created');
  next.emit('create-room', { playerName: 'Ok', playerColor: 'red' });
  await p;
  await srv.close();
});
