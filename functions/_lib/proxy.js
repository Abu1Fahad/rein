/* Cloudflare Pages Edge Worker → VPS Backend API Proxy Helper */

export async function proxyToVPS(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Preferred VPS origin endpoints
  const vpsOrigin = env.VPS_BACKEND_URL || env.BACKEND_API_URL || 'http://148.251.23.86:8080';
  const targetUrl = `${vpsOrigin.replace(/\/$/, '')}${url.pathname}${url.search}`;

  const reqHeaders = new Headers(request.headers);
  try {
    reqHeaders.set('Host', new URL(vpsOrigin).host);
  } catch (e) {}

  const init = {
    method: request.method,
    headers: reqHeaders,
    redirect: 'follow'
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      init.body = await request.clone().arrayBuffer();
    } catch (e) {}
  }

  try {
    const response = await fetch(targetUrl, init);
    const respHeaders = new Headers(response.headers);
    respHeaders.set('Access-Control-Allow-Origin', '*');
    respHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    respHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    respHeaders.set('Cache-Control', 'no-store, no-cache, must-revalidate');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: respHeaders
    });
  } catch (err) {
    console.warn(`[VPS Proxy Warning] Could not reach VPS backend at ${targetUrl}:`, err.message);
    return null; // Return null so calling function can perform fallback or report error
  }
}
