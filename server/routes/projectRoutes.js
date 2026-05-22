import express from 'express';
import { getProjects, getProject, updateProject, deleteProject, getVersions, rollbackVersion, downloadProject, publishProject, getCommunityProjects, getCommunityProjectById } from '../controllers/projectController.js';
import auth from '../middleware/auth.js';
import { optionalAuth } from '../middleware/auth.js';
import { validateId } from '../middleware/validator.js';

// NOTE: CSRF protection is handled via SameSite=Strict cookies + httpOnly tokens.
// The csurf middleware was removed because the frontend doesn't fetch CSRF tokens,
// and SameSite=Strict already prevents cross-site request forgery.

const router = express.Router();

router.get('/community', optionalAuth, getCommunityProjects);
router.get('/community/:id', getCommunityProjectById);
router.get('/', auth, getProjects);
router.get('/:id', auth, validateId, getProject);
router.put('/:id', auth, validateId, updateProject);
router.delete('/:id', auth, validateId, deleteProject);
router.get('/:id/versions', auth, validateId, getVersions);
router.post('/:id/rollback/:versionId', auth, rollbackVersion);
router.get('/:id/download', auth, validateId, downloadProject);
router.post('/:id/publish', auth, validateId, publishProject);

export default router;
