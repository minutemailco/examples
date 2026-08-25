// In-memory stores — this is a demo app for a marketing video, not production.
// Everything resets on restart; that is intentional and documented in the README.

const users = new Map(); // email -> user
const verifyTokens = new Map(); // token -> email
const sessions = new Map(); // sessionId -> email
const oauthStates = new Map(); // state -> codeVerifier

function createUser({ name, email, passwordHash, provider }) {
  const user = {
    name,
    email,
    passwordHash,
    provider, // 'password' | 'google'
    emailVerified: false,
    verifyToken: null,
    oauth: null, // { sub, claims } from the ID token
    createdAt: new Date().toISOString(),
  };
  users.set(email, user);
  return user;
}

function findUser(email) {
  return users.get(email);
}

function upsertOAuthUser({ sub, email, name, emailVerified, claims, picture, preferredUsername }) {
  const existing = users.get(email);
  if (existing) {
    existing.oauth = { sub, claims };
    existing.emailVerified = existing.emailVerified || emailVerified;
    return existing;
  }
  const user = createUser({
    name: name || email,
    email,
    passwordHash: null,
    provider: 'google',
  });
  user.emailVerified = !!emailVerified;
  user.oauth = { sub, claims };
  return user;
}

function setVerificationToken(email, token) {
  verifyTokens.set(token, email);
  const user = users.get(email);
  if (user) user.verifyToken = token;
}

function consumeVerificationToken(token) {
  const email = verifyTokens.get(token);
  if (!email) return null;
  verifyTokens.delete(token);
  return email;
}

function markVerified(email) {
  const user = users.get(email);
  if (user) user.emailVerified = true;
}

function createSession(email) {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, email);
  return sessionId;
}

function getSessionUser(sessionId) {
  const email = sessions.get(sessionId);
  return email ? users.get(email) : undefined;
}

function destroySession(sessionId) {
  sessions.delete(sessionId);
}

function setOAuthState(state, codeVerifier) {
  oauthStates.set(state, codeVerifier);
}

function consumeOAuthState(state) {
  const verifier = oauthStates.get(state);
  if (verifier !== undefined) oauthStates.delete(state);
  return verifier;
}

module.exports = {
  users,
  createUser,
  findUser,
  upsertOAuthUser,
  setVerificationToken,
  consumeVerificationToken,
  markVerified,
  createSession,
  getSessionUser,
  destroySession,
  setOAuthState,
  consumeOAuthState,
};
