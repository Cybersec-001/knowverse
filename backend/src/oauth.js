import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes, createHash } from 'node:crypto';
import { query } from './db.js';

// Personal Microsoft accounts always carry this tenant id in the id_token.
const MS_CONSUMER_TENANT = '9188040d-6c67-4c5b-b112-36a304b66dad';

const providers = {
  google: {
    label: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    scope: 'openid email profile',
    pkce: true,
    clientId: () => process.env.GOOGLE_CLIENT_ID,
    clientSecret: () => process.env.GOOGLE_CLIENT_SECRET,
    async profile(tokens) {
      const r = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (!r.ok) throw new Error('Google profile request failed');
      const p = await r.json();
      return { id: p.sub, email: p.email, verified: p.email_verified === true };
    },
  },
  microsoft: {
    label: 'Microsoft',
    authorizeUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenUrl: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    scope: 'openid email profile',
    pkce: true,
    clientId: () => process.env.MICROSOFT_CLIENT_ID,
    clientSecret: () => process.env.MICROSOFT_CLIENT_SECRET,
    async profile(tokens) {
      // The id_token comes straight from the token endpoint over TLS.
      const claims = JSON.parse(Buffer.from(String(tokens.id_token).split('.')[1], 'base64url').toString());
      const email = claims.email || claims.preferred_username;
      return {
        id: `${claims.tid}:${claims.oid || claims.sub}`,
        email,
        // Work/school accounts can carry an unverified email claim, so only
        // personal Microsoft accounts are trusted for matching by email.
        verified: claims.tid === MS_CONSUMER_TENANT && Boolean(email),
      };
    },
  },
  github: {
    label: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    scope: 'read:user user:email',
    pkce: false,
    clientId: () => process.env.GITHUB_CLIENT_ID,
    clientSecret: () => process.env.GITHUB_CLIENT_SECRET,
    async profile(tokens) {
      const headers = {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'knowverse',
      };
      const [u, e] = await Promise.all([
        fetch('https://api.github.com/user', { headers }),
        fetch('https://api.github.com/user/emails', { headers }),
      ]);
      if (!u.ok || !e.ok) throw new Error('GitHub profile request failed');
      const user = await u.json();
      const emails = await e.json();
      const primary = emails.find((x) => x.primary && x.verified);
      return { id: String(user.id), email: primary?.email, verified: Boolean(primary) };
    },
  },
};

const frontend = () => (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
const backend = () => (process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`).replace(/\/$/, '');
const redirectUri = (name) => `${backend()}/auth/oauth/${name}/callback`;
const cookieName = 'kv_oauth';

function readCookie(req, name) {
  const part = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name}=`));
  return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
}

function setStateCookie(res, value) {
  const secure = backend().startsWith('https://') ? '; Secure' : '';
  res.setHeader('Set-Cookie', `${cookieName}=${encodeURIComponent(value)}; HttpOnly; SameSite=Lax; Path=/auth/oauth; Max-Age=600${secure}`);
}

function clearStateCookie(res) {
  res.setHeader('Set-Cookie', `${cookieName}=; HttpOnly; SameSite=Lax; Path=/auth/oauth; Max-Age=0`);
}

function failToFrontend(res, message) {
  clearStateCookie(res);
  res.redirect(`${frontend()}/login/?error=${encodeURIComponent(message)}`);
}

async function exchangeCode(name, code, verifier) {
  const p = providers[name];
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri(name),
    client_id: p.clientId(),
    client_secret: p.clientSecret(),
  });
  if (verifier) body.set('code_verifier', verifier);
  const r = await fetch(p.tokenUrl, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.error || !data.access_token) throw new Error(data.error_description || data.error || 'Token exchange failed');
  return data;
}

// Finds the user for a provider identity, linking to or creating an account.
export async function resolveUser(name, profile) {
  const { rows: [linked] } = await query(
    'SELECT u.id, u.email FROM oauth_identities o JOIN users u ON u.id = o.user_id WHERE o.provider = $1 AND o.provider_user_id = $2',
    [name, profile.id],
  );
  if (linked) return linked;
  if (!profile.email) throw new Error(`${providers[name].label} did not share an email address`);
  const email = profile.email.toLowerCase();
  const { rows: [existing] } = await query('SELECT id, email FROM users WHERE email = $1', [email]);
  let user = existing;
  if (existing && !profile.verified) {
    throw new Error('An account with this email already exists. Log in with your password instead.');
  }
  if (!user) {
    ({ rows: [user] } = await query('INSERT INTO users(email) VALUES($1) RETURNING id, email', [email]));
  }
  await query(
    'INSERT INTO oauth_identities(user_id, provider, provider_user_id) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
    [user.id, name, profile.id],
  );
  return user;
}

export function oauthRouter(signToken) {
  const router = Router();

  router.get('/auth/oauth/:provider/start', (req, res) => {
    const name = req.params.provider;
    const p = providers[name];
    if (!p) return res.status(404).json({ error: 'Unknown provider' });
    if (!p.clientId() || !p.clientSecret()) return failToFrontend(res, `${p.label} login is not set up yet`);
    const state = randomBytes(24).toString('base64url');
    const verifier = randomBytes(32).toString('base64url');
    const url = new URL(p.authorizeUrl);
    url.searchParams.set('client_id', p.clientId());
    url.searchParams.set('redirect_uri', redirectUri(name));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', p.scope);
    url.searchParams.set('state', state);
    if (p.pkce) {
      url.searchParams.set('code_challenge', createHash('sha256').update(verifier).digest('base64url'));
      url.searchParams.set('code_challenge_method', 'S256');
    }
    if (name === 'google') url.searchParams.set('prompt', 'select_account');
    if (name === 'microsoft') url.searchParams.set('prompt', 'select_account');
    setStateCookie(res, JSON.stringify({ state, verifier, name }));
    res.redirect(url.toString());
  });

  router.get('/auth/oauth/:provider/callback', async (req, res) => {
    const name = req.params.provider;
    const p = providers[name];
    if (!p) return res.status(404).json({ error: 'Unknown provider' });
    let saved = {};
    try { saved = JSON.parse(readCookie(req, cookieName) || '{}'); } catch { /* ignore */ }
    if (req.query.error) return failToFrontend(res, 'Login was cancelled');
    if (!saved.state || saved.name !== name || saved.state !== req.query.state || !req.query.code) {
      return failToFrontend(res, 'Login expired, please try again');
    }
    try {
      const tokens = await exchangeCode(name, String(req.query.code), p.pkce ? saved.verifier : '');
      const profile = await p.profile(tokens);
      const user = await resolveUser(name, profile);
      clearStateCookie(res);
      // Token goes in the fragment so it never reaches server logs.
      res.redirect(`${frontend()}/auth/callback/#token=${encodeURIComponent(signToken(user))}`);
    } catch (e) {
      console.error('oauth callback failed', name, e.message);
      failToFrontend(res, e.message.startsWith('An account') || e.message.includes('did not share') ? e.message : 'Could not complete login');
    }
  });

  return router;
}
