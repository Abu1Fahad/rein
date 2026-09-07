/* Cloudflare Pages Serverless Function - Server-Side Secret Key Verification */
import { signSessionToken } from '../_lib/auth.js';

export async function onRequest(context) {
  const { request, env } = context;

  // Set CORS and Security Headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store, no-cache, must-revalidate'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let submittedPass = '';

    if (request.method === 'POST') {
      const body = await request.json().catch(() => ({}));
      submittedPass = body.pass || body.secret || '';
    } else {
      const url = new URL(request.url);
      submittedPass = url.searchParams.get('admin_pass') || url.searchParams.get('key') || '';
    }

    // Default Server Secret or Environment Variable on Cloudflare Pages
    const SECRET_KEY = env.ADMIN_SECRET_KEY || 'rein1v1secret2026';
    const DEV_PASSCODE = env.DEV_PASSCODE || 'rein1v1dev';

    if (!submittedPass) {
      return new Response(JSON.stringify({ success: false, message: 'No secret key provided' }), {
        status: 400,
        headers: corsHeaders
      });
    }

    if (submittedPass === SECRET_KEY || submittedPass === DEV_PASSCODE) {
      // Generate cryptographic HMAC-signed server session token
      const sessionToken = await signSessionToken({
        userId: 'u-admin-root',
        username: 'admin',
        role: 'admin',
        isAdmin: true
      }, env);

      return new Response(JSON.stringify({
        success: true,
        token: sessionToken,
        timestamp: Date.now(),
        message: 'Admin access authorized and session token generated'
      }), {
        status: 200,
        headers: corsHeaders
      });
    }

    return new Response(JSON.stringify({ success: false, message: 'Invalid access credentials' }), {
      status: 401,
      headers: corsHeaders
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Internal server error' }), {
      status: 500,
      headers: corsHeaders
    });
  }
}
