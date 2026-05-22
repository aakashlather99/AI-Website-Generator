import express from 'express';
import { getTemplates, getTemplate, createTemplate, getCategories } from '../controllers/templateController.js';
import auth from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';

const router = express.Router();

router.get('/', getTemplates);
router.get('/categories', getCategories);
router.get('/:id', getTemplate);
router.post('/', auth, requireAdmin, createTemplate);

export default router;
