# SignupFlow — demo app for the MinuteMail video

A deliberately small Node.js/Express app used in the marketing video
*"One Agent, Two MCP Servers: Testing a Full Signup Flow"*
(`marketing/demo/signupflow.md`). It implements:

- **Email signup with verification** — the verification email is delivered
  into the recipient's MinuteMail mailbox through the MinuteMail API.
- **"Sign in with Google"** — a standard authorization-code + PKCE (S256)
  OAuth flow against the MinuteMail mock identity provider.
- A dashboard that shows the signed-in user's name, email, provider,
  email-verification status, and any custom claims/roles carried in the ID
  token.

Everything is in-memory (users, sessions, verification tokens) and resets on
restart — that's fine for a demo; don't reuse this code in production.

## Setup

### 1. One-time OAuth setup (MinuteMail MCP or API)

Create an OAuth client (Google-branded consent screen):

```
oauth.clients.create
  { name: "demo-app", providerType: "google",
    redirectUris: ["http://localhost:3000/auth/callback"] }
```

Create an identity bound to a **permanent** mailbox (so it survives between
runs), then optionally enrich it with roles/claims and email-verification
state:

```
identities.create
  { clientId: "<from above>", mailboxAddress: "<permanent mailbox>",
    username: "ada", name: "Ada Test" }

identities.update
  { identityId: "<from above>",
    claims: { role: "admin", plan: "pro" },
    emailVerified: true }
```

### 2. Configure

```bash
cp .env.example .env
# fill in: MinuteMail API key, OAuth client id/secret, issuer URL
```

- `OAUTH_ISSUER` is the public base URL of the MinuteMail mock IdP
  (the one serving `/oauth/authorize`, `/oauth/token`, `/jwks`).
- `MINUTEMAIL_API_BASE` is the MinuteMail API your key belongs to.

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
4. Then log out and sign back in using the OAuth button. Use the mock
   identity bound to your mailbox address.
5. At every step, report what you see. If anything fails or looks off
   (wrong copy, missing confirmation, dead link), say so explicitly.
```

Note: step 4 uses the *pre-created permanent identity* (setup step 1),
whose mailbox address is the one you sign up with when replaying that half.
