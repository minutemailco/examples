// Server-rendered pages, plain template literals. No client-side framework.

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function layout({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} · SignupFlow</title>
<style>
  :root { --ink:#1f2933; --muted:#616e7c; --accent:#2563eb; --ok:#059669; --warn:#b45309; --bg:#f7f9fb; --card:#ffffff; --line:#e4e9ef; }
  * { box-sizing:border-box; }
  body { margin:0; font-family:-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; color:var(--ink); background:var(--bg); }
  main { max-width:460px; margin:8vh auto; padding:0 16px; }
  .card { background:var(--card); border:1px solid var(--line); border-radius:12px; padding:32px; box-shadow:0 1px 3px rgba(31,41,51,.06); }
  h1 { font-size:22px; margin:0 0 6px; }
  p.sub { color:var(--muted); margin:0 0 24px; font-size:14px; }
  label { display:block; font-size:13px; font-weight:600; margin:14px 0 4px; }
  input { width:100%; padding:10px 12px; border:1px solid var(--line); border-radius:8px; font-size:14px; }
  input:focus { outline:2px solid var(--accent); outline-offset:-1px; }
  button { width:100%; margin-top:20px; padding:11px; border:0; border-radius:8px; background:var(--accent); color:#fff; font-size:14px; font-weight:600; cursor:pointer; }
  button:hover { filter:brightness(1.05); }
  .btn-oauth { display:flex; align-items:center; justify-content:center; gap:10px; background:#fff; color:#3c4043; border:1px solid #dadce0; border-radius:8px; }
  .btn-oauth:hover { filter:none; background:#f8f9fa; }
  .divider { display:flex; align-items:center; gap:12px; color:var(--muted); font-size:12px; margin:20px 0 0; }
  .divider::before, .divider::after { content:""; flex:1; height:1px; background:var(--line); }
  .msg { border-radius:8px; padding:12px 14px; font-size:14px; margin-bottom:16px; }
  .msg.error { background:#fef2f2; color:#991b1b; border:1px solid #fecaca; }
  .msg.ok { background:#ecfdf5; color:#065f46; border:1px solid #a7f3d0; }
  dl { margin:0; }
  dl dt { font-size:12px; color:var(--muted); margin-top:12px; }
  dl dd { margin:2px 0 0; font-size:14px; font-weight:600; overflow-wrap:anywhere; }
  .badge { display:inline-block; font-size:12px; font-weight:600; padding:2px 10px; border-radius:99px; }
  .badge.ok { background:#ecfdf5; color:#065f46; }
  .badge.warn { background:#fffbeb; color:#92400e; }
  a { color:var(--accent); }
  .logo { width:44px; height:44px; border-radius:10px; background:var(--accent); color:#fff; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:18px; margin-bottom:20px; }
  .menu a { display:block; text-align:center; margin-top:12px; padding:11px; border-radius:8px; border:1px solid var(--line); text-decoration:none; font-weight:600; font-size:14px; color:var(--ink); }
  .menu a:hover { background:#f0f4f8; }
  .menu button { margin-top:12px; }
</style>
</head>
<body>
<main><div class="card">${body}</div></main>
</body>
</html>`;
}

const googleLogo = `<svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>`;

function home() {
  return layout({
    title: 'Welcome',
    body: `
      <div class="logo">SF</div>
      <h1>SignupFlow</h1>
      <p class="sub">A demo app for testing signup flows end to end.</p>
      <div class="menu">
        <a href="/signup">Create an account</a>
        <a href="/login">Sign in</a>
        <button class="btn-oauth" onclick="location.href='/auth/google'">${googleLogo} Sign in with Google</button>
      </div>`,
  });
}

function signup(error) {
  return layout({
    title: 'Create your account',
    body: `
      <h1>Create your account</h1>
      <p class="sub">We'll send a verification link to your email.</p>
      ${error ? `<div class="msg error">${esc(error)}</div>` : ''}
      <form method="post" action="/signup">
        <label for="name">Full name</label>
        <input id="name" name="name" type="text" required autocomplete="name">
        <label for="email">Email address</label>
        <input id="email" name="email" type="email" required autocomplete="email">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required minlength="8" autocomplete="new-password">
        <button type="submit">Sign up</button>
      </form>
      <div class="divider">or</div>
      <div class="menu"><button class="btn-oauth" onclick="location.href='/auth/google'">${googleLogo} Sign up with Google</button></div>`,
  });
}

function checkYourEmail(email) {
  return layout({
    title: 'Check your inbox',
    body: `
      <h1>Check your inbox 📬</h1>
      <p class="sub">We sent a verification link to <strong>${esc(email)}</strong>.</p>
      <div class="msg ok">Click the link in the email to activate your account.</div>
      <p style="font-size:14px"><a href="/login">Back to sign in</a></p>`,
  });
}

function verified() {
  return layout({
    title: 'Email verified',
    body: `
      <h1>Email verified ✅</h1>
      <p class="sub">Your email address has been confirmed.</p>
      <div class="msg ok">Your account is now active. You can sign in.</div>
      <a href="/login" style="display:block;text-align:center;margin-top:8px"><button type="button">Go to sign in</button></a>`,
  });
}

function login(error) {
  return layout({
    title: 'Sign in',
    body: `
      <h1>Sign in</h1>
      <p class="sub">Use your email and password.</p>
      ${error ? `<div class="msg error">${esc(error)}</div>` : ''}
      <form method="post" action="/login">
        <label for="email">Email address</label>
        <input id="email" name="email" type="email" required autocomplete="email">
        <label for="password">Password</label>
        <input id="password" name="password" type="password" required autocomplete="current-password">
        <button type="submit">Sign in</button>
      </form>
      <div class="divider">or</div>
      <div class="menu"><button class="btn-oauth" onclick="location.href='/auth/google'">${googleLogo} Sign in with Google</button></div>`,
  });
}

function verifyEmailWarning() {
  return layout({
    title: 'Verify your email',
    body: `
      <h1>Verify your email first</h1>
      <div class="msg error">This account's email address has not been verified yet. Please follow the link we sent you.</div>
      <p style="font-size:14px"><a href="/login">Back to sign in</a></p>`,
  });
}

function dashboard(user) {
  const claims = user.oauth && user.oauth.claims ? user.oauth.claims : null;
  const claimRows = claims
    ? Object.entries(claims).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')
    : '';
  return layout({
    title: 'Dashboard',
    body: `
      <h1>Welcome, ${esc(user.name)} 👋</h1>
      <p class="sub">You are signed in.</p>
      <dl>
        <dt>Name</dt><dd>${esc(user.name)}</dd>
        <dt>Email</dt><dd>${esc(user.email)}</dd>
        <dt>Signed in via</dt><dd>${esc(user.provider)}</dd>
        <dt>Email verified</dt>
        <dd>${user.emailVerified
          ? '<span class="badge ok">verified</span>'
          : '<span class="badge warn">not verified</span>'}</dd>
        ${claims ? `<dt>Roles / claims (from ID token)</dt><dd>${Object.entries(claims).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ')}</dd>` : ''}
        ${claimRows ? `<dt>Sign-in time</dt><dd>${esc(new Date().toLocaleString())}</dd>` : ''}
      </dl>
      <form method="post" action="/logout"><button type="submit">Log out</button></form>`,
  });
}

function oauthError(detail) {
  return layout({
    title: 'Sign-in failed',
    body: `
      <h1>Sign-in failed</h1>
      <div class="msg error">OAuth sign-in could not be completed${detail ? `: ${esc(detail)}` : '.'}</div>
      <p style="font-size:14px"><a href="/login">Back to sign in</a></p>`,
  });
}

module.exports = { esc, home, signup, checkYourEmail, verified, login, verifyEmailWarning, dashboard, oauthError };
