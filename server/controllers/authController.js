import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import pool from '../config/db.js';

const generateAccessToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

const generateRefreshToken = async (userId) => {
  const token = crypto.randomBytes(40).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // Remove old refresh tokens for this user (keep max 5)
  await pool.query(`
    DELETE FROM refresh_tokens WHERE user_id = $1 AND id NOT IN (
      SELECT id FROM refresh_tokens WHERE user_id = $1 ORDER BY created_at DESC LIMIT 4
    )
  `, [userId]);

  await pool.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
    [userId, token, expiresAt]
  );

  return token;
};

/**
 * Set secure httpOnly cookies for tokens
 * httpOnly: Prevents JavaScript XSS access
 * Secure: Only sent over HTTPS
 * SameSite=Strict: CSRF protection
 */
const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 15 * 60 * 1000, // 15 minutes
    path: '/',
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
};

const userFields = 'id, name, email, credits, role, subscription_tier, avatar_url, created_at';

// POST /api/auth/register
export const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    const result = await pool.query(
      `INSERT INTO users (name, email, password, credits, last_login) 
       VALUES ($1, $2, $3, 5, CURRENT_TIMESTAMP) 
       RETURNING ${userFields}`,
      [name, email, hashedPassword]
    );

    const user = result.rows[0];
    console.log(`✅ User registered: id=${user.id}, email=${user.email}`);

    // Log the free credit
    await pool.query(
      'INSERT INTO credit_transactions (user_id, amount, type, description, balance_after) VALUES ($1, 5, $2, $3, 5)',
      [user.id, 'bonus', 'Free signup credit']
    );

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    // Set secure cookies instead of returning tokens
    setAuthCookies(res, accessToken, refreshToken);

    // Analytics
    await pool.query(
      'INSERT INTO usage_analytics (user_id, event_type, event_data) VALUES ($1, $2, $3)',
      [user.id, 'signup', JSON.stringify({ method: 'email' })]
    );

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      user,
    });
  } catch (error) {
    console.error('❌ Register error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      stack: error.stack
    });
    res.status(500).json({ success: false, message: 'Registration failed', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};

// POST /api/auth/login
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (user.is_banned) {
      console.log(`⚠️  Login attempt by banned user: ${email}`);
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    if (user.provider !== 'local' && user.password === 'OAUTH_NO_PASSWORD') {
      return res.status(400).json({ success: false, message: `This account uses ${user.provider} login` });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
    console.log(`✅ User logged in: id=${user.id}, email=${email}`);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    // Set secure cookies instead of returning tokens
    setAuthCookies(res, accessToken, refreshToken);

    res.json({
      success: true,
      message: 'Logged in successfully',
      user: {
        id: user.id, name: user.name, email: user.email,
        credits: user.credits, role: user.role,
        subscription_tier: user.subscription_tier, avatar_url: user.avatar_url,
      },
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ success: false, message: 'Login failed' });
  }
};

// POST /api/auth/refresh
export const refreshAccessToken = async (req, res) => {
  try {
    // Read refresh token from httpOnly cookie instead of body
    const refreshToken = req.cookies.refreshToken;
    if (!refreshToken) {
      return res.status(401).json({ success: false, message: 'Refresh token missing', code: 'NO_REFRESH_TOKEN' });
    }

    const result = await pool.query(
      'SELECT * FROM refresh_tokens WHERE token = $1 AND expires_at > CURRENT_TIMESTAMP',
      [refreshToken]
    );

    if (result.rows.length === 0) {
      // Clear invalid cookie
      res.clearCookie('refreshToken');
      return res.status(401).json({ success: false, message: 'Invalid or expired refresh token', code: 'TOKEN_EXPIRED' });
    }

    const tokenRecord = result.rows[0];

    // Rotate refresh token
    await pool.query('DELETE FROM refresh_tokens WHERE id = $1', [tokenRecord.id]);
    const newRefreshToken = await generateRefreshToken(tokenRecord.user_id);
    const newAccessToken = generateAccessToken(tokenRecord.user_id);

    // Set new cookies
    setAuthCookies(res, newAccessToken, newRefreshToken);

    res.json({
      success: true,
      message: 'Token refreshed',
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
  try {
    // Delete refresh token from database
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
      await pool.query('DELETE FROM refresh_tokens WHERE token = $1', [refreshToken]);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// GET /api/auth/me
export const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${userFields} FROM users WHERE id = $1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// OAuth callback handler — generates tokens and redirects to frontend
export const handleOAuthCallback = async (req, res) => {
  try {
    const user = req.user;
    if (!user || !user.id) {
      console.error('OAuth callback failed: No user returned from passport');
      return res.redirect(`${process.env.CLIENT_URL}/auth?error=oauth_failed`);
    }

    // Log PKCE validation if present
    if (req.oauthState) {
      console.log(`✅ OAuth PKCE state validation passed for user: ${user.email}`);
    }

    // Generate JWT tokens
    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    // Set secure cookies
    setAuthCookies(res, accessToken, refreshToken);

    // Update last login timestamp
    await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);

    console.log(`✅ OAuth login successful: user_id=${user.id}, email=${user.email}, provider=${user.provider}`);

    // Redirect to dashboard — tokens are now in httpOnly cookies
    res.redirect(`${process.env.CLIENT_URL}/projects?oauth=success`);
  } catch (error) {
    console.error('❌ OAuth callback error:', error.message, error);
    const errorMsg = encodeURIComponent(error.message || 'oauth_failed');
    res.redirect(`${process.env.CLIENT_URL}/auth?error=${errorMsg}`);
  }
};
