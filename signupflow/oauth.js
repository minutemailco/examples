// OAuth client for the MinuteMail mock IdP: authorization-code flow with PKCE (S256).

const crypto = require('crypto');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const { OAUTH_ISSUER, OAUTH_CLIENT_ID, OAUTH_CLIENT_SECRET, OAUTH_REDIRECT_URI } = require('./config');

const JWKS = createRemoteJWKSet(new URL('/jwks', OAUTH_ISSUER));

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function buildAuthorizeURL(state, codeChallenge) {
  const params = new URLSearchParams({
    client_id: OAUTH_CLIENT_ID,
    redirect_uri: OAUTH_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  });
  return `${OAUTH_ISSUER}/oauth/authorize?${params.toString()}`;
}

function createPKCE() {
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function createState() {
  return b64url(crypto.randomBytes(24));
}

async function exchangeCode(code, codeVerifier) {
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: OAUTH_CLIENT_ID,
    client_secret: OAUTH_CLIENT_SECRET,
    redirect_uri: OAUTH_REDIRECT_URI,
    code_verifier: codeVerifier,
  });

  const res = await fetch(`${OAUTH_ISSUER}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form.toString(),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(`token exchange failed: ${body.error || res.status} ${body.error_description || ''}`);
  }
  return body;
}

// Verifies the RS256 ID token against the IdP's JWKS and returns its claims.
async function verifyIDToken(idToken) {
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: OAUTH_ISSUER,
    audience: OAUTH_CLIENT_ID,
  });
  return payload;
}

module.exports = { buildAuthorizeURL, createPKCE, createState, exchangeCode, verifyIDToken };
