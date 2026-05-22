import express from 'express';
import { getStats, getUsers, updateUser, getGenerations, getAnalytics, getAdminLogs } from '../controllers/adminController.js';
import auth from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { adminLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(auth, requireAdmin, adminLimiter);

router.get('/stats', getStats);
router.get('/users', getUsers);
router.put('/users/:id', updateUser);
router.get('/generations', getGenerations);
router.get('/analytics', getAnalytics);
router.get('/logs', getAdminLogs);

export default router;
