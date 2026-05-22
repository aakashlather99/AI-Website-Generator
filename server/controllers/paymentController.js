import Stripe from 'stripe';
import pool from '../config/db.js';
import dotenv from 'dotenv';
dotenv.config();

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

const PLANS = {
  basic: { credits: 50, price: 999, name: 'Basic - 50 Credits' },       // $9.99
  pro: { credits: 150, price: 1999, name: 'Pro - 150 Credits' },        // $19.99
  enterprise: { credits: 500, price: 4999, name: 'Enterprise - 500 Credits' }, // $49.99
};

// POST /api/payment/create-checkout-session
export const createCheckoutSession = async (req, res) => {
  try {
    const { plan } = req.body;
    if (!plan || !PLANS[plan]) {
      return res.status(400).json({ success: false, message: 'Invalid plan selected' });
    }

    if (!stripe) {
      console.error('❌ Stripe not configured — STRIPE_SECRET_KEY missing');
      return res.status(500).json({ success: false, message: 'Payment service not configured' });
    }

    const p = PLANS[plan];
    const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: p.name,
              description: `${p.credits} AI website generation credits`,
            },
            unit_amount: p.price, // already in cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${clientUrl}/pricing?success=true`,
      cancel_url: `${clientUrl}/pricing?canceled=true`,
      metadata: {
        userId: req.userId.toString(),
        plan,
        credits: p.credits.toString(),
      },
    });

    console.log(`✅ Stripe session created: sessionId=${session.id}, userId=${req.userId}, plan=${plan}`);

    res.json({
      success: true,
      url: session.url,
    });
  } catch (e) {
    console.error('❌ Checkout error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to create checkout session' });
  }
};

// POST /api/payment/webhook
export const handleWebhook = async (req, res) => {
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('[CRITICAL] STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  if (!stripe) {
    return res.status(500).json({ error: 'Stripe not configured' });
  }

  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // req.body is a Buffer here because of express.raw in index.js
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('[SECURITY] Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event types
  console.log(`[WEBHOOK] Processing event type: ${event.type}`);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = parseInt(session.metadata.userId);
      const credits = parseInt(session.metadata.credits);
      const planName = session.metadata.plan;
      const sessionId = session.id;

      if (!userId || !credits || !planName) {
        console.error('[WEBHOOK] Invalid metadata:', session.metadata);
        return res.status(400).json({ error: 'Invalid session metadata' });
      }

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check if already processed (idempotency)
        const existing = await client.query(
          'SELECT id FROM credit_transactions WHERE stripe_session_id = $1',
          [sessionId]
        );

        if (existing.rows.length > 0) {
          console.log('[WEBHOOK] Payment already processed:', sessionId);
          await client.query('COMMIT');
          return res.json({ received: true });
        }

        // Update user credits
        await client.query(
          'UPDATE users SET credits = credits + $1 WHERE id = $2',
          [credits, userId]
        );

        // Get new balance
        const balanceResult = await client.query(
          'SELECT credits FROM users WHERE id = $1',
          [userId]
        );
        const newBalance = balanceResult.rows[0]?.credits || credits;

        // Log transaction
        await client.query(
          `INSERT INTO credit_transactions 
           (user_id, amount, type, description, balance_after, stripe_session_id, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
          [userId, credits, 'purchase', `Purchased ${planName} plan`, newBalance, sessionId]
        );

        await client.query('COMMIT');
        console.log('[WEBHOOK] ✅ Payment processed successfully:', { userId, credits, planName, newBalance });
      } catch (err) {
        await client.query('ROLLBACK');
        console.error('[WEBHOOK] Transaction error:', err.message);
        return res.status(500).json({ error: 'Processing failed' });
      } finally {
        client.release();
      }
      break;
    }

    case 'payment_intent.succeeded': {
      const paymentIntent = event.data.object;
      console.log(`[WEBHOOK] 💳 PaymentIntent succeeded: ${paymentIntent.id}`);
      break;
    }

    case 'payment_method.attached': {
      const paymentMethod = event.data.object;
      console.log(`[WEBHOOK] 🔗 PaymentMethod attached: ${paymentMethod.id}`);
      break;
    }

    default:
      console.log(`[WEBHOOK] Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
};

// GET /api/payment/status
export const getBillingStatus = async (req, res) => {
  try {
    const user = await pool.query(
      'SELECT credits, subscription_tier FROM users WHERE id = $1',
      [req.userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const txns = await pool.query(
      'SELECT id, amount, type, description, balance_after, created_at FROM credit_transactions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
      [req.userId]
    );

    res.json({
      success: true,
      billing: {
        ...user.rows[0],
        transactions: txns.rows,
      },
    });
  } catch (e) {
    console.error('❌ Get billing status error:', e.message);
    res.status(500).json({ success: false, message: 'Failed to retrieve billing information' });
  }
};
