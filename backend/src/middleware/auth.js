const { verifyToken } = require('../utils/jwt');
const { sendError } = require('../utils/http');
const User = require('../models/User');

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Adjunta req.user si hay token válido. No falla si falta. */
async function optionalAuth(req) {
  const token = extractToken(req);
  if (!token) return;
  try {
    const payload = verifyToken(token);
    req.user = await User.findById(payload.sub);
  } catch {
    req.user = null;
  }
}

/** Exige sesión autenticada. */
async function requireAuth(req, res) {
  const token = extractToken(req);
  if (!token) {
    sendError(res, 401, 'Debes iniciar sesión');
    return false;
  }
  try {
    const payload = verifyToken(token);
    const user = await User.findById(payload.sub);
    if (!user) {
      sendError(res, 401, 'Sesión inválida');
      return false;
    }
    req.user = user;
    return true;
  } catch {
    sendError(res, 401, 'Token expirado o inválido');
    return false;
  }
}

function requireRol(...roles) {
  return async (req, res) => {
    if (!req.user) {
      sendError(res, 401, 'Debes iniciar sesión');
      return false;
    }
    if (!roles.includes(req.user.rol)) {
      sendError(res, 403, 'No tienes permiso para esta acción');
      return false;
    }
    return true;
  };
}

module.exports = { extractToken, optionalAuth, requireAuth, requireRol };
