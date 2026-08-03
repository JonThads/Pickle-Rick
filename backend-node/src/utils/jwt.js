// =============================================================================
// JWT helpers
// =============================================================================
// JWT = JSON Web Token. It's a signed (not encrypted!) blob the client stores
// after login and sends back on every request, so the server can prove "this
// really is user X" without looking anything up in a session table.

const jwt = require('jsonwebtoken');

function signToken(user) {
  // Keep the payload small - just enough to identify + authorize the user.
  // Never put the password hash (or anything secret) inside a JWT: it is
  // only signed, not encrypted, so anyone holding the token can read this.
  const payload = { sub: user.id, role: user.role };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

function verifyToken(token) {
  // Throws if the token is invalid or expired - callers should try/catch.
  return jwt.verify(token, process.env.JWT_SECRET);
}

module.exports = { signToken, verifyToken };
