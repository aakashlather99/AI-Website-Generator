import express from 'express';
import { generateWebsite, improveWebsite, getFrameworks, getJobStatusHandler, getJobResultHandler } from '../controllers/aiController.js';
import auth from '../middleware/auth.js';
import { aiGenerationLimiter } from '../middleware/rateLimiter.js';
import { validatePrompt } from '../middleware/validator.js';

const router = express.Router();

// AI Generation endpoints
router.post('/generate', auth, aiGenerationLimiter, validatePrompt, generateWebsite);
router.post('/improve', auth, aiGenerationLimiter, improveWebsite);
router.get('/frameworks', getFrameworks);

// Job status polling endpoints
router.get('/job/:jobId', auth, getJobStatusHandler);
router.get('/job/:jobId/result', auth, getJobResultHandler);

export default router;
