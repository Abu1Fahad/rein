/* REIN 1V1 Esports - High Performance Dual HTTP (80) & HTTPS (443) Production Server */
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const selfsigned = require('selfsigned');

const HTTP_PORT = process.env.PORT || 80;
const HTTPS_PORT = process.env.HTTPS_PORT || 443;
const PUBLIC_DIR = __dirname;

// Generate SSL cert dynamically if cert files don't exist
const sslDir = path.join(__dirname, 'ssl');
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
}

const keyPath = path.join(sslDir, 'key.pem');
const certPath = path.join(sslDir, 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
  console.log('🔒 Generating SSL certificates for rein1v1.com...');
  const attrs = [{ name: 'commonName', value: 'rein1v1.com' }];
  const pems = selfsigned.generate(attrs, {
    days: 3650,
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [{
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'rein1v1.com' },
        { type: 2, value: 'www.rein1v1.com' },
        { type: 2, value: 'localhost' }
      ]
    }]
  });
  fs.writeFileSync(keyPath, pems.private);
  fs.writeFileSync(certPath, pems.cert);
  console.log('✅ SSL certificate generated successfully in ./ssl/');
}

const sslOptions = {
  key: fs.readFileSync(keyPath),
  cert: fs.readFileSync(certPath)
};

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

function handleRequest(req, res) {
  // Security & Performance Headers (Cloudflare Compatible)
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('X-XSS-Protection', '1; mode=block');

  let safePath = path.normalize(req.url.split('?')[0]).replace(/^(\.\.[\/\\])+/, '');
  if (safePath === '/' || safePath === '\\') {
    safePath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, safePath);

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403;
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // SPA Fallback to index.html
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);

    // Cache headers
    if (ext === '.css' || ext === '.js') {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    } else if (ext === '.html') {
      res.setHeader('Cache-Control', 'no-cache');
    }

    // Compression support
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

// 1. Start HTTP Server on Port 80
const httpServer = http.createServer(handleRequest);
httpServer.listen(HTTP_PORT, () => {
  console.log(`🚀 REIN 1V1 HTTP Server running on port ${HTTP_PORT}`);
});

// 2. Start HTTPS Server on Port 443 (Fixes Cloudflare 525 Handshake Error!)
try {
  const httpsServer = https.createServer(sslOptions, handleRequest);
  httpsServer.listen(HTTPS_PORT, () => {
    console.log(`🔒 REIN 1V1 HTTPS Server running on port ${HTTPS_PORT} (SSL Handshake Ready)`);
  });
} catch (e) {
  console.error('HTTPS Port 443 warning:', e.message);
}
