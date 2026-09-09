/* Cloudflare Pages Serverless Function - MongoDB Atlas User Authentication & Security API */
import { getDatabase } from '../_lib/db.js';
import { hashPassword, verifyPassword, signSessionToken, verifySessionToken } from '../_lib/auth.js';
import { sanitizeString, validateAvatar } from '../_lib/validators.js';

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname;
  let action = url.searchParams.get('action') || '';
  const db = getDatabase(env);

  if (pathname.endsWith('/signup') || pathname.includes('/auth/signup')) action = 'signup';
  if (pathname.endsWith('/login') || pathname.includes('/auth/login')) action = 'login';
  if (pathname.endsWith('/update_profile') || pathname.includes('/auth/update_profile')) action = 'update_profile';
  if (pathname.endsWith('/me') || pathname.includes('/auth/me')) action = 'me';

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  const DEV_PASSCODE = env.DEV_PASSCODE || 'rein1v1dev';
  const ADMIN_SECRET = env.ADMIN_SECRET_KEY || 'rein1v1secret2026';

  try {
    // 1. SIGNUP: POST /api/auth/signup (Strict async/await MongoDB Atlas Persistence Flow)
    if (request.method === 'POST' && action === 'signup') {
      const body = await request.json().catch(() => ({}));
      const { username, password, discordId, avatar, avatarType } = body;

      const cleanUsername = sanitizeString(username, 30);
      if (!cleanUsername || cleanUsername.length < 3) {
        return new Response(JSON.stringify({ success: false, message: 'Username must be at least 3 characters long' }), { status: 400, headers });
      }
      if (!password || password.length < 6) {
        return new Response(JSON.stringify({ success: false, message: 'Password must be at least 6 characters long' }), { status: 400, headers });
      }

      // Check for duplicate username in MongoDB
      const existingUser = await db.findOne('users', { username: cleanUsername });
      if (existingUser) {
        return new Response(JSON.stringify({ success: false, message: `Username "${cleanUsername}" is already taken. Please choose another.` }), { status: 409, headers });
      }

      const avatarRes = validateAvatar(avatar, avatarType);
      if (!avatarRes.valid) {
        return new Response(JSON.stringify({ success: false, message: avatarRes.message }), { status: 400, headers });
      }

      // Determine Role
      let role = 'player';
      const lowerUser = cleanUsername.toLowerCase();
      if (password === DEV_PASSCODE || password === ADMIN_SECRET || lowerUser === 'admin' || lowerUser === 'fahad' || lowerUser === 'owner') {
        role = 'admin';
      }

      // Hash password with Web Crypto PBKDF2 (100,000 iterations)
      const hashedPassword = await hashPassword(password);

      const userId = 'u-' + Date.now();
      const newUser = {
        id: userId,
        username: cleanUsername,
        passwordHash: hashedPassword,
        discordId: sanitizeString(discordId, 40),
        role: role,
        avatar: avatarRes.avatar,
        avatarType: avatarRes.avatarType,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
        loginCount: 1,
        lastIp: request.headers.get('cf-connecting-ip') || '127.0.0.1'
      };

      const newPlayer = {
        id: 'p-' + Date.now(),
        tourneyId: 'tourney-1',
        rank: 99,
        name: cleanUsername,
        battleTag: discordId ? discordId.trim() : `${cleanUsername}#0000`,
        tier: 'Gold',
        elo: 500,
        wins: 0,
        losses: 0,
        streak: 0,
        avatar: avatarRes.avatar,
        avatarType: avatarRes.avatarType,
        group: 'Group A',
        lives: 2,
        createdAt: new Date().toISOString()
      };

      // STEP 1: Execute and AWAIT user insert first in MongoDB users collection
      const userRes = await db.insertOne('users', newUser);
      
      // STEP 2: Execute and AWAIT player insert in MongoDB players collection
      const playerRes = await db.insertOne('players', newPlayer);

      // Verify that both database writes completed 100%
      if (!userRes || !playerRes) {
        return new Response(JSON.stringify({
          success: false,
          message: 'Database Write Error: Account persistence failed in MongoDB Atlas.'
        }), { status: 500, headers });
      }

      // Sign Cryptographic HMAC Session Token
      const token = await signSessionToken({
        userId: newUser.id,
        username: newUser.username,
        role: newUser.role,
        isAdmin: newUser.role === 'admin'
      }, env);

      // STEP 3: Return 201 Created ONLY after 100% verified database persistence
      return new Response(JSON.stringify({
        success: true,
        message: 'Account registered and permanently stored in MongoDB Atlas database!',
        token: token,
        user: {
          id: newUser.id,
          username: newUser.username,
          discordId: newUser.discordId,
          role: newUser.role,
          avatar: newUser.avatar,
          avatarType: newUser.avatarType,
          isAdmin: newUser.role === 'admin',
          lastLoginAt: newUser.lastLoginAt
        },
        player: newPlayer
      }), { status: 201, headers });
    }

    // 2. LOGIN: POST /api/auth/login
    if (request.method === 'POST' && action === 'login') {
      const body = await request.json().catch(() => ({}));
      const { username, password } = body;

      const cleanUsername = sanitizeString(username, 30);
      if (!cleanUsername || !password) {
        return new Response(JSON.stringify({ success: false, message: 'Username and Password are required' }), { status: 400, headers });
      }

      const user = await db.findOne('users', { username: cleanUsername });
      if (!user) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid username or password' }), { status: 401, headers });
      }

      const isValid = await verifyPassword(password, user.passwordHash);
      if (!isValid) {
        return new Response(JSON.stringify({ success: false, message: 'Invalid username or password' }), { status: 401, headers });
      }

      // Update Login stats in MongoDB
      await db.updateOne('users', { id: user.id }, {
        lastLoginAt: new Date().toISOString(),
        loginCount: (user.loginCount || 0) + 1,
        lastIp: request.headers.get('cf-connecting-ip') || '127.0.0.1'
      });

      const token = await signSessionToken({
        userId: user.id,
        username: user.username,
        role: user.role,
        isAdmin: user.role === 'admin'
      }, env);

      return new Response(JSON.stringify({
        success: true,
        message: 'Logged in successfully',
        token: token,
        user: {
          id: user.id,
          username: user.username,
          discordId: user.discordId,
          role: user.role,
          avatar: user.avatar,
          avatarType: user.avatarType,
          isAdmin: user.role === 'admin',
          lastLoginAt: new Date().toISOString()
        }
      }), { status: 200, headers });
    }

    // 3. ME: GET /api/auth/me
    if (request.method === 'GET' && action === 'me') {
      const authHeader = request.headers.get('Authorization') || '';
      const token = authHeader.replace('Bearer ', '').trim();

      if (!token) {
        return new Response(JSON.stringify({ success: false, message: 'No session token provided' }), { status: 401, headers });
      }

      const payload = await verifySessionToken(token, env);
      if (!payload) {
        return new Response(JSON.stringify({ success: false, message: 'Session expired or invalid token' }), { status: 401, headers });
      }

      const user = await db.findOne('users', { id: payload.userId });
      if (!user) {
        return new Response(JSON.stringify({ success: false, message: 'User account not found' }), { status: 404, headers });
      }

      return new Response(JSON.stringify({
        success: true,
        user: {
          id: user.id,
          username: user.username,
          discordId: user.discordId,
          role: user.role,
          avatar: user.avatar,
          avatarType: user.avatarType,
          isAdmin: user.role === 'admin',
          createdAt: user.createdAt,
          lastLoginAt: user.lastLoginAt
        }
      }), { status: 200, headers });
    }

    return new Response(JSON.stringify({ success: false, message: 'Invalid authentication endpoint action' }), { status: 404, headers });

  } catch (err) {
    console.error('❌ Auth API Server Error:', err);
    return new Response(JSON.stringify({
      success: false,
      message: 'Internal Server Error: Database communication failure. ' + (err.message || '')
    }), { status: 500, headers });
  }
}
