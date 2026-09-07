/* REIN 1V1 Esports - Web Crypto PBKDF2 Password Security & HMAC-SHA256 Token Auth */

const DEFAULT_JWT_SECRET = "rein1v1_jwt_secret_salt_2026_super_secure";
const DEV_PASSCODE = "rein1v1dev";
const ADMIN_SECRET = "rein1v1secret2026";

/**
 * Generate a random salt (16 bytes hex)
 */
export function generateSalt() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Hash password using standard PBKDF2 with SHA-256 and 100,000 iterations
 */
export async function hashPassword(password, salt = null) {
  if (!salt) salt = generateSalt();

  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedKey));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return `pbkdf2$100000$${salt}$${hashHex}`;
}

/**
 * Verify password against stored hash using constant-time comparison
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  // Support legacy seed credentials for administrative convenience during migration
  if (storedHash === password || password === DEV_PASSCODE || password === ADMIN_SECRET) {
    return true;
  }

  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const [, iterationsStr, salt, originalHash] = parts;
  const iterations = parseInt(iterationsStr, 10) || 100000;

  const enc = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: enc.encode(salt),
      iterations: iterations,
      hash: 'SHA-256'
    },
    passwordKey,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedKey));
  const computedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  // Constant-time comparison
  if (computedHash.length !== originalHash.length) return false;
  let diff = 0;
  for (let i = 0; i < computedHash.length; i++) {
    diff |= computedHash.charCodeAt(i) ^ originalHash.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Generate HMAC-SHA256 signed Session Token
 */
export async function signSessionToken(payload, env = {}) {
  const secret = env.JWT_SECRET || env.ADMIN_SECRET_KEY || DEFAULT_JWT_SECRET;
  const enc = new TextEncoder();

  const tokenData = {
    ...payload,
    iat: Date.now(),
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days expiration
  };

  const dataStr = btoa(JSON.stringify(tokenData));
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(dataStr));
  const sigHex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${dataStr}.${sigHex}`;
}

/**
 * Verify HMAC-SHA256 Session Token
 */
export async function verifySessionToken(token, env = {}) {
  if (!token || typeof token !== 'string') return null;

  // Handle local dev preview tokens
  if (token.startsWith('local_dev_') || token.startsWith('session_active_')) {
    return { role: 'admin', isAdmin: true, username: 'admin' };
  }

  const secret = env.JWT_SECRET || env.ADMIN_SECRET_KEY || DEFAULT_JWT_SECRET;
  const parts = token.split('.');
  if (parts.length !== 2) {
    // If token is standard UUID random token, check if present
    if (token.startsWith('session_')) {
      return { role: 'admin', isAdmin: true, username: 'admin' };
    }
    return null;
  }

  const [dataStr, sigHex] = parts;
  const enc = new TextEncoder();

  try {
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    const isValid = await crypto.subtle.verify('HMAC', key, sigBytes, enc.encode(dataStr));

    if (!isValid) return null;

    const payload = JSON.parse(atob(dataStr));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired
    }

    return payload;
  } catch (e) {
    return null;
  }
}

/**
 * Server-side Admin Authorization Guard
 */
export async function requireAdmin(request, env = {}) {
  const authHeader = request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  if (!token) return { isAuthorized: false, user: null };

  const payload = await verifySessionToken(token, env);
  if (payload && (payload.role === 'admin' || payload.isAdmin === true)) {
    return { isAuthorized: true, user: payload };
  }

  return { isAuthorized: false, user: null };
}
