import { useState, useCallback } from 'react';
import api from '../services/api';

interface JobStatus {
  id: string;
  state: 'active' | 'completed' | 'failed' | 'pending';
  progress: number;
  failedReason?: string;
}

/**
 * Hook for polling AI generation job status
 * Automatically polls the job endpoint until completion
 */
export const useAIJobPolling = () => {
  const [jobId, setJobId] = useState<string | null>(null);
  const [status, setStatus] = useState<JobStatus | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pollJob = useCallback(async (id: string) => {
    try {
      const { data } = await api.get(`/api/ai/job/${id}`);
      if (data.success) {
        setStatus(data);

        // If job is still processing, continue polling
        if (data.state === 'active' || data.state === 'pending') {
          setTimeout(() => pollJob(id), 1000); // Poll every 1 second
        } else if (data.state === 'completed') {
          // Get the result
          try {
            const resultData = await api.get(`/api/ai/job/${id}/result`);
            if (resultData.data.success) {
              setResult(resultData.data);
              setIsPolling(false);
              setError(null);
            } else {
              setError(resultData.data.message || 'Failed to get job result');
              setIsPolling(false);
            }
          } catch (err: any) {
            setError('Failed to fetch job result');
            setIsPolling(false);
          }
        } else if (data.state === 'failed') {
          setError(data.failedReason || 'Job failed');
          setIsPolling(false);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to check job status');
      setIsPolling(false);
    }
  }, []);

  const startPolling = useCallback(async (newJobId: string) => {
    setJobId(newJobId);
    setStatus(null);
    setResult(null);
    setError(null);
    setIsPolling(true);
    pollJob(newJobId);
  }, [pollJob]);

  const stopPolling = useCallback(() => {
    setIsPolling(false);
  }, []);

  return {
    jobId,
    status,
    result,
    isPolling,
    error,
    startPolling,
    stopPolling,
  };
};
