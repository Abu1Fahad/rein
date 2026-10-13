import crypto from 'node:crypto';
import { all, get, run, now } from '../db.js';
import { HttpError, notFound, toStr, oneOf } from '../http.js';
import { audit } from './audit.js';

/**
 * Admin accounts. The password in .env (ADMIN_PASSWORD) is the "owner" login and can never be locked out.
 * Roles:
 *   owner      everything, including managing admin accounts
 *   admin      everything except admin accounts
 *   moderator  review registrations, enter match results, seed brackets
 */
export const ROLES = ['moderator', 'admin', 'owner'];
export const roleLevel = (role) => ROLES.indexOf(role);

const USERNAME_RE = /^[\p{L}\p{N}_.-]{3,32}$/u;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export function checkPassword(password, stored) {
  const [kind, saltB64, hashB64] = String(stored || '').split('$');
  if (kind !== 'scrypt' || !saltB64 || !hashB64) return false;
  const expected = Buffer.from(hashB64, 'base64');
  const got = crypto.scryptSync(String(password), Buffer.from(saltB64, 'base64'), expected.length, { N: 16384, r: 8, p: 1 });
  return crypto.timingSafeEqual(got, expected);
}

const view = (a) => (a ? {
  id: a.id,
  username: a.username,
  role: a.role,
  disabled: !!a.disabled,
  last_login_at: a.last_login_at,
  created_by: a.created_by,
  created_at: a.created_at,
} : null);

export const getAdmin = (id) => get('SELECT * FROM admins WHERE id = ?', id) ?? null;
export const getAdminByName = (username) => get('SELECT * FROM admins WHERE username = ?', String(username)) ?? null;
export const adminCount = () => get('SELECT COUNT(*) AS n FROM admins WHERE disabled = 0').n;

export function listAdmins() {
  return all('SELECT * FROM admins ORDER BY CASE role WHEN \'owner\' THEN 0 WHEN \'admin\' THEN 1 ELSE 2 END, username').map(view);
}

function readPassword(value) {
  const pw = String(value ?? '');
  if (pw.length < 8) throw new HttpError(400, 'password_too_short');
  if (pw.length > 200) throw new HttpError(400, 'password_too_long');
  return pw;
}

export function createAdmin(body, actor) {
  const username = toStr(body.username, 32);
  if (!USERNAME_RE.test(username) || username.toLowerCase() === 'owner') throw new HttpError(400, 'invalid_username');
  if (getAdminByName(username)) throw new HttpError(409, 'username_taken');
  const role = oneOf(body.role, ROLES, 'moderator');
  const password = readPassword(body.password);
  const res = run('INSERT INTO admins (username, password_hash, role, created_by) VALUES (?, ?, ?, ?)', username, hashPassword(password), role, actor);
  audit(actor, 'admin.create', `${username} (${role})`);
  return view(getAdmin(Number(res.lastInsertRowid)));
}

export function updateAdmin(id, body, actor) {
  const a = getAdmin(id);
  if (!a) throw notFound('admin_not_found');
  const changes = [];
  let bump = false;
  if ('role' in body) {
    const role = oneOf(body.role, ROLES, a.role);
    if (role !== a.role) {
      run('UPDATE admins SET role = ? WHERE id = ?', role, id);
      changes.push(`role → ${role}`);
      bump = true;
    }
  }
  if ('disabled' in body) {
    const disabled = body.disabled === true || body.disabled === 'true' ? 1 : 0;
    if (disabled !== a.disabled) {
      run('UPDATE admins SET disabled = ? WHERE id = ?', disabled, id);
      changes.push(disabled ? 'disabled' : 'enabled');
      bump = true;
    }
  }
  if (body.password) {
    run('UPDATE admins SET password_hash = ? WHERE id = ?', hashPassword(readPassword(body.password)), id);
    changes.push('password');
    bump = true;
  }
  // Signing everyone out of this account makes role/password/disable changes take effect immediately.
  if (bump) run('UPDATE admins SET token_ver = token_ver + 1 WHERE id = ?', id);
  if (changes.length) audit(actor, 'admin.update', `${a.username}: ${changes.join(', ')}`);
  return view(getAdmin(id));
}

export function deleteAdmin(id, actor) {
  const a = getAdmin(id);
  if (!a) throw notFound('admin_not_found');
  run('DELETE FROM admins WHERE id = ?', id);
  audit(actor, 'admin.delete', a.username);
  return { ok: true };
}

export function touchLogin(id) {
  run('UPDATE admins SET last_login_at = ? WHERE id = ?', now(), id);
}
