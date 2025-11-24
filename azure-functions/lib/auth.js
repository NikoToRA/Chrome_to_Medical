const jwt = require('jsonwebtoken');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === 'default-secret-change-me' || secret === 'default-dev-secret-1763971273') {
    throw new Error('JWT secret is not securely configured');
  }
  return secret;
}

function extractBearer(req) {
  const auth = req.headers && (req.headers.authorization || req.headers.Authorization);
  if (!auth) return null;
  const parts = auth.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null;
  return parts[1];
}

async function requireAuth(context, req) {
  const token = extractBearer(req);
  if (!token) {
    const err = new Error('Missing Authorization header');
    err.status = 401;
    throw err;
  }
  try {
    const payload = jwt.verify(token, getSecret());
    if (!payload || !payload.email) {
      const err = new Error('Invalid token payload');
      err.status = 401;
      throw err;
    }
    return { email: payload.email, payload };
  } catch (e) {
    e.status = 401;
    throw e;
  }
}

module.exports = {
  requireAuth,
  getSecret,
};

