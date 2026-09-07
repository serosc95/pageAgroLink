const windows = new Map();

function rateLimit({ windowMs = 60_000, max = 80, keyFn } = {}) {
  return (req, res) => {
    const key = (keyFn && keyFn(req)) || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    let bucket = windows.get(key);
    if (!bucket || now - bucket.start > windowMs) {
      bucket = { start: now, count: 0 };
      windows.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      res.writeHead(429, { 'Content-Type': 'application/json; charset=utf-8', 'Retry-After': '60' });
      res.end(JSON.stringify({ error: { message: 'Demasiadas peticiones. Intenta de nuevo en un minuto.' } }));
      return false;
    }
    return true;
  };
}

// Limpieza periódica para no crecer sin límite
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of windows) {
    if (now - bucket.start > 5 * 60_000) windows.delete(key);
  }
}, 60_000).unref();

module.exports = { rateLimit };
