const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'autocrm-dev-secret';
const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL_SHORT = '24h';
const REFRESH_TOKEN_TTL_LONG = '30d';

function signAccess(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email, role: user.role, company_id: user.company_id },
    JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_TTL }
  );
}

function signRefresh(userId, rememberMe) {
  return jwt.sign(
    { id: userId },
    JWT_SECRET,
    { expiresIn: rememberMe ? REFRESH_TOKEN_TTL_LONG : REFRESH_TOKEN_TTL_SHORT }
  );
}

function verifyToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.user = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token expired or invalid' });
  }
}

// Optional auth — sets req.user if token present but doesn't block
function optionalAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) {
    try { req.user = jwt.verify(auth.slice(7), JWT_SECRET); } catch {}
  }
  next();
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { verifyToken, optionalAuth, signAccess, signRefresh, JWT_SECRET, requireRole };
