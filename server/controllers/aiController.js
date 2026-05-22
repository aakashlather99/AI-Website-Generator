import pool from '../config/db.js';
import { enqueueAIGeneration, getJobStatus, getJobResult } from '../config/queue.js';
import { improveDesign } from '../services/ai/orchestrator.js';

// POST /api/ai/generate
/**
 * Enhanced generateWebsite using BullMQ for async processing
 * - Returns jobId immediately (no timeout)
 * - Client polls for status via /api/ai/job/:jobId
 * - Prevents 504 Gateway Timeout errors
 */
export const generateWebsite = async (req, res) => {
  try {
    const { prompt, projectId, framework = 'html' } = req.body;
    const userId = req.userId;

    // Validate input
    if (!prompt || prompt.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'Prompt cannot be empty' });
    }

    // Check user credits immediately
    const userResult = await pool.query(
      'SELECT credits, subscription_tier FROM users WHERE id = $1',
      [userId]
    );
    const user = userResult.rows[0];

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.credits <= 0) {
      return res.status(403).json({
        success: false,
        message: 'No credits remaining. Please purchase more.',
        creditsNeeded: 1,
        creditsAvailable: user.credits,
      });
    }

    // Validate project ownership if updating existing project
    if (projectId) {
      const projectCheck = await pool.query(
        'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
        [projectId, userId]
      );
      if (projectCheck.rows.length === 0) {
        return res.status(403).json({ success: false, message: 'Project not found or access denied' });
      }
    }

    // Enqueue AI generation job or run synchronously if Redis is missing
    const { isQueueReady, enqueueAIGeneration } = await import('../config/queue.js');
    const { runPipeline } = await import('../services/ai/orchestrator.js');

    if (!isQueueReady()) {
      console.log('⚠️ Redis unavailable. Running generation in synchronous mode...');
      const syncJobId = `sync-${userId}-${Date.now()}`;
      
      // Run pipeline directly (asyncly so we can return the jobId immediately)
      // Actually, if we want the frontend to see "Processing", we should return the jobId first.
      // But in sync mode without Redis, we can't easily run in background without a worker.
      // So we'll just run it and the frontend will wait for the response of THIS request.
      
      const result = await runPipeline(prompt, framework, userId, projectId ? parseInt(projectId) : null);
      
      await pool.query('UPDATE users SET credits = credits - 1 WHERE id = $1', [userId]);
      const title = prompt.length > 80 ? prompt.substring(0, 80) + '...' : prompt;
      
      let projectRecord;
      if (projectId) {
        const updateResult = await pool.query(
          'UPDATE projects SET html_code = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
          [result.code, projectId]
        );
        projectRecord = updateResult.rows[0];
      } else {
        const insertResult = await pool.query(
          'INSERT INTO projects (user_id, title, prompt, html_code, framework) VALUES ($1, $2, $3, $4, $5) RETURNING *',
          [userId, title, prompt, result.code, framework]
        );
        projectRecord = insertResult.rows[0];
      }

      const finalResult = {
        success: true,
        htmlCode: result.code,
        project: projectRecord,
        credits: user.credits - 1,
        metadata: result.metadata
      };

      // Store for polling
      const { storeSyncResult } = await import('../config/queue.js');
      storeSyncResult(syncJobId, { userId, projectId, prompt }, finalResult);

      return res.status(202).json({
        success: true,
        message: 'Generation started (Sync Fallback)',
        jobId: syncJobId,
      });
    }

    // Normal queue flow
    const job = await enqueueAIGeneration(userId, projectId, prompt, framework);
    res.status(202).json({
      success: true,
      message: 'Generation job enqueued',
      jobId: job.id,
      estimatedWaitTime: '30-60 seconds',
    });
  } catch (error) {
    console.error('[AI] Generation error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to queue generation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// GET /api/ai/job/:jobId
/**
 * Get job status (for polling)
 * Returns: { state, progress, data, failedReason, result }
 */
export const getJobStatusHandler = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    const status = await getJobStatus(jobId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    // Verify user owns this job
    if (status.data.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    res.json({
      success: true,
      jobId,
      ...status,
    });
  } catch (error) {
    console.error('[AI] Job status error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get job status' });
  }
};

// GET /api/ai/job/:jobId/result
/**
 * Get job result (once completed)
 * Returns null if still processing, or the result data
 */
export const getJobResultHandler = async (req, res) => {
  try {
    const { jobId } = req.params;
    const userId = req.userId;

    // Verify job belongs to user
    const status = await getJobStatus(jobId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (status.data.userId !== userId) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const result = await getJobResult(jobId);

    if (!result) {
      return res.status(202).json({
        success: true,
        message: 'Job still processing',
        state: status.state,
        progress: status.progress,
      });
    }

    res.json({
      success: result.success,
      ...result,
    });
  } catch (error) {
    console.error('[AI] Job result error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to get job result' });
  }
};

// POST /api/ai/improve
export const improveWebsite = async (req, res) => {
  try {
    const { projectId, improvementPrompt } = req.body;

    if (!projectId || !improvementPrompt) {
      return res.status(400).json({ success: false, message: 'Project ID and improvement prompt required' });
    }

    const userResult = await pool.query('SELECT credits FROM users WHERE id = $1', [req.userId]);
    if (!userResult.rows[0] || userResult.rows[0].credits <= 0) {
      return res.status(403).json({ success: false, message: 'No credits remaining' });
    }

    const projectResult = await pool.query('SELECT * FROM projects WHERE id = $1 AND user_id = $2', [projectId, req.userId]);
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const project = projectResult.rows[0];

    // Save version before improvement
    await pool.query(
      'INSERT INTO project_versions (project_id, version_number, html_code, prompt, change_description) VALUES ($1, $2, $3, $4, $5)',
      [project.id, project.current_version, project.html_code, project.prompt, 'Before improvement']
    );

    const improvedCode = await improveDesign(project.html_code, improvementPrompt, project.framework);

    await pool.query(
      'UPDATE projects SET html_code = $1, current_version = current_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      [improvedCode, project.id]
    );

    // Deduct credit
    await pool.query('UPDATE users SET credits = credits - 1 WHERE id = $1', [req.userId]);
    const newCredits = userResult.rows[0].credits - 1;

    await pool.query(
      'INSERT INTO credit_transactions (user_id, amount, type, description, balance_after) VALUES ($1, -1, $2, $3, $4)',
      [req.userId, 'usage', `Improved: ${project.title}`, newCredits]
    );

    // Log conversation
    await pool.query(
      'INSERT INTO prompts (project_id, user_id, role, content) VALUES ($1, $2, $3, $4)',
      [project.id, req.userId, 'user', `Improve: ${improvementPrompt}`]
    );

    res.json({ success: true, htmlCode: improvedCode, credits: newCredits });
  } catch (error) {
    console.error('Improve error:', error);
    res.status(500).json({ success: false, message: 'Improvement failed' });
  }
};

// GET /api/ai/frameworks
export const getFrameworks = (req, res) => {
  res.json({
    success: true,
    frameworks: [
      { id: 'html', name: 'Static HTML/CSS/JS', description: 'Pure HTML with embedded CSS and JavaScript' },
      { id: 'react', name: 'React', description: 'React 18 with JSX components' },
      { id: 'nextjs', name: 'Next.js Style', description: 'Component-based with client-side routing' },
    ],
  });
};
