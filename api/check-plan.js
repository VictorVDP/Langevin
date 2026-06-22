export const config = { runtime: 'edge' };

import { createClerkClient } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req) {
  if (req.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return json({ error: 'No token' }, 401);

  let userId;
  try {
    const payload = await clerk.verifyToken(token);
    userId = payload.sub;
  } catch {
    return json({ error: 'Invalid token' }, 401);
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  let { data: user } = await supabase
    .from('users')
    .select('plan, plan_expires_at, entity_limit, extra_entities')
    .eq('clerk_user_id', userId)
    .single();

  if (!user) {
    // First sign-in — create the user row
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || null;
    await supabase.from('users').insert({ clerk_user_id: userId, email });
    return json({ plan: 'none', entity_limit: 0, extra_entities: 0 }, 402);
  }

  const activePlans = ['starter', 'business', 'byok'];
  const planActive = activePlans.includes(user.plan) &&
    (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());

  if (!planActive) {
    return json({ plan: user.plan || 'none', entity_limit: 0, extra_entities: 0 }, 402);
  }

  return json({
    plan: user.plan,
    entity_limit: user.entity_limit || 0,
    extra_entities: user.extra_entities || 0,
  });
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
