import crypto from 'node:crypto';
import fs from 'node:fs';
import { config } from './config.js';
import { getInternal, setInternal } from './services/settings.js';

/* ---------------------------------------------------------------- secret admin address
 * The admin panel is not at /admin. It lives at a hidden address such as /admin-3f9c…, so nobody can
 * find the login page to start guessing passwords. Set ADMIN_PATH in .env to choose it yourself;
 * otherwise a random one is made on first start and printed in the server window.
 */
const PATH_RE = /^[A-Za-z0-9_-]{8,80}$/;
let cachedPath = null;

export function adminPath() {
  if (cachedPath) return cachedPath;
  const fromEnv = String(process.env.ADMIN_PATH || '').trim().replace(/^\/+|\/+$/g, '');
  if (fromEnv) {
    if (!PATH_RE.test(fromEnv)) {
      console.warn('[security] ADMIN_PATH must be 8–80 letters, numbers, "-" or "_" — using the generated one instead');
    } else {
      cachedPath = `/${fromEnv}`;
      return cachedPath;
    }
  }
  let saved = getInternal('admin_path');
  if (!saved || !PATH_RE.test(saved)) {
    saved = `admin-${crypto.randomBytes(12).toString('hex')}`;
    setInternal('admin_path', saved);
  }
  cachedPath = `/${saved}`;
  return cachedPath;
}

/** Constant-time check of the "gate" the login form sends (the hidden address it was opened from). */
export function gateOk(value) {
  const want = Buffer.from(adminPath());
  const got = Buffer.from(String(value ?? ''));
  return got.length === want.length && crypto.timingSafeEqual(got, want);
}

/* ---------------------------------------------------------------- index.html + Content-Security-Policy */
let indexCache = { mtime: 0, html: '', csp: '' };

function buildCsp(html) {
  // Allow exactly the inline scripts that ship in index.html (theme pre-paint, import map) by hash.
  const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]
    .map((m) => `'sha256-${crypto.createHash('sha256').update(m[1]).digest('base64')}'`);
  const handlers = [...html.matchAll(/\son[a-z]+="([^"]*)"/gi)]
    .map((m) => `'sha256-${crypto.createHash('sha256').update(m[1]).digest('base64')}'`);
  return [
    "default-src 'self'",
    `script-src 'self' https://cdn.jsdelivr.net ${hashes.join(' ')}${handlers.length ? ` 'unsafe-hashes' ${handlers.join(' ')}` : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com data:",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://cdn.jsdelivr.net",
    "media-src 'self' data: blob:",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
  ].join('; ');
}

export function loadIndex(file) {
  const { mtimeMs } = fs.statSync(file);
  if (mtimeMs !== indexCache.mtime) {
    const html = fs.readFileSync(file, 'utf8');
    indexCache = { mtime: mtimeMs, html, csp: buildCsp(html) };
  }
  return indexCache;
}

/** Send the app page. On the hidden admin address the page is told where the panel lives. */
export function sendIndex(res, file, { admin = false, status = 200 } = {}) {
  const { html, csp } = loadIndex(file);
  const out = admin
    ? html.replace('<head>', `<head>\n  <meta name="admin-base" content="${adminPath()}">\n  <meta name="robots" content="noindex, nofollow">`)
    : html;
  res.status(status);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Content-Security-Policy', csp);
  res.send(out);
}

export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  if (config.publicUrl.startsWith('https://')) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
}

/* ---------------------------------------------------------------- rate limiting */

/** Simple fixed-window limiter per IP. */
export function rateLimit({ windowMs, max, skip } = {}) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    if (skip?.(req)) return next();
    const key = req.ip || 'unknown';
    const now = Date.now();
    let e = hits.get(key);
    if (!e || e.reset < now) {
      e = { n: 0, reset: now + windowMs };
      hits.set(key, e);
    }
    e.n++;
    if (e.n > max) {
      res.setHeader('Retry-After', String(Math.ceil((e.reset - now) / 1000)));
      return res.status(429).json({ error: 'too_many_requests' });
    }
    next();
  };
}

/* ---------------------------------------------------------------- startup checks */
const WEAK = new Set(['change-me', 'changeme', 'password', 'admin', 'admin123', '123456', '12345678', 'testpass123', 'qwerty']);

export function startupWarnings() {
  const pw = config.adminPassword;
  if (pw && (pw.length < 12 || WEAK.has(pw.toLowerCase()))) {
    console.warn('[security] ⚠ ADMIN_PASSWORD is weak. Use at least 12 characters (letters + numbers + symbols) before going public.');
  }
  if (config.publicUrl && !config.publicUrl.startsWith('https://')) {
    console.warn('[security] ⚠ PUBLIC_URL is not https:// — passwords would travel unencrypted. Use HTTPS when the site is public.');
  }
}
