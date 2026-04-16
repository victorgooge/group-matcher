import jwt from 'jsonwebtoken';

export function requireAuth(req, res, next) {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
    req.user = payload;
    return next();
  } catch {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
}

export function requireRole(...roles) {
  return function roleMiddleware(req, res, next) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
    }
    return next();
  };
}

export function optionalAuth(req, _res, next) {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    next();
    return;
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret');
  } catch {
    req.user = null;
  }

  next();
}

function getBearerToken(authHeader = '') {
  return authHeader.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '')
    : null;
}
