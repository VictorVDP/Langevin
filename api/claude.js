import { createClerkClient, verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export const config = { api: { bodyParser: { sizeLimit: '4mb' } } };

// Only the models the app actually uses may pass through the proxy.
const ALLOWED_MODELS = new Set(['claude-sonnet-4-6', 'claude-haiku-4-5-20251001']);
const MAX_TOKENS_CAP = 8192;
// Soft per-user daily cap — generous for real use (one analysis makes ~5 calls),
// but stops the proxy from being farmed as a general-purpose Claude relay.
const DAILY_REQUEST_CAP = 200;

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
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: { message: 'Invalid or expired session' } });
  }

  // Validate the request before it can spend money.
  const body = req.body || {};
  if (!ALLOWED_MODELS.has(body.model)) {
    return res.status(400).json({ error: { message: 'Model not allowed' } });
  }
  if (!Number.isInteger(body.max_tokens) || body.max_tokens < 1 || body.max_tokens > MAX_TOKENS_CAP) {
    return res.status(400).json({ error: { message: `max_tokens must be an integer between 1 and ${MAX_TOKENS_CAP}` } });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  let rateLimitAvailable = true;
  let { data: user, error: qErr } = await supabase
    .from('users')
    .select('plan, plan_expires_at, trial_analyses_used, requests_today, requests_date')
    .eq('clerk_user_id', userId)
    .single();
  if (qErr && qErr.code !== 'PGRST116') {
    // requests_* columns may not exist yet (schema migration pending) — degrade gracefully
    // to plan gating without the daily cap rather than failing every request.
    rateLimitAvailable = false;
    ({ data: user } = await supabase
      .from('users')
      .select('plan, plan_expires_at, trial_analyses_used')
      .eq('clerk_user_id', userId)
      .single());
  }

  const activePlans = ['solo', 'solo_byok', 'pro', 'pro_byok', 'business', 'business_byok', 'enterprise', 'internal'];
  const isPaidPlan = user &&
    activePlans.includes(user.plan) &&
    (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());

  const TRIAL_LIMIT = 3;
  const isTrial = user?.plan === 'trial';
  const trialUsed = (user?.trial_analyses_used || 0) >= TRIAL_LIMIT;

  if (!isPaidPlan && !(isTrial && !trialUsed)) {
    return res.status(402).json({ error: { message: 'Subscription required', code: 'PAYMENT_REQUIRED' } });
  }

  if (user.plan?.endsWith('_byok')) {
    return res.status(403).json({ error: { message: 'BYOK plan users call Anthropic directly' } });
  }

  // Daily per-user request cap (cost control).
  if (rateLimitAvailable) {
    const today = new Date().toISOString().slice(0, 10);
    const usedToday = user.requests_date === today ? (user.requests_today || 0) : 0;
    if (usedToday >= DAILY_REQUEST_CAP) {
      return res.status(429).json({ error: { message: 'Daily request limit reached — try again tomorrow or contact support.' } });
    }
    await supabase
      .from('users')
      .update({ requests_today: usedToday + 1, requests_date: today })
      .eq('clerk_user_id', userId);
  }

  // Consume one trial analysis on the GL classification call. Inferred server-side from
  // the request shape — a client-sent header could simply be omitted to dodge the counter.
  const isAnalysis = Array.isArray(body.tools) && body.tools.some(t => t && t.name === 'analyze_gl');
  if (isTrial && !trialUsed && isAnalysis) {
    await supabase
      .from('users')
      .update({ trial_analyses_used: (user.trial_analyses_used || 0) + 1 })
      .eq('clerk_user_id', userId);
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
    body: JSON.stringify(body),
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
