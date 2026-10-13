import { EventEmitter } from 'node:events';

/**
 * Internal event bus.
 *  - 'change'               { scope, id? }   → pushed to browsers over SSE
 *  - 'registration:reviewed' player          → Discord bot updates the review message / DMs
 *  - 'match:completed'      matchId          → Discord bot posts the result
 */
export const bus = new EventEmitter();
bus.setMaxListeners(50);

export function changed(scope, id) {
  bus.emit('change', { scope, id: id ?? null, at: Date.now() });
}

const clients = new Set();

const perIp = new Map();
const MAX_CLIENTS = 3000;
const MAX_PER_IP = 12;

export function sseHandler(req, res) {
  const ip = req.ip || 'unknown';
  if (clients.size >= MAX_CLIENTS || (perIp.get(ip) ?? 0) >= MAX_PER_IP) {
    res.status(429).json({ error: 'too_many_requests' });
    return;
  }
  perIp.set(ip, (perIp.get(ip) ?? 0) + 1);
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write('retry: 4000\n\n');
  clients.add(res);
  req.on('close', () => {
    clients.delete(res);
    const n = (perIp.get(ip) ?? 1) - 1;
    if (n > 0) perIp.set(ip, n);
    else perIp.delete(ip);
  });
}

function send(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}

// Coalesce bursts of changes (e.g. bracket propagation) into one push per scope.
const pending = new Map();
let timer = null;

bus.on('change', (change) => {
  pending.set(`${change.scope}:${change.id ?? ''}`, change);
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    const batch = [...pending.values()];
    pending.clear();
    send('change', batch);
  }, 150);
});

setInterval(() => send('ping', { t: Date.now() }), 25_000).unref();

export const sseClientCount = () => clients.size;
