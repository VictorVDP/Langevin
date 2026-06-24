import { createClerkClient, verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token' });

  let userId;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    userId = payload.sub;
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token', detail: e.message });
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not configured in Vercel env vars' });
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    let { data: user, error: userQueryError } = await supabase
      .from('users')
      .select('plan, plan_expires_at, extra_seats, org_owner_clerk_user_id, name, org_name, trial_analyses_used')
      .eq('clerk_user_id', userId)
      .single();

    // Fall back if a column doesn't exist yet (schema migration pending)
    if (userQueryError && userQueryError.code !== 'PGRST116') {
      const { data: fallback } = await supabase
        .from('users')
        .select('plan, plan_expires_at')
        .eq('clerk_user_id', userId)
        .single();
      user = fallback ? { ...fallback, extra_seats: 0, org_owner_clerk_user_id: null, name: null, org_name: null, trial_analyses_used: 0 } : null;
    }

    let ownerClerkUserId, isOwner;

    if (!user) {
      // New user — check if invited as an org member
      const clerkUser = await clerk.users.getUser(userId);
      const email = clerkUser.emailAddresses[0]?.emailAddress || null;

      const { data: membership } = await supabase
        .from('org_members')
        .select('owner_clerk_user_id')
        .eq('member_email', email?.toLowerCase() || '')
        .single();

      if (membership) {
        ownerClerkUserId = membership.owner_clerk_user_id;
        isOwner = false;
        const memberName = clerkUser.fullName || clerkUser.firstName || null;
        await supabase.from('users').insert({
          clerk_user_id: userId,
          email,
          org_owner_clerk_user_id: ownerClerkUserId,
          name: memberName,
        });
        await supabase.from('org_members')
          .update({ member_clerk_user_id: userId, name: memberName })
          .eq('member_email', email?.toLowerCase() || '');
      } else {
        // Brand new standalone user — start on free trial
        await supabase.from('users').insert({ clerk_user_id: userId, email, plan: 'trial' });
        return res.status(200).json({ plan: 'trial', trial_analyses_used: 0, extra_seats: 0, owner_clerk_user_id: userId, is_owner: true });
      }
    } else {
      ownerClerkUserId = user.org_owner_clerk_user_id || userId;
      isOwner = !user.org_owner_clerk_user_id;
    }

    // Get effective plan from owner row
    let planUser = (isOwner && user) ? user : null;
    if (!planUser) {
      const { data: owner } = await supabase
        .from('users')
        .select('plan, plan_expires_at, extra_seats, org_name, trial_analyses_used')
        .eq('clerk_user_id', ownerClerkUserId)
        .single();
      planUser = owner;
    }

    if (!planUser) {
      return res.status(402).json({ plan: 'none', extra_seats: 0, owner_clerk_user_id: ownerClerkUserId, is_owner: isOwner });
    }

    const activePlans = ['solo', 'solo_byok', 'pro', 'pro_byok', 'business', 'business_byok', 'enterprise', 'internal', 'trial'];
    const planActive = activePlans.includes(planUser.plan) &&
      (!planUser.plan_expires_at || new Date(planUser.plan_expires_at) > new Date());

    if (!planActive) {
      return res.status(402).json({ plan: planUser.plan || 'none', extra_seats: 0, owner_clerk_user_id: ownerClerkUserId, is_owner: isOwner });
    }

    return res.json({
      plan: planUser.plan,
      extra_seats: planUser.extra_seats || 0,
      owner_clerk_user_id: ownerClerkUserId,
      is_owner: isOwner,
      name: user?.name || null,
      org_name: isOwner ? (user?.org_name || null) : (planUser?.org_name || null),
      trial_analyses_used: planUser.trial_analyses_used || 0,
    });
  } catch (e) {
    return res.status(500).json({ error: 'Database error', detail: e.message });
  }
}
