import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { config } from './config.js';

fs.mkdirSync(config.dataDir, { recursive: true });

export const db = new DatabaseSync(path.join(config.dataDir, 'rein.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS players (
    id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    discord_id         TEXT UNIQUE,
    username           TEXT NOT NULL DEFAULT '',
    display_name       TEXT NOT NULL DEFAULT '',
    avatar_url         TEXT,
    battletag          TEXT NOT NULL DEFAULT '',
    rank_tier          TEXT NOT NULL DEFAULT 'unranked',
    rank_division      INTEGER,
    notes              TEXT,
    sr                 INTEGER NOT NULL DEFAULT 2500,
    wins               INTEGER NOT NULL DEFAULT 0,
    losses             INTEGER NOT NULL DEFAULT 0,
    status             TEXT NOT NULL DEFAULT 'pending',
    reject_reason      TEXT,
    reviewed_by        TEXT,
    reviewed_at        TEXT,
    review_channel_id  TEXT,
    review_message_id  TEXT,
    discord_created_at TEXT,
    guild_joined_at    TEXT,
    in_guild           INTEGER NOT NULL DEFAULT 1,
    synced_at          TEXT,
    applied_at         TEXT,
    created_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at         TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_players_status ON players(status, sr DESC);

  CREATE TABLE IF NOT EXISTS tournaments (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    size        INTEGER NOT NULL DEFAULT 8,
    status      TEXT NOT NULL DEFAULT 'upcoming',
    best_of     INTEGER NOT NULL DEFAULT 3,
    starts_at   TEXT,
    affects_sr  INTEGER NOT NULL DEFAULT 1,
    champion_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
    created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );

  CREATE TABLE IF NOT EXISTS tournament_entries (
    tournament_id INTEGER NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id     INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    seed          INTEGER NOT NULL,
    PRIMARY KEY (tournament_id, player_id)
  );

  CREATE TABLE IF NOT EXISTS matches (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    tournament_id INTEGER REFERENCES tournaments(id) ON DELETE CASCADE,
    round         INTEGER,
    slot          INTEGER,
    player1_id    INTEGER REFERENCES players(id) ON DELETE SET NULL,
    player2_id    INTEGER REFERENCES players(id) ON DELETE SET NULL,
    score1        INTEGER NOT NULL DEFAULT 0,
    score2        INTEGER NOT NULL DEFAULT 0,
    winner_id     INTEGER REFERENCES players(id) ON DELETE SET NULL,
    status        TEXT NOT NULL DEFAULT 'pending',
    is_bye        INTEGER NOT NULL DEFAULT 0,
    sr_gain       INTEGER NOT NULL DEFAULT 0,
    sr_loss       INTEGER NOT NULL DEFAULT 0,
    applied       INTEGER NOT NULL DEFAULT 0,
    applied_winner_id INTEGER,
    applied_loser_id  INTEGER,
    note          TEXT NOT NULL DEFAULT '',
    played_at     TEXT,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    updated_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
    UNIQUE (tournament_id, round, slot)
  );
  CREATE INDEX IF NOT EXISTS idx_matches_played ON matches(status, played_at DESC);

  CREATE TABLE IF NOT EXISTS sr_history (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    player_id  INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    match_id   INTEGER REFERENCES matches(id) ON DELETE CASCADE,
    delta      INTEGER NOT NULL,
    sr_after   INTEGER NOT NULL,
    reason     TEXT NOT NULL DEFAULT 'match',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
  CREATE INDEX IF NOT EXISTS idx_sr_history_player ON sr_history(player_id, id);

  CREATE TABLE IF NOT EXISTS audit_log (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    actor      TEXT NOT NULL,
    action     TEXT NOT NULL,
    details    TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
`);

/* ---------------------------------------------------------------- migrations */

const hasColumn = (table, col) => db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === col);

// Tournament format: 'single' (knockout) or 'double' (upper + lower bracket).
if (!hasColumn('tournaments', 'format')) db.exec("ALTER TABLE tournaments ADD COLUMN format TEXT NOT NULL DEFAULT 'single'");

db.exec(`
  CREATE TABLE IF NOT EXISTS admins (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    disabled      INTEGER NOT NULL DEFAULT 0,
    token_ver     INTEGER NOT NULL DEFAULT 1,
    last_login_at TEXT,
    created_by    TEXT,
    created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
  );
`);

const statements = new Map();

/** Cached prepared statement. */
export function q(sql) {
  let stmt = statements.get(sql);
  if (!stmt) {
    stmt = db.prepare(sql);
    statements.set(sql, stmt);
  }
  return stmt;
}

export const all = (sql, ...params) => q(sql).all(...params);
export const get = (sql, ...params) => q(sql).get(...params);
export const run = (sql, ...params) => q(sql).run(...params);

let depth = 0;

/** Run fn inside a transaction. Nested calls join the outer transaction. */
export function tx(fn) {
  if (depth > 0) return fn();
  db.exec('BEGIN IMMEDIATE');
  depth++;
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  } finally {
    depth--;
  }
}

export const now = () => new Date().toISOString();
