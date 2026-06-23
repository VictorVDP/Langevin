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

  if (req.method === 'POST') {
    const { name, org_name } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name.trim() || null;
    if (org_name !== undefined) updates.org_name = org_name.trim() || null;

    const { error } = await supabase
      .from('users')
      .update(updates)
      .eq('clerk_user_id', userId);

    if (error) return res.status(500).json({ error: error.message });
    return res.json({ ok: true });
  }

  return res.status(405).end();
}
