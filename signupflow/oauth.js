// OAuth client for the MinuteMail mock IdP: authorization-code flow with PKCE (S256).
// Two providers are wired: a custom IdP (email verification enforced) and
// Google (no verification step, fixed claim set).

const crypto = require('crypto');
const { createRemoteJWKSet, jwtVerify } = require('jose');
const { OAUTH_ISSUER, OAUTH_CUSTOM, OAUTH_GOOGLE, OAUTH_REDIRECT_BASE } = require('./config');

const JWKS = createRemoteJWKSet(new URL('/jwks', OAUTH_ISSUER));

// provider key -> { client, redirectUri }
const PROVIDERS = {
  custom: { client: OAUTH_CUSTOM, redirectUri: `${OAUTH_REDIRECT_BASE}/custom/callback` },
  google: { client: OAUTH_GOOGLE, redirectUri: `${OAUTH_REDIRECT_BASE}/google/callback` },
};

function b64url(buf) {
  return Buffer.from(buf).toString('base64url');
}

function buildAuthorizeURL(providerKey, state, codeChallenge) {
  const { client, redirectUri } = PROVIDERS[providerKey];
  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: redirectUri,
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

async function exchangeCode(providerKey, code, codeVerifier) {
  const { client, redirectUri } = PROVIDERS[providerKey];
  const form = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: redirectUri,
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
async function verifyIDToken(providerKey, idToken) {
  const { client } = PROVIDERS[providerKey];
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: OAUTH_ISSUER,
    audience: client.clientId,
  });
  return payload;
}

module.exports = { PROVIDERS, buildAuthorizeURL, createPKCE, createState, exchangeCode, verifyIDToken };
