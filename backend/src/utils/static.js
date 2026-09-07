/**
 * Servidor de archivos estáticos (frontend + fotos subidas).
 * Bloquea path traversal.
 */
const fs = require('fs');
const path = require('path');
const { setSecurityHeaders } = require('./http');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
};

function safeJoin(root, urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const clean = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.join(root, clean);
  if (!full.startsWith(root)) return null;
  return full;
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const type = MIME[ext] || 'application/octet-stream';
  const stream = fs.createReadStream(filePath);
  res.writeHead(200, { 'Content-Type': type, 'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=86400' });
  stream.pipe(res);
  stream.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(500);
      res.end();
    }
  });
}

function serveStatic(req, res, roots) {
  setSecurityHeaders(res);
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';

  for (const root of roots) {
    const file = safeJoin(root, urlPath);
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) {
      sendFile(res, file);
      return true;
    }

    if (file && !path.extname(file)) {
      const html = `${file}.html`;
      if (fs.existsSync(html) && fs.statSync(html).isFile()) {
        sendFile(res, html);
        return true;
      }
    }
  }
  return false;
}

module.exports = { serveStatic, sendFile };
