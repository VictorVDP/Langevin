import Stripe from 'stripe';
import { createClerkClient } from '@clerk/backend';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

const ENTITY_PRICE_IDS = {
  starter:  process.env.STRIPE_PRICE_ENTITY_STARTER,
  business: process.env.STRIPE_PRICE_ENTITY_BUSINESS,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  let userId;
  try {
    const payload = await clerk.verifyToken(token);
    userId = payload.sub;
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { plan, quantity = 1, clerkUserId } = req.body;
  if (clerkUserId !== userId) return res.status(403).json({ error: 'Forbidden' });
  if (!ENTITY_PRICE_IDS[plan]) return res.status(400).json({ error: 'Invalid plan for entity add-on' });

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: [{ price: ENTITY_PRICE_IDS[plan], quantity: parseInt(quantity) || 1 }],
    metadata: { clerk_user_id: clerkUserId, entity_count: String(quantity) },
    success_url: `${process.env.APP_URL}?entity_checkout=success`,
    cancel_url: `${process.env.APP_URL}`,
  });

  res.json({ url: session.url });
}
