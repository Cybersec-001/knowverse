import { test } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';

process.env.JWT_SECRET ||= 'test-secret-test-secret-test-secret';
process.env.BACKEND_URL = 'https://api.example.test';
process.env.FRONTEND_URL = 'https://app.example.test/knowverse';
const app = (await import('../src/app.js')).default;

test('start redirects to Google with state and PKCE', async () => {
  process.env.GOOGLE_CLIENT_ID = 'gid';
  process.env.GOOGLE_CLIENT_SECRET = 'gsecret';
  const res = await request(app).get('/auth/oauth/google/start');
  assert.equal(res.status, 302);
  const url = new URL(res.headers.location);
  assert.equal(url.origin + url.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(url.searchParams.get('redirect_uri'), 'https://api.example.test/auth/oauth/google/callback');
  assert.equal(url.searchParams.get('code_challenge_method'), 'S256');
  assert.ok(url.searchParams.get('state'));
  assert.match(res.headers['set-cookie'][0], /HttpOnly; SameSite=Lax/);
});

test('GitHub start has no PKCE and asks for email scope', async () => {
  process.env.GITHUB_CLIENT_ID = 'hid';
  process.env.GITHUB_CLIENT_SECRET = 'hsecret';
  const res = await request(app).get('/auth/oauth/github/start');
  const url = new URL(res.headers.location);
  assert.equal(url.searchParams.get('code_challenge'), null);
  assert.match(url.searchParams.get('scope'), /user:email/);
});

test('unconfigured provider sends the user back to login with a message', async () => {
  delete process.env.MICROSOFT_CLIENT_ID;
  const res = await request(app).get('/auth/oauth/microsoft/start');
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /^https:\/\/app\.example\.test\/knowverse\/login\/\?error=/);
});

test('callback with a mismatched state is rejected', async () => {
  const res = await request(app)
    .get('/auth/oauth/google/callback?code=abc&state=wrong')
    .set('Cookie', `kv_oauth=${encodeURIComponent(JSON.stringify({ state: 'right', verifier: 'v', name: 'google' }))}`);
  assert.equal(res.status, 302);
  assert.match(res.headers.location, /login\/\?error=/);
  assert.doesNotMatch(res.headers.location, /token=/);
});

test('unknown provider is a 404', async () => {
  const res = await request(app).get('/auth/oauth/nope/start');
  assert.equal(res.status, 404);
});
