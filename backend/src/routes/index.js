/**
 * Definición de rutas de la API (capa de enrutamiento MVC).
 */
const { Router } = require('../utils/router');
const { sendJson, sendError } = require('../utils/http');
const { ping } = require('../config/database');
const { requireAuth, requireRol } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const products = require('../controllers/productController');
const messages = require('../controllers/messageController');
const suggestions = require('../controllers/suggestionController');

const router = new Router();
const limitAuth = rateLimit({ windowMs: 60_000, max: 15 });
const limitApi = rateLimit({ windowMs: 60_000, max: 120 });

function wrap(handler, guards = []) {
  return async (req, res) => {
    if (!limitApi(req, res)) return;
    for (const guard of guards) {
      const ok = await guard(req, res);
      if (!ok) return;
    }
    await handler(req, res);
  };
}

router.get('/api/health', async (_req, res) => {
  const db = await ping().catch(() => false);
  sendJson(res, db ? 200 : 503, { ok: db, servicio: 'ADD-COM API' });
});

router.post('/api/auth/registro-vendedor', async (req, res) => {
  if (!limitAuth(req, res)) return;
  await auth.registroVendedor(req, res);
});

router.post('/api/auth/registro-comprador', async (req, res) => {
  if (!limitAuth(req, res)) return;
  await auth.registroComprador(req, res);
});

router.post('/api/auth/login', async (req, res) => {
  if (!limitAuth(req, res)) return;
  await auth.login(req, res);
});

router.get('/api/auth/me', wrap(auth.me, [requireAuth]));

router.get('/api/vendedores', wrap(users.listVendedores));
router.get('/api/vendedores/:id', wrap(users.getVendedor));
router.put('/api/usuarios/me', wrap(users.updateMe, [requireAuth]));
router.delete('/api/usuarios/me', wrap(users.deleteMe, [requireAuth]));

router.get('/api/productos', wrap(products.listMine, [requireAuth, requireRol('vendedor')]));
router.post('/api/productos', wrap(products.create, [requireAuth, requireRol('vendedor')]));
router.put('/api/productos/:id', wrap(products.update, [requireAuth, requireRol('vendedor')]));
router.delete('/api/productos/:id', wrap(products.remove, [requireAuth, requireRol('vendedor')]));

router.get('/api/mensajes', wrap(messages.inbox, [requireAuth]));
router.get('/api/mensajes/:usuarioId', wrap(messages.historial, [requireAuth]));
router.post('/api/mensajes', wrap(messages.enviar, [requireAuth]));

router.post('/api/sugerencias', wrap(suggestions.create));

// 404 de API se resuelve en el servidor si no hay match
router.get('/api/docs', async (_req, res) => {
  sendJson(res, 200, {
    nombre: 'ADD-COM API',
    version: '1.0.0',
    documentacion: 'Ver README.md en la raíz del proyecto',
  });
});

// Evitar que una ruta no registrada de /api caiga al estático sin mensaje
async function notFoundApi(_req, res) {
  sendError(res, 404, 'Ruta no encontrada');
}

module.exports = { router, notFoundApi };
