export const config = { runtime: 'edge' };

import { createClerkClient } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) {
    return json({ error: { message: 'Authentication required' } }, 401);
  }

  let userId;
  try {
    const payload = await clerk.verifyToken(token);
    userId = payload.sub;
  } catch {
    return json({ error: { message: 'Invalid or expired session' } }, 401);
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
    return json({ error: { message: 'Subscription required', code: 'PAYMENT_REQUIRED' } }, 402);
  }

  if (user.plan === 'byok') {
    return json({ error: { message: 'BYOK plan users call Anthropic directly' } }, 403);
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: { message: 'No API key configured on server' } }, 500);
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

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
