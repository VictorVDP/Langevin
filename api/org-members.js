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
    .select('org_owner_clerk_user_id, plan')
    .eq('clerk_user_id', userId)
    .single();

  if (!user) return res.status(403).json({ error: 'User not found' });
  if (user.org_owner_clerk_user_id) return res.status(403).json({ error: 'Only plan owners can manage members' });

  if (req.method === 'GET') {
    const { data: members } = await supabase
      .from('org_members')
      .select('id, member_email, member_clerk_user_id, name, created_at')
      .eq('owner_clerk_user_id', userId)
      .order('created_at', { ascending: true });
    return res.json({ members: members || [] });
  }

  if (req.method === 'POST') {
    const { email } = req.body;
    if (!email?.trim()) return res.status(400).json({ error: 'Email required' });

    if (user.plan !== 'business') {
      const { count } = await supabase
        .from('org_members')
        .select('*', { count: 'exact', head: true })
        .eq('owner_clerk_user_id', userId);
      if ((count || 0) >= 1) {
        return res.status(403).json({ error: 'Seat limit reached. Upgrade to Business for unlimited seats.' });
      }
    }

    const { data: member, error } = await supabase
      .from('org_members')
      .insert({ owner_clerk_user_id: userId, member_email: email.trim().toLowerCase() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'This email is already invited.' });
      return res.status(500).json({ error: error.message });
    }
    return res.json({ member });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'ID required' });
    await supabase.from('org_members').delete()
      .eq('id', id).eq('owner_clerk_user_id', userId);
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
