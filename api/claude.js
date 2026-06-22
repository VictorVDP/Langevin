import { createClerkClient } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method not allowed');
  }

  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: { message: 'Authentication required' } });
  }

  let userId;
  try {
    const payload = await clerk.verifyToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired session' } });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
  const { data: user } = await supabase
    .from('users')
    .select('plan, plan_expires_at')
    .eq('clerk_user_id', userId)
    .single();

  const activePlans = ['starter', 'business', 'byok'];
  const planActive = user &&
    activePlans.includes(user.plan) &&
    (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());

  if (!planActive) {
    return res.status(402).json({ error: { message: 'Subscription required', code: 'PAYMENT_REQUIRED' } });
  }

  if (user.plan === 'byok') {
    return res.status(403).json({ error: { message: 'BYOK plan users call Anthropic directly' } });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'No API key configured on server' } });
  }

  const upstream = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'prompt-caching-2024-07-31',
      'content-type': 'application/json',
    },
    body: JSON.stringify(req.body),
  });

  res.status(upstream.status);
  res.setHeader('content-type', upstream.headers.get('content-type') || 'application/json');
  res.setHeader('cache-control', 'no-store');

  const reader = upstream.body.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(Buffer.from(value));
    }
  } finally {
    res.end();
  }
}
