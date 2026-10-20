#!/usr/bin/env node
/**
 * Generate the Apple "client secret" JWT for Supabase → Authentication → Apple → Secret.
 *
 * Usage (from pull/):
 *   APPLE_TEAM_ID=ABCDE12345 \
 *   APPLE_KEY_ID=KEYID12345 \
 *   APPLE_CLIENT_ID=com.example.screennudge.signin \
 *   APPLE_P8_PATH=./AuthKey_KEYID12345.p8 \
 *   node scripts/generate-apple-client-secret.js
 *
 * APPLE_CLIENT_ID = your Services ID (not the bundle ID). Create one in Apple Developer
 * if needed: Identifiers → Services IDs → Sign in with Apple.
 *
 * Paste the printed JWT into Supabase. It expires in ~6 months; regenerate before then.
 */

const fs = require('node:fs');
const path = require('node:path');

let jwt;
try {
  jwt = require('jsonwebtoken');
} catch {
  console.error('Missing jsonwebtoken. Run: npm install --save-dev jsonwebtoken');
  process.exit(1);
}

const teamId = process.env.APPLE_TEAM_ID;
const keyId = process.env.APPLE_KEY_ID;
const clientId = process.env.APPLE_CLIENT_ID;
const keyPath = process.env.APPLE_P8_PATH;

if (!teamId || !keyId || !clientId || !keyPath) {
  console.error(`
Set these environment variables:

  APPLE_TEAM_ID     Apple Developer Team ID (e.g. ABCDE12345)
  APPLE_KEY_ID      Key ID from the .p8 filename (e.g. KEYID12345)
  APPLE_CLIENT_ID   Services ID (e.g. com.example.screennudge.signin)
  APPLE_P8_PATH     Path to AuthKey_XXXX.p8

Example:
  APPLE_TEAM_ID=ABCDE12345 APPLE_KEY_ID=KEYID12345 \\
  APPLE_CLIENT_ID=com.example.screennudge.signin \\
  APPLE_P8_PATH=./AuthKey_KEYID12345.p8 \\
  node scripts/generate-apple-client-secret.js
`);
  process.exit(1);
}

const resolvedKeyPath = path.resolve(process.cwd(), keyPath);
if (!fs.existsSync(resolvedKeyPath)) {
  console.error(`Key file not found: ${resolvedKeyPath}`);
  process.exit(1);
}

const privateKey = fs.readFileSync(resolvedKeyPath, 'utf8');
const now = Math.floor(Date.now() / 1000);
const exp = now + 86400 * 180; // Apple max ~6 months

const token = jwt.sign(
  {
    iss: teamId,
    iat: now,
    exp,
    aud: 'https://appleid.apple.com',
    sub: clientId,
  },
  privateKey,
  {
    algorithm: 'ES256',
    header: {
      alg: 'ES256',
      kid: keyId,
    },
  },
);

console.log('\nApple client secret JWT (paste into Supabase → Apple → Secret):\n');
console.log(token);
console.log(`\nExpires: ${new Date(exp * 1000).toISOString()}\n`);
