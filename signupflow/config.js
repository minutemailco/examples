require('dotenv').config();

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
};

// Two mock-IdP clients: a custom provider (email verification required) and
// Google (no verification — real Google reports email_verified directly).
const oauthClient = (prefix) => ({
  clientId: required(`${prefix}_CLIENT_ID`),
  clientSecret: required(`${prefix}_CLIENT_SECRET`),
});

module.exports = {
  PORT: process.env.PORT || 3000,
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  MINUTEMAIL_API_BASE: required('MINUTEMAIL_API_BASE'),
  MINUTEMAIL_API_KEY: required('MINUTEMAIL_API_KEY'),
  OAUTH_ISSUER: required('OAUTH_ISSUER'),
  OAUTH_CUSTOM: oauthClient('OAUTH_CUSTOM'),
  OAUTH_GOOGLE: oauthClient('OAUTH_GOOGLE'),
  OAUTH_REDIRECT_BASE: process.env.OAUTH_REDIRECT_BASE || 'http://localhost:3000/auth',
};
