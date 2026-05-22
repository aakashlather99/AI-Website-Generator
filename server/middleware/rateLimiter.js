import rateLimit from 'express-rate-limit';
import redis from '../config/redis.js';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, message: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Too many login attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// AI generation limiter - based on subscription tier and per-user
/**
 * Per-user rate limiting for AI generation
 * Limits vary by subscription tier:
 * - free: 3 per day
 * - pro: 50 per day
 * - enterprise: 500 per day
 */
export const aiGenerationLimiter = async (req, res, next) => {
  if (!req.userId) {
    return res.status(401).json({ success: false, message: 'Authentication required' });
  }

  const today = new Date().toISOString().split('T')[0];
  const key = `ai_gen_${req.userId}_${today}`;

  try {
    // Increment counter
    const count = await redis.incr(key);
    
    // Set expiry on first increment
    if (count === 1) {
      await redis.expire(key, 86400); // 24 hours
    }

    // Get tier from request (should be set by auth middleware)
    const tier = req.userTier || 'free';

    const limits = {
      'free': 3,
      'pro': 50,
      'enterprise': 500
    };

    const limit = limits[tier] || limits['free'];
    const remaining = Math.max(0, limit - count);

    // Set rate limit headers
    res.set('X-RateLimit-Limit', limit.toString());
    res.set('X-RateLimit-Remaining', remaining.toString());
    res.set('X-RateLimit-Reset', new Date(Date.now() + 86400 * 1000).toISOString());

    if (count > limit) {
      return res.status(429).json({
        success: false,
        message: `Daily AI generation limit reached (${limit} per day for ${tier} tier)`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: 86400,
        tier,
        limit,
        used: count
      });
    }

    next();
  } catch (err) {
    console.error('[RATE LIMITER] Error:', err.message);
    // Don't block on rate limiter error
    next();
  }
};

// Admin limiter
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

export default { apiLimiter, authLimiter, aiGenerationLimiter, adminLimiter };
