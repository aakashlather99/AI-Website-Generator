import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { runPipeline } from '../services/ai/orchestrator.js';
import pool from './db.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * BullMQ Queue Configuration
 * Handles long-running AI generation jobs asynchronously
 */

const REDIS_CONFIG = {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  connectTimeout: 1000,
  retryStrategy: (times) => {
    if (times > 1) return null; // Only try once
    return null;
  }
};

let redisReady = false;
let aiQueue = null;
let aiWorker = null;

// In-memory store for synchronous generation results
const syncResults = new Map();

export const storeSyncResult = (jobId, data, result) => {
  syncResults.set(jobId, { data, result });
  setTimeout(() => syncResults.delete(jobId), 300000);
};

const initQueue = async () => {
  const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', REDIS_CONFIG);
  
  // Silencing error listener
  connection.on('error', () => {
    redisReady = false;
  });

  try {
    // Quick ping to check if Redis is actually there
    await connection.connect();
    await connection.ping();
    redisReady = true;
    
    aiQueue = new Queue('ai-generation', { connection });
    
    aiWorker = new Worker('ai-generation', async (job) => {
      const { userId, projectId, prompt, framework = 'html' } = job.data;
      const result = await runPipeline(prompt, framework, userId, projectId ? parseInt(projectId) : null);
      
      // Deduct credit
      await pool.query('UPDATE users SET credits = credits - 1 WHERE id = $1', [userId]);
      const userResult = await pool.query('SELECT credits FROM users WHERE id = $1', [userId]);
      const newCredits = userResult.rows[0]?.credits || 0;
      
      // Save or update project in the database
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
      
      return {
        success: true,
        htmlCode: result.code,
        project: projectRecord,
        credits: newCredits,
        metadata: result.metadata
      };
    }, { connection, concurrency: 2 });

    console.log('✅ [QUEUE] BullMQ initialized with Redis');
  } catch (err) {
    redisReady = false;
    console.log('⚠️ [QUEUE] Redis not found. Using Synchronous Fallback mode.');
    connection.disconnect();
  }
};

initQueue();

export const isQueueReady = () => redisReady;

export const enqueueAIGeneration = async (userId, projectId, prompt, framework = 'html') => {
  if (!redisReady || !aiQueue) {
    throw new Error('Queue not initialized');
  }
  return aiQueue.add('generate-website', { userId, projectId, prompt, framework });
};

export const getJobStatus = async (jobId) => {
  if (syncResults.has(jobId)) {
    const data = syncResults.get(jobId);
    return { id: jobId, state: 'completed', progress: 100, data: data.data, result: data.result };
  }
  if (!redisReady || !aiQueue) return null;
  try {
    const job = await aiQueue.getJob(jobId);
    if (!job) return null;
    return { id: job.id, state: await job.getState(), progress: job.progress(), data: job.data, result: job.returnvalue };
  } catch { return null; }
};

export const getJobResult = async (jobId) => {
  if (syncResults.has(jobId)) return syncResults.get(jobId).result;
  if (!redisReady || !aiQueue) return null;
  try {
    const job = await aiQueue.getJob(jobId);
    if (!job || await job.getState() !== 'completed') return null;
    return job.returnvalue;
  } catch { return null; }
};

export default aiQueue;
