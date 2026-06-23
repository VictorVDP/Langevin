import Stripe from 'stripe';
import { createClerkClient, verifyToken } from '@clerk/backend';
import { createClient } from '@supabase/supabase-js';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const PRICE_IDS = {
  solo:             process.env.STRIPE_PRICE_SOLO,
  solo_byok:        process.env.STRIPE_PRICE_SOLO_BYOK,
  pro:              process.env.STRIPE_PRICE_PRO,
  pro_byok:         process.env.STRIPE_PRICE_PRO_BYOK,
  business:         process.env.STRIPE_PRICE_BUSINESS,
  business_byok:    process.env.STRIPE_PRICE_BUSINESS_BYOK,
};

const SEAT_PRICE_IDS = {
  pro:      process.env.STRIPE_PRO_SEAT,
  business: process.env.STRIPE_BUSINESS_SEAT,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let userId;
  try {
    const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (!process.env.STRIPE_SECRET_KEY) return res.status(500).json({ error: 'STRIPE_SECRET_KEY not set in Vercel env vars' });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

  const { type, plan, email, clerkUserId } = req.body;
  if (clerkUserId !== userId) return res.status(403).json({ error: 'Forbidden' });

  // Seat add-on checkout
  if (type === 'seat_addon') {
    const seatPrice = SEAT_PRICE_IDS[plan];
    if (!seatPrice) return res.status(400).json({ error: 'Invalid seat plan' });
    // Verify user's current plan matches the seat tier
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    const { data: user } = await supabase.from('users').select('plan').eq('clerk_user_id', userId).single();
    const userBase = user?.plan?.replace('_byok', '');
    if (userBase !== plan) return res.status(403).json({ error: 'Seat tier does not match your current plan' });
    const seatSession = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [{ price: seatPrice, quantity: 1 }],
      subscription_data: {
        metadata: { clerk_user_id: clerkUserId, type: 'seat_addon', plan },
      },
      success_url: `${process.env.APP_URL}?checkout=success`,
      cancel_url: `${process.env.APP_URL}?checkout=cancelled`,
    });
    return res.json({ url: seatSession.url });
  }

  if (!PRICE_IDS[plan]) return res.status(400).json({ error: 'Invalid plan' });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    customer_email: email,
    line_items: [{ price: PRICE_IDS[plan], quantity: 1 }],
    subscription_data: {
      metadata: { clerk_user_id: clerkUserId, plan },
    },
    success_url: `${process.env.APP_URL}?checkout=success`,
    cancel_url: `${process.env.APP_URL}?checkout=cancelled`,
  });

  res.json({ url: session.url });
}
