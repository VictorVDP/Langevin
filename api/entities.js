import { verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let userId;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const { data: user } = await supabase
    .from('users')
    .select('org_owner_clerk_user_id')
    .eq('clerk_user_id', userId)
    .single();

  if (!user) return res.status(403).json({ error: 'User not found' });
  const ownerClerkUserId = user.org_owner_clerk_user_id || userId;

  if (req.method === 'GET') {
    const { data: entities } = await supabase
      .from('entities')
      .select('id, name, created_at')
      .eq('owner_clerk_user_id', ownerClerkUserId)
      .order('created_at', { ascending: true });
    return res.json({ entities: entities || [] });
  }

  if (req.method === 'POST') {
    const { name } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const { data: owner } = await supabase
      .from('users')
      .select('entity_limit, extra_entities, plan')
      .eq('clerk_user_id', ownerClerkUserId)
      .single();

    if (!owner) return res.status(403).json({ error: 'Owner not found' });

    if (owner.plan !== 'byok') {
      const { count } = await supabase
        .from('entities')
        .select('*', { count: 'exact', head: true })
        .eq('owner_clerk_user_id', ownerClerkUserId);

      const limit = (owner.entity_limit || 0) + (owner.extra_entities || 0);
      if ((count || 0) >= limit) {
        return res.status(403).json({ error: `Entity limit reached (${limit}).`, limit });
      }
    }

    const { data: entity, error } = await supabase
      .from('entities')
      .insert({ owner_clerk_user_id: ownerClerkUserId, name: name.trim() })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ entity });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID required' });
    await supabase.from('entities').delete()
      .eq('id', id).eq('owner_clerk_user_id', ownerClerkUserId);
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
