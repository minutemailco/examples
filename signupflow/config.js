require('dotenv').config();

const required = (name) => {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
};

module.exports = {
  PORT: process.env.PORT || 3000,
  BASE_URL: process.env.BASE_URL || 'http://localhost:3000',
  MINUTEMAIL_API_BASE: required('MINUTEMAIL_API_BASE'),
  MINUTEMAIL_API_KEY: required('MINUTEMAIL_API_KEY'),
  OAUTH_ISSUER: required('OAUTH_ISSUER'),
  OAUTH_CLIENT_ID: required('OAUTH_CLIENT_ID'),
  OAUTH_CLIENT_SECRET: required('OAUTH_CLIENT_SECRET'),
  OAUTH_REDIRECT_URI: process.env.OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/callback',
};
