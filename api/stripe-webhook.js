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

const ACTIVE_PLANS = ['solo', 'solo_byok', 'pro', 'pro_byok', 'business', 'business_byok', 'enterprise', 'internal'];

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

    const isSub = event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted';

    if (isSub && obj.metadata?.type === 'seat_addon') {
      const clerkUserId = obj.metadata?.clerk_user_id;
      if (clerkUserId) {
        // Recalculate extra_seats from all active seat subscriptions for this customer
        const allSubs = await stripe.subscriptions.list({ customer: obj.customer, limit: 100 });
        const activeStatuses = ['active', 'trialing', 'past_due', 'incomplete'];
        const extraSeats = allSubs.data
          .filter(s => s.metadata?.type === 'seat_addon' && activeStatuses.includes(s.status))
          .reduce((sum, s) => sum + (s.items?.data?.[0]?.quantity || 1), 0);
        await supabase.from('users').update({ extra_seats: extraSeats }).eq('clerk_user_id', clerkUserId);
      }
      return res.json({ received: true });
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const plan = obj.metadata?.plan;
      const clerkUserId = obj.metadata?.clerk_user_id;
      if (!clerkUserId || !ACTIVE_PLANS.includes(plan)) return res.json({ received: true });

      const activeStatuses = ['active', 'trialing', 'past_due', 'incomplete'];
      const { error } = await supabase.from('users').upsert({
        clerk_user_id: clerkUserId,
        stripe_customer_id: obj.customer,
        plan: activeStatuses.includes(obj.status) ? plan : 'expired',
        plan_expires_at: obj.current_period_end ? new Date(obj.current_period_end * 1000).toISOString() : null,
      }, { onConflict: 'clerk_user_id' });
      if (error) return res.status(500).json({ error: 'Supabase upsert failed', detail: error.message });
    }

    if (event.type === 'customer.subscription.deleted') {
      await supabase
        .from('users')
        .update({ plan: 'expired', plan_expires_at: new Date().toISOString() })
        .eq('stripe_customer_id', obj.customer);
    }
  } catch (e) {
    return res.status(500).json({ error: 'Webhook handler error', detail: e.message });
  }

  res.json({ received: true });
}
