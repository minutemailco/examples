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
  const user = email ? store.findUser(email) : null;
  if (!user) {
    return res.status(400).send(views.oauthError('This verification link is invalid or has already been used.'));
  }
  store.markVerified(email);
  // Auto-login after successful verification — for both the password and the
  // custom-IdP flow the user has just proven control of the mailbox.
  startSession(res, email);
  res.redirect('/dashboard');
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

// --- OAuth: two providers, different verification behavior ---
//
// custom  — the IdP reports email_verified from the identity. The demo
//           identity is created with emailVerified: false, so the first
//           login sends a verification email and gates the dashboard on it.
// google  — faithful to real Google: email_verified: true in the token,
//           no verification step, fixed claim set (no custom roles).

async function handleOAuthLogin(req, res, providerKey) {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    return res.status(400).send(views.oauthError(errorDescription || error));
  }
  const verifier = store.consumeOAuthState(state);
  if (!code || !verifier) {
    return res.status(400).send(views.oauthError('Invalid or expired OAuth state.'));
  }

  try {
    const tokens = await oauth.exchangeCode(providerKey, code, verifier);
    const claims = await oauth.verifyIDToken(providerKey, tokens.id_token);

    const user = store.upsertOAuthUser({
      sub: claims.sub,
      email: claims.email,
      name: claims.name || claims.email,
      emailVerified: claims.email_verified === true || claims.email_verified === 'true',
      picture: claims.picture,
      preferredUsername: claims.preferred_username,
      provider: providerKey,
      claims: customClaims(claims),
    });

    const verificationRequired = providerKey === 'custom' && !user.emailVerified;
    if (verificationRequired) {
      // Custom IdP, unverified identity: send the verification email and
      // hold the login until the link is followed.
      const token = crypto.randomBytes(24).toString('base64url');
      store.setVerificationToken(user.email, token);
      await mailer.sendVerificationEmail(user.email, token);
      return res.send(views.checkYourEmail(user.email));
    }

    startSession(res, user.email);
    res.redirect('/dashboard');
  } catch (err) {
    console.error('[oauth] callback failed:', err.message);
    res.status(502).send(views.oauthError(err.message));
  }
}

for (const providerKey of ['custom', 'google']) {
  app.get(`/auth/${providerKey}`, (req, res) => {
    const { verifier, challenge } = oauth.createPKCE();
    const state = oauth.createState();
    store.setOAuthState(state, verifier);
    res.redirect(oauth.buildAuthorizeURL(providerKey, state, challenge));
  });
  app.get(`/auth/${providerKey}/callback`, (req, res) => handleOAuthLogin(req, res, providerKey));
}

// Standard OIDC + provider fixed claim names (Google/Apple sets) — anything
// else is treated as a custom claim (a custom-provider feature).
const RESERVED = new Set([
  'iss', 'sub', 'aud', 'azp', 'exp', 'iat', 'nbf', 'jti', 'nonce', 'at_hash',
  'email', 'email_verified', 'name', 'preferred_username', 'picture',
  'given_name', 'family_name', 'locale', 'hd',
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
  console.log(`OAuth issuer: ${config.OAUTH_ISSUER} (custom + google clients)`);
});
