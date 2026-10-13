import fs from 'node:fs';
import path from 'node:path';
import { config } from './config.js';
import { db } from './db.js';

/**
 * Automatic database backups: one copy a day in data/backups, the newest BACKUP_KEEP (default 14) are kept.
 * A backup is a normal SQLite file — to restore, stop the site and copy it over data/rein.db.
 */
const DIR = path.join(config.dataDir, 'backups');
const KEEP = Math.max(1, Number(process.env.BACKUP_KEEP) || 14);

export function backupNow(tag = 'daily') {
  fs.mkdirSync(DIR, { recursive: true });
  const file = path.join(DIR, `rein-${new Date().toISOString().replace(/[:.]/g, '-')}-${tag}.db`);
  db.exec(`VACUUM INTO '${file.replace(/'/g, "''")}'`);
  const old = fs.readdirSync(DIR).filter((f) => /^rein-.*\.db$/.test(f)).sort().reverse().slice(KEEP);
  for (const f of old) fs.rmSync(path.join(DIR, f), { force: true });
  return file;
}

export function startBackups() {
  const lastAge = () => {
    try {
      const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.db')).map((f) => fs.statSync(path.join(DIR, f)).mtimeMs);
      return files.length ? Date.now() - Math.max(...files) : Infinity;
    } catch {
      return Infinity;
    }
  };
  const tick = () => {
    if (lastAge() < 23 * 3600_000) return;
    try {
      const f = backupNow();
      console.log(`[backup] saved ${path.basename(f)}`);
    } catch (err) {
      console.error('[backup] failed:', err.message);
    }
  };
  setTimeout(tick, 60_000).unref();
  setInterval(tick, 3600_000).unref();
}
