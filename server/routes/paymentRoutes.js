import express from 'express';
import { createCheckoutSession, handleWebhook, getBillingStatus } from '../controllers/paymentController.js';
import auth from '../middleware/auth.js';

const router = express.Router();

router.post('/create-checkout-session', auth, createCheckoutSession);
router.get('/status', auth, getBillingStatus);
// Stripe webhook — needs raw body for signature verification, no auth
router.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

export default router;
