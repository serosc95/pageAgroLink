/**
 * Punto de entrada ADD-COM.
 * HTTP (API REST + estáticos) y WebSockets en el mismo puerto.
 */
const http = require('http');
const path = require('path');
const { env } = require('./src/config/env');
const { ping } = require('./src/config/database');
const { applyCors, setSecurityHeaders, sendError } = require('./src/utils/http');
const { serveStatic } = require('./src/utils/static');
const { router } = require('./src/routes');
const { attachWebSocket } = require('./src/websocket');
const { ensureDir } = require('./src/utils/upload');

const FRONTEND = path.resolve(__dirname, '../frontend');
const UPLOADS = path.resolve(__dirname, 'uploads');

ensureDir();

const server = http.createServer(async (req, res) => {
  try {
    setSecurityHeaders(res);
    applyCors(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url, `http://${req.headers.host}`);
    req.pathname = url.pathname;
    req.query = Object.fromEntries(url.searchParams);

    const matched = router.match(req.method, req.pathname);
    if (matched) {
      req.params = matched.params;
      let i = 0;
      const handlers = matched.route.handlers;
      const next = async () => {
        const fn = handlers[i++];
        if (fn) await fn(req, res, next);
      };
      await next();
      return;
    }

    if (req.pathname.startsWith('/api/')) {
      sendError(res, 404, 'Ruta no encontrada');
      return;
    }

    if (req.method === 'GET' || req.method === 'HEAD') {
      if (serveStatic(req, res, [FRONTEND, path.join(__dirname)])) return;
    }

    sendError(res, 404, 'Recurso no encontrado');
  } catch (err) {
    console.error('[server]', err);
    if (!res.headersSent) {
      sendError(res, err.status || 500, err.status ? err.message : 'Error interno del servidor');
    }
  }
});

attachWebSocket(server);

async function start() {
  try {
    await ping();
    console.log('[db] PostgreSQL conectado');
  } catch (err) {
    console.error('[db] No se pudo conectar a PostgreSQL:', err.message);
    console.error('Revisa backend/.env y que el servicio esté en marcha (docker compose up -d).');
    process.exit(1);
  }

  server.listen(env.PORT, () => {
    console.log(`ADD-COM listo en http://localhost:${env.PORT}`);
    console.log(`API     http://localhost:${env.PORT}/api/health`);
    console.log(`WS      ws://localhost:${env.PORT}/ws`);
  });
}

start();

process.on('unhandledRejection', (err) => {
  console.error('[unhandledRejection]', err);
});
