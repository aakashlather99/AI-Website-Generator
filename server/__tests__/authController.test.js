/**
 * Auth Controller Tests
 * Tests for authentication endpoints: register, login, refresh, logout
 */

// Mock dependencies
jest.mock('../config/db.js');
jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

import { register, login, refreshAccessToken, logout } from '../controllers/authController.js';
import pool from '../config/db.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Auth Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      cookies: {},
      userId: null,
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      clearCookie: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'securepassword123',
      };

      pool.query.mockResolvedValueOnce({ rows: [] }); // No existing user
      bcrypt.genSalt.mockResolvedValue('$2a$12$salt');
      bcrypt.hash.mockResolvedValue('hashedpassword');
      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            name: 'John Doe',
            email: 'john@example.com',
            credits: 1,
            role: 'user',
            subscription_tier: 'free',
          },
        ],
      }); // Insert result
      pool.query.mockResolvedValueOnce({}); // Credit transaction log
      jwt.sign.mockReturnValue('mock_access_token');

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('created'),
        })
      );
      expect(res.cookie).toHaveBeenCalled(); // Check for httpOnly cookie
    });

    it('should reject duplicate email', async () => {
      req.body = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'password',
      };

      pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // User exists

      await register(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining('already'),
        })
      );
    });
  });

  describe('login', () => {
    it('should login user successfully', async () => {
      req.body = {
        email: 'john@example.com',
        password: 'securepassword123',
      };

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email: 'john@example.com',
            password: 'hashedpassword',
            name: 'John Doe',
            credits: 5,
            role: 'user',
            subscription_tier: 'pro',
          },
        ],
      });
      bcrypt.compare.mockResolvedValue(true);
      jwt.sign.mockReturnValue('mock_access_token');

      await login(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining('Logged'),
        })
      );
      expect(res.cookie).toHaveBeenCalled(); // Check for cookie
    });

    it('should reject invalid credentials', async () => {
      req.body = {
        email: 'john@example.com',
        password: 'wrongpassword',
      };

      pool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email: 'john@example.com',
            password: 'hashedpassword',
          },
        ],
      });
      bcrypt.compare.mockResolvedValue(false);

      await login(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
    });
  });

  describe('logout', () => {
    it('should logout user and clear cookies', async () => {
      req.cookies = { refreshToken: 'sometoken' };

      pool.query.mockResolvedValue({});

      await logout(req, res);

      expect(res.clearCookie).toHaveBeenCalledWith('accessToken');
      expect(res.clearCookie).toHaveBeenCalledWith('refreshToken');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });
});
