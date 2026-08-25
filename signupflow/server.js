const crypto = require('crypto');
const express = require('express');

const config = require('./config');
const store = require('./store');
const mailer = require('./mailer');
const oauth = require('./oauth');
const views = require('./views');

const app = express();
app.use(express.urlencoded({ extended: false }));

// --- tiny session handling: random cookie -> in-memory map ---
const COOKIE = 'sf_session';
app.use((req, res, next) => {
  const sid = req.headers.cookie
    ? req.headers.cookie.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))
    : null;
  req.sessionId = sid ? sid.slice(COOKIE.length + 1) : null;
  req.user = req.sessionId ? store.getSessionUser(req.sessionId) : undefined;
  next();
});

function startSession(res, email) {
  const sid = store.createSession(email);
  res.setHeader('Set-Cookie', `${COOKIE}=${sid}; Path=/; HttpOnly; SameSite=Lax`);
}

// --- public pages ---

app.get('/', (req, res) => res.send(views.home()));

app.get('/signup', (req, res) => res.send(views.signup()));

app.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password || password.length < 8) {
    return res.status(400).send(views.signup('All fields are required; password must be at least 8 characters.'));
  }
  if (store.findUser(email)) {
    return res.status(409).send(views.signup('An account with this email already exists.'));
  }
  store.createUser({ name, email, passwordHash: crypto.createHash('sha256').update(password).digest('hex'), provider: 'password' });

  const token = crypto.randomBytes(24).toString('base64url');
  store.setVerificationToken(email, token);
  await mailer.sendVerificationEmail(email, token);

  res.send(views.checkYourEmail(email));
});

app.get('/verify/:token', (req, res) => {
  const email = store.consumeVerificationToken(req.params.token);
  if (!email || !store.findUser(email)) {
    return res.status(400).send(views.oauthError('This verification link is invalid or has already been used.'));
  }
  store.markVerified(email);
  res.send(views.verified());
});

app.get('/login', (req, res) => res.send(views.login()));

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  const user = store.findUser(email);
  const hash = password ? crypto.createHash('sha256').update(password).digest('hex') : '';
  if (!user || user.passwordHash !== hash) {
    return res.status(401).send(views.login('Invalid email or password.'));
  }
  if (!user.emailVerified) {
    return res.send(views.verifyEmailWarning());
  }
  startSession(res, email);
  res.redirect('/dashboard');
});

app.get('/dashboard', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.send(views.dashboard(req.user));
});

app.post('/logout', (req, res) => {
  if (req.sessionId) store.destroySession(req.sessionId);
  res.setHeader('Set-Cookie', `${COOKIE}=; Path=/; Max-Age=0`);
  res.redirect('/');
});

// --- OAuth (mock IdP, authorization code + PKCE S256) ---

app.get('/auth/google', (req, res) => {
  const { verifier, challenge } = oauth.createPKCE();
  const state = oauth.createState();
  store.setOAuthState(state, verifier);
  res.redirect(oauth.buildAuthorizeURL(state, challenge));
});

app.get('/auth/callback', async (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return res.status(400).send(views.oauthError(errorDescription || error));
  }
  const verifier = store.consumeOAuthState(state);
  if (!code || !verifier) {
    return res.status(400).send(views.oauthError('Invalid or expired OAuth state.'));
  }

  try {
    const tokens = await oauth.exchangeCode(code, verifier);
    const claims = await oauth.verifyIDToken(tokens.id_token);

    const user = store.upsertOAuthUser({
      sub: claims.sub,
      email: claims.email,
      name: claims.name,
      emailVerified: claims.email_verified,
      preferredUsername: claims.preferred_username,
      picture: claims.picture,
      claims: customClaims(claims),
    });
    startSession(res, user.email);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('[oauth] callback failed:', err.message);
    res.status(502).send(views.oauthError(err.message));
  }
});

// Standard OIDC + provider claim names (Google/Apple fixed claim sets) —
// anything else is treated as a custom claim (custom-provider feature).
const RESERVED = new Set([
  'iss', 'sub', 'aud', 'exp', 'iat', 'nbf', 'jti', 'nonce', 'at_hash',
  'email', 'email_verified', 'name', 'preferred_username', 'picture',
  'azp', 'given_name', 'family_name', 'locale', 'hd',
  'is_private_email', 'real_user_status',
]);
function customClaims(claims) {
  const out = {};
  for (const [k, v] of Object.entries(claims)) {
    if (!RESERVED.has(k)) out[k] = typeof v === 'string' ? v : JSON.stringify(v);
  }
  return Object.keys(out).length ? out : null;
}

app.listen(config.PORT, () => {
  console.log(`SignupFlow demo app listening on ${config.BASE_URL}`);
  console.log(`OAuth issuer: ${config.OAUTH_ISSUER}`);
});
