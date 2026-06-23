import Stripe from 'stripe';
import { createClerkClient, verifyToken } from '@clerk/backend';

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const PRICE_IDS = {
  starter:  process.env.STRIPE_PRICE_STARTER,
  business: process.env.STRIPE_PRICE_BUSINESS,
  byok:     process.env.STRIPE_PRICE_BYOK,
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

  const { plan, email, clerkUserId } = req.body;
  if (!PRICE_IDS[plan]) return res.status(400).json({ error: 'Invalid plan' });
  if (clerkUserId !== userId) return res.status(403).json({ error: 'Forbidden' });

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
