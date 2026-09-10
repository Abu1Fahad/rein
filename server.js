/* REIN 1V1 Esports - High Performance Server & Native MongoDB Atlas API Engine */
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {}

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');
const { MongoClient } = require('mongodb');

let selfsigned;
try {
  selfsigned = require('selfsigned');
} catch (e) {}

const HTTP_PORT = parseInt(process.env.PORT) || 80;
const HTTPS_PORT = parseInt(process.env.HTTPS_PORT) || 443;
const ALT_HTTP_PORT = parseInt(process.env.ALT_PORT) || 49532;
const PUBLIC_DIR = __dirname;

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://Dlid:asask7l@cluster0.e6zsich.mongodb.net/rein?retryWrites=true&w=majority";
const DB_NAME = "rein";

let dbClient = null;
let dbInstance = null;

async function getMongoDB() {
  if (dbInstance) return dbInstance;
  try {
    dbClient = new MongoClient(MONGODB_URI, {
      connectTimeoutMS: 10000,
      serverSelectionTimeoutMS: 10000
    });
    await dbClient.connect();
    dbInstance = dbClient.db(DB_NAME);
    console.log('🍃 Connected directly to MongoDB Atlas cluster0.e6zsich.mongodb.net/rein!');
    return dbInstance;
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    return null;
  }
}

// Standard PBKDF2 Password Hashing & Verification (100,000 Iterations)
function hashPassword(password, salt = null) {
  if (!salt) salt = crypto.randomBytes(16).toString('hex');
  const hashHex = crypto.pbkdf2Sync(password, salt, 100000, 32, 'sha256').toString('hex');
  return `pbkdf2$100000$${salt}$${hashHex}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  try {
    if (storedHash.startsWith('pbkdf2$')) {
      const parts = storedHash.split('$');
      const iterations = parseInt(parts[1]) || 100000;
      const salt = parts[2];
      const originalHash = parts[3];
      const computedHash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
      return crypto.timingSafeEqual(Buffer.from(computedHash, 'hex'), Buffer.from(originalHash, 'hex'));
    }
    // Legacy simple hash fallback
    const legacyHash = crypto.pbkdf2Sync(password, 'rein1v1salt0000', 10000, 32, 'sha256').toString('hex');
    return storedHash === legacyHash;
  } catch (e) {
    return false;
  }
}

// Generate SSL cert dynamically if cert files don't exist
const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
}

const keyPath = path.join(sslDir, 'key.pem');
const certPath = path.join(sslDir, 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  if (selfsigned) {
    try {
      console.log('🔒 Generating SSL certificates for rein1v1.com...');
      const attrs = [{ name: 'commonName', value: 'rein1v1.com' }];
      const pems = selfsigned.generate(attrs, {
        days: 3650,
        keySize: 2048,
        algorithm: 'sha256'
      });
      const privKey = pems.private || pems.privateKey;
      const certStr = pems.cert;
      if (privKey && certStr) {
        fs.writeFileSync(keyPath, privKey);
        fs.writeFileSync(certPath, certStr);
        console.log('✅ SSL certificate generated successfully in ./ssl/');
      }
    } catch (e) {
      console.warn('SSL generation notice:', e.message);
    }
  }
}

let sslOptions = null;
if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
  sslOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'application/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=UTF-8',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf'
};

async function handleApiRequest(req, res, url) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }

  const db = await getMongoDB();
  const pathname = url.pathname;
  const action = url.searchParams.get('action') || '';

  // Parse Body for POST requests
  let body = {};
  if (req.method === 'POST' || req.method === 'PUT') {
    const buffers = [];
    for await (const chunk of req) {
      buffers.push(chunk);
    }
    const raw = Buffer.concat(buffers).toString();
    try {
      body = JSON.parse(raw);
    } catch (e) {
      body = {};
    }
  }

  // 0. POST /api/db_action - Generic DB Proxy for Cloudflare Pages Functions
  if (req.method === 'POST' && pathname === '/api/db_action') {
    if (!db) {
      res.writeHead(500, headers);
      res.end(JSON.stringify({ success: false, message: 'MongoDB connection offline' }));
      return;
    }
    const { action, collection, payload } = body;
    try {
      if (action === 'insertOne') {
        const doc = payload.document;
        const result = await db.collection(collection).insertOne(doc);
        res.writeHead(201, headers);
        res.end(JSON.stringify({ success: true, insertedId: result.insertedId }));
        return;
      }
      if (action === 'findOne') {
        const doc = await db.collection(collection).findOne(payload.filter || {});
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, document: doc }));
        return;
      }
      if (action === 'find') {
        const docs = await db.collection(collection).find(payload.filter || {}).sort(payload.sort || {}).limit(payload.limit || 0).toArray();
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, documents: docs }));
        return;
      }
      if (action === 'updateOne') {
        const result = await db.collection(collection).updateOne(payload.filter || {}, payload.update || {});
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, modifiedCount: result.modifiedCount }));
        return;
      }
      if (action === 'deleteOne') {
        const result = await db.collection(collection).deleteOne(payload.filter || {});
        res.writeHead(200, headers);
        res.end(JSON.stringify({ success: true, deletedCount: result.deletedCount }));
        return;
      }
      res.writeHead(400, headers);
      res.end(JSON.stringify({ success: false, message: 'Unknown db_action action' }));
    } catch (err) {
      console.error('❌ Proxy DB Action Error:', err);
      res.writeHead(500, headers);
      res.end(JSON.stringify({ success: false, message: err.message }));
    }
    return;
  }

  // 1. GET /api/data - Full DB State from MongoDB Atlas
  if (req.method === 'GET' && (pathname === '/api/data' || pathname.startsWith('/api/data'))) {
    if (db) {
      const tournaments = await db.collection('tournaments').find({}).toArray();
      const players = await db.collection('players').find({}).toArray();
      const matches = await db.collection('matches').find({}).toArray();

      res.writeHead(200, headers);
      res.end(JSON.stringify({
        success: true,
        source: 'mongodb-atlas-native',
        data: {
          tournaments: tournaments.length > 0 ? tournaments : [
            { id: 'tourney-1', name: 'R6 Siege 1v1 World Series 2026', status: 'Live', prizePool: '$5,000', startDate: '2026-08-15', teamCount: 16 }
          ],
          players: players,
          matches: matches
        }
      }));
    } else {
      res.writeHead(500, headers);
      res.end(JSON.stringify({ success: false, message: 'MongoDB connection offline' }));
    }
    return;
  }

  // 2. POST /api/auth?action=signup (or /api/auth/signup)
  if (req.method === 'POST' && (pathname.includes('/auth') || action === 'signup' || action === 'login')) {
    const reqAction = action || (pathname.endsWith('/signup') ? 'signup' : 'login');

    if (reqAction === 'signup') {
      const { username, password, discordId, avatar, avatarType } = body;
      const cleanUsername = (username || '').trim();

      if (!cleanUsername || cleanUsername.length < 3) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ success: false, message: 'Username must be at least 3 characters long' }));
        return;
      }
      if (!password || password.length < 6) {
        res.writeHead(400, headers);
        res.end(JSON.stringify({ success: false, message: 'Password must be at least 6 characters long' }));
        return;
      }

      if (db) {
        const existing = await db.collection('users').findOne({ username: cleanUsername });
        if (existing) {
          res.writeHead(409, headers);
          res.end(JSON.stringify({ success: false, message: `Username "${cleanUsername}" is already taken.` }));
          return;
        }

        const userId = 'u-' + Date.now();
        const hashedPassword = hashPassword(password);
        const newUser = {
          id: userId,
          username: cleanUsername,
          passwordHash: hashedPassword,
          discordId: discordId ? discordId.trim() : '',
          role: 'player',
          avatar: avatar || '🛡️',
          avatarType: avatarType || 'emoji',
          createdAt: new Date().toISOString()
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
          avatar: avatar || '🛡️',
          avatarType: avatarType || 'emoji',
          group: 'Group A',
          lives: 2,
          createdAt: new Date().toISOString()
        };

        // Save directly into MongoDB Atlas collections
        await db.collection('users').insertOne(newUser);
        await db.collection('players').insertOne(newPlayer);

        console.log(`✅ Saved new registered account "${cleanUsername}" to MongoDB Atlas!`);

        res.writeHead(201, headers);
        res.end(JSON.stringify({
          success: true,
          message: 'Account registered and saved directly to MongoDB Atlas!',
          token: 'token_' + Date.now(),
          user: newUser,
          player: newPlayer
        }));
      } else {
        res.writeHead(500, headers);
        res.end(JSON.stringify({ success: false, message: 'MongoDB connection unavailable' }));
      }
      return;
    }

    if (reqAction === 'login') {
      const { username, password } = body;
      const cleanUsername = (username || '').trim();

      if (db) {
        const user = await db.collection('users').findOne({ username: cleanUsername });
        if (user && verifyPassword(password, user.passwordHash)) {
          res.writeHead(200, headers);
          res.end(JSON.stringify({
            success: true,
            message: 'Logged in successfully via MongoDB Atlas',
            token: 'token_' + Date.now(),
            user: {
              id: user.id,
              username: user.username,
              role: user.role || 'player',
              isAdmin: user.role === 'admin',
              avatar: user.avatar || '🛡️'
            }
          }));
          return;
        }
      }
      res.writeHead(401, headers);
      res.end(JSON.stringify({ success: false, message: 'Invalid username or password' }));
      return;
    }
  }

  // Default fallback API response
  res.writeHead(404, headers);
  res.end(JSON.stringify({ success: false, message: 'API endpoint not found' }));
}

function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // Handle API Requests directly via MongoDB Atlas Client
  if (url.pathname.startsWith('/api/')) {
    handleApiRequest(req, res, url).catch(err => {
      console.error('API Router Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: err.message }));
    });
    return;
  }

  // Security & Performance Headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  let safePath = path.normalize(url.pathname).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    if (ext === '.css' || ext === '.js') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
    }

    const acceptEncoding = req.headers['accept-encoding'] || '';
    const rawStream = fs.createReadStream(filePath);

    if (acceptEncoding.includes('gzip') && (contentType.includes('text') || contentType.includes('javascript') || contentType.includes('json') || contentType.includes('svg'))) {
      res.setHeader('Content-Encoding', 'gzip');
      rawStream.pipe(zlib.createGzip()).pipe(res);
    } else {
      rawStream.pipe(res);
    }
  });
}

// 1. Primary HTTP Server (Port 80)
const httpServer = http.createServer(handleRequest);
httpServer.listen(HTTP_PORT, () => {
  console.log(`🚀 REIN 1V1 HTTP Server running on primary port ${HTTP_PORT}`);
  getMongoDB();
}).on('error', (err) => {
  console.warn(`Primary HTTP Port ${HTTP_PORT} warning:`, err.message);
});

// 2. Alternative HTTP Server (Port 49532 for NAT VPS forwarding)
if (ALT_HTTP_PORT !== HTTP_PORT) {
  const altServer = http.createServer(handleRequest);
  altServer.listen(ALT_HTTP_PORT, '0.0.0.0', () => {
    console.log(`📡 REIN 1V1 NAT HTTP Server running on NAT port ${ALT_HTTP_PORT}`);
  }).on('error', (err) => {
    console.warn(`NAT Port ${ALT_HTTP_PORT} warning:`, err.message);
  });
}

// 3. API Proxy Server (Port 8080)
const proxyServer = http.createServer(handleRequest);
proxyServer.listen(8080, '0.0.0.0', () => {
  console.log(`🌐 REIN 1V1 API Proxy Server running on port 8080`);
}).on('error', (err) => {
  console.warn(`Port 8080 warning:`, err.message);
});

// 3. HTTPS Server (Port 443)
if (sslOptions) {
  try {
    const httpsServer = https.createServer(sslOptions, handleRequest);
    httpsServer.listen(HTTPS_PORT, () => {
      console.log(`🔒 REIN 1V1 HTTPS Server running on SSL port ${HTTPS_PORT}`);
    }).on('error', (err) => {
      console.warn(`HTTPS Port ${HTTPS_PORT} warning:`, err.message);
    });
  } catch (e) {
    console.error('HTTPS init error:', e.message);
  }
}
