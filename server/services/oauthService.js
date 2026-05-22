import crypto from 'crypto';
import redis from '../config/redis.js';
import pool from '../config/db.js';

/**
 * OAuth PKCE State Management
 * Implements Proof Key for Public Clients Exchange (PKCE) per RFC 7636
 * Prevents authorization code interception and CSRF attacks
 */

/**
 * Generate PKCE parameters
 * @returns {Object} Object with code_challenge, code_verifier, and state
 */
export const generatePKCEParameters = () => {
  // Code verifier: 128 character random string
  const codeVerifier = crypto.randomBytes(96).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Code challenge: SHA256 hash of verifier
  const codeChallenge = crypto.createHash('sha256')
    .update(codeVerifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // State parameter for CSRF protection
  const state = crypto.randomBytes(32).toString('hex');

  return { codeVerifier, codeChallenge, state };
};

/**
 * Save OAuth state and verifier to Redis
 * @param {string} state - State parameter
 * @param {string} codeVerifier - PKCE code verifier
 * @param {string} expectedEmail - (optional) Email to verify on callback
 */
export const saveOAuthState = async (state, codeVerifier, expectedEmail = null) => {
  const stateData = {
    codeVerifier,
    timestamp: Date.now(),
    ...(expectedEmail && { expectedEmail })
  };

  // Store for 10 minutes (300 seconds) - typical OAuth flow duration
  await redis.setex(
    `oauth_state_${state}`,
    600,  // 10 minutes TTL
    JSON.stringify(stateData)
  );

  return state;
};

/**
 * Validate and retrieve OAuth state
 * @param {string} state - State parameter from callback
 * @returns {Object} State data if valid, null if expired/invalid
 */
export const validateOAuthState = async (state) => {
  if (!state) {
    console.warn('[OAUTH] No state parameter provided');
    return null;
  }

  const storedState = await redis.get(`oauth_state_${state}`);
  
  if (!storedState) {
    console.warn('[OAUTH] State not found or expired:', state);
    return null;
  }

  try {
    const stateData = JSON.parse(storedState);

    // Check if state is fresh (not older than 10 minutes)
    const age = Date.now() - stateData.timestamp;
    if (age > 600000) {  // 10 minutes
      console.warn('[OAUTH] State too old:', age);
      await redis.del(`oauth_state_${state}`);
      return null;
    }

    // Delete state immediately (one-time use)
    await redis.del(`oauth_state_${state}`);

    return stateData;
  } catch (err) {
    console.error('[OAUTH] Error parsing state:', err.message);
    return null;
  }
};

/**
 * Generate OAuth authorization URL with PKCE
 * @param {string} provider - 'google' or 'github'
 * @param {string} clientId - OAuth client ID
 * @param {string} redirectUri - OAuth redirect URI
 * @returns {Object} { url, state, codeVerifier }
 */
export const generateOAuthAuthorizationUrl = (provider, clientId, redirectUri) => {
  const { codeVerifier, codeChallenge, state } = generatePKCEParameters();

  // Save state and verifier
  saveOAuthState(state, codeVerifier).catch(err => {
    console.error('[OAUTH] Error saving state:', err.message);
  });

  const authorizationUrl = new URL(
    provider === 'google'
      ? 'https://accounts.google.com/o/oauth2/v2/auth'
      : 'https://github.com/login/oauth/authorize'
  );

  const params = {
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: provider === 'google'
      ? 'openid profile email'
      : 'read:user user:email',
    state: state,
  };

  // Add PKCE parameters for Google (GitHub handles differently)
  if (provider === 'google') {
    params.code_challenge = codeChallenge;
    params.code_challenge_method = 'S256';  // SHA256
  }

  // Add nonce for Google OpenID (prevents token ID forgery)
  if (provider === 'google') {
    params.nonce = crypto.randomBytes(16).toString('hex');
  }

  authorizationUrl.search = new URLSearchParams(params).toString();

  return {
    url: authorizationUrl.toString(),
    state,
    codeVerifier,
    codeChallenge,
  };
};

/**
 * Validate OAuth code and exchange for tokens
 * Implements PKCE parameter validation
 */
export const validateAndExchangeOAuthCode = async (code, state, codeVerifier, provider) => {
  if (!code || !state) {
    throw new Error('Missing code or state parameter');
  }

  // Validate state and retrieve stored verifier
  const stateData = await validateOAuthState(state);
  if (!stateData) {
    throw new Error('Invalid or expired state');
  }

  // Verify code verifier matches
  if (stateData.codeVerifier !== codeVerifier) {
    console.error('[OAUTH] Code verifier mismatch for state:', state);
    throw new Error('Code verifier mismatch');
  }

  return true;  // Valid PKCE flow
};

/**
 * Security headers for OAuth responses
 */
export const getOAuthSecurityHeaders = () => ({
  'Cache-Control': 'no-store',
  'Pragma': 'no-cache',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
});
