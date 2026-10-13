import crypto from 'node:crypto';
import { config } from './config.js';
import { sessionSecret } from './services/settings.js';
import { HttpError } from './http.js';
import { getAdmin, getAdminByName, checkPassword, roleLevel, touchLogin, adminCount } from './services/admins.js';
import { audit } from './services/audit.js';
import { gateOk } from './security.js';

const COOKIE = 'rein_admin';
const MAX_AGE_S = 7 * 24 * 3600;

const sign = (payload) => crypto.createHmac('sha256', sessionSecret()).update(payload).digest('base64url');

/** Owner sessions are tied to the current ADMIN_PASSWORD: change it in .env and every owner session ends. */
const ownerVer = () => crypto.createHmac('sha256', sessionSecret()).update(`owner:${config.adminPassword}`).digest('base64url').slice(0, 16);

/** aid 0 = the owner login from ADMIN_PASSWORD; otherwise a row in the admins table. */
function issue(aid, ver) {
  const payload = Buffer.from(JSON.stringify({ role: 'admin', aid, ver, exp: Date.now() + MAX_AGE_S * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

function verify(token) {
  if (!token || typeof token !== 'string') return null;
  const [payload, sig] = token.split('.');
  if (!payload || !sig) return null;
  const expected = sign(payload);
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
  let data;
  try {
    data = JSON.parse(Buffer.from(payload, 'base64url').toString());
  } catch {
    return null;
  }
  if (data.role !== 'admin' || !(data.exp > Date.now())) return null;
  const aid = Number(data.aid) || 0;
  if (aid === 0) {
    if (!config.adminPassword || data.ver !== ownerVer()) return null;
    return { id: 0, username: 'owner', role: 'owner' };
  }
  const a = getAdmin(aid);
  if (!a || a.disabled || a.token_ver !== data.ver) return null;
  return { id: a.id, username: a.username, role: a.role };
}

function readCookie(req, name) {
  const header = req.headers.cookie || '';
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

const secureCookie = () => config.publicUrl.startsWith('https://');

/** The signed-in admin ({ id, username, role }) or null. */
export const adminSession = (req) => {
  if (req._adminSession === undefined) req._adminSession = verify(readCookie(req, COOKIE));
  return req._adminSession;
};
export const isAdmin = (req) => !!adminSession(req);

export function requireAdmin(req, res, next) {
  const session = adminSession(req);
  if (!session) return next(new HttpError(401, 'unauthorized'));
  // Cookie is SameSite=Strict; additionally require a JSON/AJAX request for writes.
  if (req.method !== 'GET' && !req.is('application/json') && req.headers['x-requested-with'] !== 'rein') {
    return next(new HttpError(415, 'json_required'));
  }
  req.admin = session;
  next();
}

/** Route guard: the signed-in admin needs at least this role. */
export const needRole = (role) => (req, res, next) => {
  if (roleLevel(req.admin?.role) < roleLevel(role)) return next(new HttpError(403, 'forbidden'));
  next();
};

const attempts = new Map();
// Wrong passwords from everyone together: if someone spreads guesses over many IPs, logins pause for a while.
const globalFails = { count: 0, reset: 0 };
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of attempts) if (v.reset < now) attempts.delete(k);
}, 10 * 60_000).unref();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export async function login(req, res) {
  // The login only works when sent from the hidden admin address; anything else looks like a missing page.
  if (!gateOk(req.body?.gate)) throw new HttpError(404, 'not_found');
  if (!config.adminPassword && !adminCount()) throw new HttpError(503, 'admin_password_not_set');
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const entry = attempts.get(ip) ?? { count: 0, reset: now + 15 * 60_000 };
  if (entry.reset < now) Object.assign(entry, { count: 0, reset: now + 15 * 60_000 });
  if (globalFails.reset < now) Object.assign(globalFails, { count: 0, reset: now + 15 * 60_000 });
  if (entry.count >= 5 || globalFails.count >= 50) throw new HttpError(429, 'too_many_attempts');

  const username = String(req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');
  let token = null;
  let who = null;

  if (!username || username.toLowerCase() === 'owner') {
    if (config.adminPassword) {
      const given = crypto.createHash('sha256').update(password).digest();
      const real = crypto.createHash('sha256').update(config.adminPassword).digest();
      if (crypto.timingSafeEqual(given, real)) {
        token = issue(0, ownerVer());
        who = 'owner';
      }
    }
  } else {
    const a = getAdminByName(username);
    if (a && !a.disabled && checkPassword(password, a.password_hash)) {
      token = issue(a.id, a.token_ver);
      who = a.username;
      touchLogin(a.id);
    }
  }

  if (!token) {
    entry.count++;
    attempts.set(ip, entry);
    globalFails.count++;
    if (entry.count >= 5 || globalFails.count === 50) audit('system', 'admin.login_blocked', `too many wrong passwords (${ip})`);
    await sleep(600 + Math.random() * 400); // slows down guessing
    throw new HttpError(401, 'wrong_password');
  }
  attempts.delete(ip);
  audit(who, 'admin.login', `${who} signed in (${ip})`);
  res.cookie(COOKIE, token, { httpOnly: true, sameSite: 'strict', secure: secureCookie(), maxAge: MAX_AGE_S * 1000, path: '/' });
  return { ok: true };
}

export function logout(req, res) {
  res.clearCookie(COOKIE, { path: '/' });
  return { ok: true };
}
