import express from 'express';
import { register, login, refreshAccessToken, logout, getMe, handleOAuthCallback } from '../controllers/authController.js';
import auth from '../middleware/auth.js';
import passport from '../config/passport.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { validateRegister, validateLogin } from '../middleware/validator.js';
import { validateOAuthState } from '../services/oauthService.js';

const router = express.Router();

router.post('/register', authLimiter, validateRegister, register);
router.post('/login', authLimiter, validateLogin, login);
router.post('/refresh', refreshAccessToken);
router.post('/logout', logout);
router.get('/me', auth, getMe);

/**
 * PKCE validation middleware for OAuth callbacks
 * Prevents authorization code interception attacks per RFC 7636
 */
const validateOAuthState_Middleware = async (req, res, next) => {
  try {
    const state = req.query.state;
    if (!state) {
      return res.redirect(`${process.env.CLIENT_URL}/auth?error=missing_oauth_state`);
    }

    // Validate state and retrieve PKCE verifier
    const stateData = await validateOAuthState(state);
    if (!stateData) {
      return res.redirect(`${process.env.CLIENT_URL}/auth?error=invalid_oauth_state`);
    }

    // Attach state data to request for use in callback handler
    req.oauthState = stateData;
    next();
  } catch (err) {
    console.error('[OAUTH] State validation error:', err.message);
    res.redirect(`${process.env.CLIENT_URL}/auth?error=oauth_state_error`);
  }
};

// Google OAuth
if (process.env.GOOGLE_CLIENT_ID) {
  router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'], session: false }));
  router.get('/google/callback', validateOAuthState_Middleware, passport.authenticate('google', { session: false, failureRedirect: '/auth?error=google_failed' }), handleOAuthCallback);
} else {
  router.get('/google', (req, res) => res.redirect('/auth?error=Google_OAuth_Not_Configured'));
}

// GitHub OAuth
if (process.env.GITHUB_CLIENT_ID) {
  router.get('/github', passport.authenticate('github', { scope: ['user:email'], session: false }));
  router.get('/github/callback', validateOAuthState_Middleware, passport.authenticate('github', { session: false, failureRedirect: '/auth?error=github_failed' }), handleOAuthCallback);
} else {
  router.get('/github', (req, res) => res.redirect('/auth?error=GitHub_OAuth_Not_Configured'));
}

export default router;
