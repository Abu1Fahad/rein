import { all, run, get } from '../db.js';
import { bus } from '../events.js';

let muted = 0;
/** Run fn without sending each log entry to Discord (bulk operations post one summary instead). */
export function quietly(fn) {
  muted++;
  try {
    return fn();
  } finally {
    muted--;
  }
}

/** Activity log. Every entry is also sent to the Discord log channels (see bot/logs.js). */
export function audit(actor, action, details = '') {
  const text = typeof details === 'string' ? details : JSON.stringify(details);
  const res = run('INSERT INTO audit_log (actor, action, details) VALUES (?, ?, ?)', String(actor || 'system').slice(0, 100), action, text.slice(0, 1000));
  const row = get('SELECT * FROM audit_log WHERE id = ?', Number(res.lastInsertRowid));
  if (row && !muted) bus.emit('audit', row);
}

export function auditLog(limit = 200) {
  return all('SELECT * FROM audit_log ORDER BY id DESC LIMIT ?', limit);
}
