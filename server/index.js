import path from 'node:path';
import express from 'express';
import { config, ROOT } from './config.js';
import './db.js';
import { HttpError } from './http.js';
import { publicRouter } from './routes/public.js';
import { adminRouter } from './routes/admin.js';
import { bot } from './bot/index.js';
import { removeDemoDataOnce } from './services/demo.js';
import { db } from './db.js';
import { startBackups } from './backup.js';
import { adminPath, sendIndex, securityHeaders, rateLimit, startupWarnings } from './security.js';

removeDemoDataOnce();

const app = express();
const PUBLIC_DIR = path.join(ROOT, 'public');
const INDEX = path.join(PUBLIC_DIR, 'index.html');

if (config.trustProxy) app.set('trust proxy', config.trustProxy);
app.disable('x-powered-by');
app.use(securityHeaders);
// Generous per-IP cap on the API (a normal visitor uses a few requests a minute; this stops floods).
app.use('/api', rateLimit({ windowMs: 60_000, max: 400, skip: (req) => req.path === '/events' }));
app.use(express.json({ limit: '200kb' }));

// For uptime monitors and the Docker health check.
app.get('/healthz', (req, res) => res.type('text').send('ok'));

app.use('/api/admin', adminRouter);
app.use('/api', publicRouter);
app.use('/api', (req, res) => res.status(404).json({ error: 'not_found' }));

app.use(express.static(PUBLIC_DIR, {
  index: false,
  dotfiles: 'deny',
  // Revalidate every time (cheap 304s) so updates show up immediately after a deploy.
  setHeaders: (res) => res.setHeader('Cache-Control', 'no-cache'),
}));

// SPA routes. The admin panel only opens from its hidden address — /admin is just a normal 404.
const ADMIN = adminPath();
app.get(['/', '/tournaments', '/tournaments/:id', '/matches', '/register', '/player/:id'], (req, res) => sendIndex(res, INDEX));
app.get([ADMIN, `${ADMIN}/*`], (req, res) => sendIndex(res, INDEX, { admin: true }));
app.use((req, res) => sendIndex(res, INDEX, { status: 404 }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.code, ...err.extra });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid_json' });
  console.error('[web]', err);
  res.status(500).json({ error: 'server_error' });
});

const server = app.listen(config.port, config.host || undefined, () => {
  const base = config.publicUrl || `http://localhost:${config.port}`;
  console.log(`[web] Reinhardt 1v1 running → ${base}${config.host ? `  (listening on ${config.host}:${config.port})` : ''}`);
  console.log(`[web] Admin panel (keep this address private) → ${base}${ADMIN}`);
  startupWarnings();
  if (!config.adminPassword) console.warn('[web] ADMIN_PASSWORD is not set — the admin panel is locked until you add it to .env');
});

bot.start();
startBackups();

// Clean stop (Ctrl+C, docker stop, systemctl stop): finish open requests, flush the database, exit.
let stopping = false;
const shutdown = () => {
  if (stopping) return;
  stopping = true;
  console.log('\n[web] shutting down');
  server.close();
  server.closeAllConnections?.();
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE)');
    db.close();
  } catch {
    // already closed
  }
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
