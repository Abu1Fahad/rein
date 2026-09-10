import { proxyToVPS } from '../_lib/proxy.js';

export async function onRequest(context) {
  const vpsResponse = await proxyToVPS(context);
  if (vpsResponse) return vpsResponse;

  return new Response(JSON.stringify({
    success: false,
    message: 'VPS API backend unavailable'
  }), {
    status: 502,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
