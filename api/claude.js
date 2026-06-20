export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const proxyPassword = process.env.PROXY_PASSWORD;
  if (proxyPassword) {
    const supplied = req.headers.get('x-proxy-password');
    if (supplied !== proxyPassword) {
      return new Response(JSON.stringify({ error: { message: 'Invalid password' } }), {
        status: 401, headers: { 'content-type': 'application/json' },
      });
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: { message: 'No API key configured on server' } }), {
      status: 500, headers: { 'content-type': 'application/json' },
    });
  }

  const body = await req.text();
  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'content-type': 'application/json',
    },
    body,
  });

  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      'content-type': upstream.headers.get('content-type') || 'application/json',
      'cache-control': 'no-store',
    },
  });
}
