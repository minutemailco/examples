# SignupFlow — demo app for the MinuteMail video

A deliberately small Node.js/Express app used in the marketing video
*"One Agent, Two MCP Servers: Testing a Full Signup Flow"*
(`marketing/demo/signupflow.md`). It wires **two identity providers side by
side**, to contrast their verification behavior:

- **Acme SSO (custom IdP)** — authorization-code + PKCE flow. The demo
  identity is created with `emailVerified: false` and carries **custom
  claims** (`role`, `plan`), so the first login is **gated**: the app sends
  a verification email (via the MinuteMail API) and only opens the
  dashboard once the link is followed. This is the custom-IdP story:
  you control the claims and the verification state.
- **Google** — same OAuth flow, but faithful to real Google:
  `email_verified: true` straight from the ID token, **no verification
  step**, fixed claim set (no custom roles possible).
- **Email/password signup** — the app's own signup with verification email
  delivered into the recipient's MinuteMail mailbox.

The dashboard shows which provider you used, the verification badge, and
any custom claims from the ID token — the Google login can never show
`role: captain`, the Acme SSO login can.

Everything is in-memory (users, sessions, verification tokens) and resets on
restart — that's fine for a demo; don't reuse this code in production.

## Setup

### 1. One-time OAuth setup (MinuteMail MCP or API)

Two OAuth clients — one per provider:

```
oauth.clients.create
  { name: "demo-acme", providerType: "custom", providerLabel: "Acme SSO",
    redirectUris: ["http://localhost:3000/auth/custom/callback"] }

oauth.clients.create
  { name: "demo-google", providerType: "google",
    redirectUris: ["http://localhost:3000/auth/google/callback"] }
```

Two identities, each bound to its **own permanent mailbox** (different
addresses — the consent screen auto-picks the client's first active
identity, and sharing a mailbox would let one provider's login satisfy the
other's verification gate):

```
identities.create                       // custom IdP: UNVERIFIED + claims
  { clientId: "<acme>", mailboxAddress: "tricia@minutemail.cc",
    username: "tricia", name: "Tricia McMillan",
    emailVerified: false,
    claims: { role: "captain", plan: "pro" } }

identities.create                       // google: verified, no claims
  { clientId: "<google>", mailboxAddress: "ford@minutemail.cc",
    username: "ford", name: "Ford Prefect" }
```

### 2. Configure

```bash
cp .env.example .env
# fill in: MinuteMail API key, issuer URL, both client id/secrets
```

- `OAUTH_ISSUER` is the public base URL of the MinuteMail mock IdP
  (the one serving `/oauth/authorize`, `/oauth/token`, `/jwks`).
- `MINUTEMAIL_API_BASE` is the MinuteMail API your key belongs to.
- `OAUTH_CUSTOM_*` and `OAUTH_GOOGLE_*` hold the two clients' credentials.

### 3. Run

```bash
npm install
npm start
# -> http://localhost:3000
```

If a signup address is not a MinuteMail mailbox, the verification link is
printed to the server console instead of being mailed — the flow never
dead-ends.

## The test prompt (video, beat 4)

```text
You are testing the signup flow of the app at http://localhost:3000.

1. Create a fresh MinuteMail mailbox that expires in 30 minutes.
2. Sign up using the mailbox address, with any name/password you like.
3. The app sends a verification email — read it and follow the verification
   link in the browser.
4. Log out. Now click "Sign in with Acme SSO" — the custom IdP. The demo
   identity is unverified: the app should send another verification email
   to tricia@minutemail.cc and refuse the dashboard until the link is
   followed. Verify that, then complete the login.
5. Log out again and click "Sign in with Google" using the mock identity
   ford@minutemail.cc. This time there must be NO verification email —
   Google reports the email as verified already, so you land on the
   dashboard directly. Confirm the dashboard shows the google provider,
   a verified badge, and no custom role claims.
6. At every step, report what you see. If anything fails or looks off
   (wrong copy, missing confirmation, dead link), say so explicitly.
```

The contrast in steps 4–5 is the point of the demo: the custom IdP lets you
stage any verification state and inject claims; the Google mock behaves
exactly like real Google, so an app that passes here passes against the
real provider too.
