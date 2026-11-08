const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');

// 3000 = Vite dev server
const DEFAULT_ORIGINS = [
  'https://mono.dvachini.cc',
  'http://localhost:5000',
  'http://localhost:5055',
  'http://localhost:3000',
].join(',');

function createApp(opts = {}) {
  // Cross-site origins allowed (comma list in ALLOWED_ORIGINS)
  // Same-origin browsers always pass
  const allowedOrigins =
    opts.allowedOrigins ||
    (process.env.ALLOWED_ORIGINS || DEFAULT_ORIGINS)
      .split(',')
      .map((o) => o.trim())
      .filter(Boolean);

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  // Create HTTP server and attach Socket.IO
  const server = http.createServer(app);
  const io = new Server(server, {
    maxHttpBufferSize: 1e5,
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
    },
    // No Origin (curl, tests, native clients) passes; browsers must be
    // on the list or same-origin (LAN play via http://<ip>:5000)
    allowRequest: (req, callback) => {
      const origin = req.headers.origin;
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      try {
        return callback(null, new URL(origin).host === req.headers.host);
      } catch (err) {
        return callback(null, false);
      }
    },
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // React inline styles
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'", 'ws:', 'wss:'],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
        },
      },
    }),
  );
  app.use(cors({ origin: allowedOrigins }));

  app.get('/health', (req, res) => {
    res.json({ ok: true });
  });

  // Socket.IO event handling
  const socketHandler = require('./sockets/gameSocket');
  const stopSockets = socketHandler(io, opts);

  // No REST left: unknown API paths must not fall into the SPA
  app.use(['/api', '/socket.io'], (req, res) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Serve static files in production
  // Docker copies the build to ./dist; locally it is in client/dist
  const distPath = fs.existsSync(path.join(__dirname, 'dist'))
    ? path.join(__dirname, 'dist')
    : path.join(__dirname, 'client', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });

  // Never leak err.message or the stack
  app.use((err, req, res, next) => {
    console.log(`${req.method} ${req.url} by ${req.ip} [errorHandler]`);
    res.status(err.status || 500).json({ error: 'Internal error' });
  });

  const close = () =>
    new Promise((resolve) => {
      stopSockets();
      io.close(() => resolve());
    });

  return { app, server, io, close };
}

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  const { server, close } = createApp();

  server.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const nets = os.networkInterfaces();
    let localIP = 'localhost';
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          localIP = net.address;
          break;
        }
      }
    }
    console.log(`Server running on port ${PORT}`);
    console.log(`Local: http://localhost:${PORT}`);
    console.log(`Network: http://${localIP}:${PORT}`);
  });

  // PROCESS ----
  // Bad input must not kill the server
  process.on('uncaughtException', (err) => {
    console.log(`uncaughtException: ${err.message}`);
  });
  process.on('unhandledRejection', (reason) => {
    console.log(`unhandledRejection: ${reason}`);
  });

  // Graceful stop (docker stop sends SIGTERM)
  const shutdown = (signal) => {
    console.log(`${signal} received, closing`);
    setTimeout(() => process.exit(1), 10000).unref();
    close().then(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

module.exports = { createApp };
