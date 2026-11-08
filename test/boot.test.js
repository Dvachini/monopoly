const test = require('node:test');
const assert = require('node:assert');
const { startServer } = require('./helpers');

test('boots in-process without MONGO_URI and accepts a socket', async () => {
  delete process.env.MONGO_URI;
  const srv = await startServer();
  const socket = await srv.connect();
  assert.ok(socket.connected);
  await srv.close();
});

test('REST /api/games is gone', async () => {
  const srv = await startServer();
  const res = await fetch(`${srv.url}/api/games`);
  assert.strictEqual(res.status, 404);
  await srv.close();
});
