import jwt from 'jsonwebtoken';
import pool from '../config/db.js';

// Standard JWT auth middleware
const auth = async (req, res, next) => {
  try {
    // Try to get token from httpOnly cookie first (preferred)
    let token = req.cookies?.accessToken;

    // Fall back to Authorization header for backwards compatibility
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user exists and not banned
    const result = await pool.query(
      'SELECT id, role, is_banned, subscription_tier FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    if (result.rows[0].is_banned) {
      return res.status(403).json({ success: false, message: 'Account suspended' });
    }

    req.userId = decoded.userId;
    req.userRole = result.rows[0].role;
    req.userTier = result.rows[0].subscription_tier || 'free';
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, message: 'Token expired', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
};

// Optional auth — doesn't fail if no token, just sets userId if present
export const optionalAuth = async (req, res, next) => {
  try {
    // Try to get token from httpOnly cookie first (preferred)
    let token = req.cookies?.accessToken;

    // Fall back to Authorization header for backwards compatibility
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId;
    }
  } catch { /* silent */ }
  next();
};

export default auth;
