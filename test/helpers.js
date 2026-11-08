const { createApp } = require('../server');
const { io: ioClient } = require('socket.io-client');

// Start the app on a random port, no Mongo, no .env needed
async function startServer(opts = {}) {
  const ctx = createApp(opts);
  await new Promise((resolve) => ctx.server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${ctx.server.address().port}`;
  const sockets = [];

  // connect() resolves once the socket is connected
  const connect = (clientOpts = {}) =>
    new Promise((resolve, reject) => {
      const socket = ioClient(url, {
        transports: ['websocket'],
        forceNew: true,
        reconnection: false,
        ...clientOpts,
      });
      sockets.push(socket);
      socket.once('connect', () => resolve(socket));
      socket.once('connect_error', reject);
    });

  const close = async () => {
    sockets.forEach((s) => s.close());
    await ctx.close();
  };

  return { ...ctx, url, connect, close };
}

// Resolves with the first payload of `event`, or rejects after ms
function once(socket, event, ms = 1000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      socket.off(event, handler);
      reject(new Error(`timeout waiting for ${event}`));
    }, ms);
    const handler = (payload) => {
      clearTimeout(timer);
      resolve(payload);
    };
    socket.once(event, handler);
  });
}

// Resolves true if `event` does NOT arrive within ms
function never(socket, event, ms = 200) {
  return new Promise((resolve, reject) => {
    const handler = () => {
      clearTimeout(timer);
      reject(new Error(`unexpected ${event}`));
    };
    const timer = setTimeout(() => {
      socket.off(event, handler);
      resolve(true);
    }, ms);
    socket.once(event, handler);
  });
}

module.exports = { startServer, once, never };
