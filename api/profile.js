import { verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const token = req.headers['authorization']?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    let userId;
    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      userId = payload.sub;
    } catch (e) {
      return res.status(401).json({ error: 'Invalid token', detail: e.message });
    }

    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
      return res.status(500).json({ error: 'SUPABASE_URL or SUPABASE_SERVICE_KEY not configured' });
    }

    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

    if (req.method === 'POST') {
      const body = req.body || {};
      const { name, org_name } = body;
      const updates = {};
      if (name !== undefined) updates.name = String(name).trim() || null;
      if (org_name !== undefined) updates.org_name = String(org_name).trim() || null;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('clerk_user_id', userId);

      if (error) return res.status(500).json({ error: error.message });
      return res.json({ ok: true });
    }

    return res.status(405).end();
  } catch (e) {
    console.error('profile error:', e);
    return res.status(500).json({ error: 'Unexpected error', detail: e instanceof Error ? e.message : String(e) });
  }
}
