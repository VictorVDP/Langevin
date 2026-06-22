import { createClerkClient } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  let userId;
  try {
    const payload = await clerk.verifyToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  let { data: user } = await supabase
    .from('users')
    .select('plan, plan_expires_at, entity_limit, extra_entities')
    .eq('clerk_user_id', userId)
    .single();

  if (!user) {
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.emailAddresses[0]?.emailAddress || null;
    await supabase.from('users').insert({ clerk_user_id: userId, email });
    return res.status(402).json({ plan: 'none', entity_limit: 0, extra_entities: 0 });
  }

  const activePlans = ['starter', 'business', 'byok'];
  const planActive = activePlans.includes(user.plan) &&
    (!user.plan_expires_at || new Date(user.plan_expires_at) > new Date());

  if (!planActive) {
    return res.status(402).json({ plan: user.plan || 'none', entity_limit: 0, extra_entities: 0 });
  }

  return res.json({
    plan: user.plan,
    entity_limit: user.entity_limit || 0,
    extra_entities: user.extra_entities || 0,
  });
}
