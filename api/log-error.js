// Client error reporting: writes to Vercel function logs (Vercel dashboard → Logs).
// Receives only error messages/stacks — the client never sends GL or financial data.
// Unauthenticated by design (errors before sign-in matter too); size-capped instead.

export const config = { api: { bodyParser: { sizeLimit: '16kb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body || {};
  // sendBeacon posts text/plain, so the body may arrive as an unparsed string
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = { message: body }; }
  }

  console.error('[client-error]', JSON.stringify({
    ts: new Date().toISOString(),
    context: String(body.context || '').slice(0, 200),
    message: String(body.message || '').slice(0, 500),
    stack: String(body.stack || '').slice(0, 2000),
    url: String(body.url || '').slice(0, 300),
    ua: String(req.headers['user-agent'] || '').slice(0, 200),
  }));

  res.status(204).end();
}
