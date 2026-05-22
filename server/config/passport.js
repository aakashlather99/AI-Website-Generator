import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

// Helper to find or create OAuth user
const findOrCreateOAuthUser = async (provider, profile) => {
  const providerId = profile.id;
  const email = profile.emails?.[0]?.value || `${provider}_${providerId}@oauth.local`;
  const name = profile.displayName || profile.username || email.split('@')[0];
  const avatarUrl = profile.photos?.[0]?.value || null;

  // Check if OAuth account exists
  const oauthResult = await pool.query(
    'SELECT user_id FROM oauth_accounts WHERE provider = $1 AND provider_user_id = $2',
    [provider, providerId]
  );

  if (oauthResult.rows.length > 0) {
    // Existing OAuth user — update last login
    const userId = oauthResult.rows[0].user_id;
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP, avatar_url = COALESCE(avatar_url, $1) WHERE id = $2', [avatarUrl, userId]);
    const userResult = await pool.query('SELECT id, name, email, credits, role, subscription_tier, avatar_url FROM users WHERE id = $1', [userId]);
    return userResult.rows[0];
  }

  // Check if user with same email exists (link accounts)
  const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);

  let userId;
  if (existingUser.rows.length > 0) {
    userId = existingUser.rows[0].id;
    await pool.query('UPDATE users SET provider = $1, provider_id = $2, avatar_url = COALESCE(avatar_url, $3), last_login = CURRENT_TIMESTAMP WHERE id = $4',
      [provider, providerId, avatarUrl, userId]);
  } else {
    // Create new user
    const newUser = await pool.query(
      'INSERT INTO users (name, email, password, avatar_url, provider, provider_id, credits) VALUES ($1, $2, $3, $4, $5, $6, 1) RETURNING id',
      [name, email, 'OAUTH_NO_PASSWORD', avatarUrl, provider, providerId]
    );
    userId = newUser.rows[0].id;

    // Log signup credit
    await pool.query(
      'INSERT INTO credit_transactions (user_id, amount, type, description, balance_after) VALUES ($1, 1, $2, $3, 1)',
      [userId, 'bonus', 'Free signup credit']
    );
  }

  // Create OAuth account link
  await pool.query(
    'INSERT INTO oauth_accounts (user_id, provider, provider_user_id) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING',
    [userId, provider, providerId]
  );

  const userResult = await pool.query('SELECT id, name, email, credits, role, subscription_tier, avatar_url FROM users WHERE id = $1', [userId]);
  return userResult.rows[0];
};

// Google Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  console.log('✅ Google OAuth strategy configured');
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
    scope: ['profile', 'email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser('google', profile);
      if (!user) {
        return done(new Error('Failed to create or find OAuth user'));
      }
      done(null, user);
    } catch (err) {
      console.error('❌ Google OAuth error:', err.message);
      done(err, null);
    }
  }));
} else {
  console.warn('⚠️  Google OAuth not configured - GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET missing');
}

// GitHub Strategy
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  console.log('✅ GitHub OAuth strategy configured');
  passport.use(new GitHubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/auth/github/callback',
    scope: ['user:email'],
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      const user = await findOrCreateOAuthUser('github', profile);
      if (!user) {
        return done(new Error('Failed to create or find OAuth user'));
      }
      done(null, user);
    } catch (err) {
      console.error('❌ GitHub OAuth error:', err.message);
      done(err, null);
    }
  }));
} else {
  console.warn('⚠️  GitHub OAuth not configured - GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET missing');
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query('SELECT id, name, email, credits, role, subscription_tier, avatar_url FROM users WHERE id = $1', [id]);
    done(null, result.rows[0] || null);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
