import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const PLAN_DEFAULTS = {
  starter:  { entity_limit: 3,  seat_limit: 1 },
  business: { entity_limit: 10, seat_limit: -1 },
  byok:     { entity_limit: 3,  seat_limit: 1 },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(500).json({ error: 'Missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET in Vercel env vars' });
  }
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    return res.status(500).json({ error: 'Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in Vercel env vars' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (e) {
    return res.status(400).send(`Webhook signature error: ${e.message}`);
  }

  try {
    const obj = event.data.object;

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const plan = obj.metadata?.plan || 'starter';
      const limits = PLAN_DEFAULTS[plan] || PLAN_DEFAULTS.starter;
      const clerkUserId = obj.metadata?.clerk_user_id;
      if (!clerkUserId) return res.json({ received: true });

      const activeStatuses = ['active', 'trialing', 'past_due', 'incomplete'];
      const { error } = await supabase.from('users').upsert({
        clerk_user_id: clerkUserId,
        stripe_customer_id: obj.customer,
        plan: activeStatuses.includes(obj.status) ? plan : 'expired',
        plan_expires_at: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null,
        entity_limit: limits.entity_limit,
        seat_limit: limits.seat_limit,
      }, { onConflict: 'clerk_user_id' });
      if (error) return res.status(500).json({ error: 'Supabase upsert failed', detail: error.message });
    }

    if (event.type === 'customer.subscription.deleted') {
      await supabase
        .from('users')
        .update({ plan: 'expired', plan_expires_at: new Date().toISOString() })
        .eq('stripe_customer_id', obj.customer);
    }

    if (event.type === 'checkout.session.completed' && obj.mode === 'payment') {
      const clerkUserId = obj.metadata?.clerk_user_id;
      const entityCount = parseInt(obj.metadata?.entity_count || '0');
      if (clerkUserId && entityCount > 0) {
        const { data: user } = await supabase
          .from('users')
          .select('extra_entities')
          .eq('clerk_user_id', clerkUserId)
          .single();
        await supabase.from('users').update({
          extra_entities: (user?.extra_entities || 0) + entityCount,
        }).eq('clerk_user_id', clerkUserId);
      }
    }
  } catch (e) {
    return res.status(500).json({ error: 'Webhook handler error', detail: e.message });
  }

  res.json({ received: true });
}
