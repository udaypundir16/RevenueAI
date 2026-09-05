import { useState, useEffect, useCallback } from 'react';
import { fetchHealthCheck, type HealthCheckResponse } from '../api/client';

export interface HealthState {
  data: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  latencyMs: number | null;
  lastChecked: Date | null;
  refetch: () => Promise<void>;
}

export function useHealthCheck(pollIntervalMs: number = 15000): HealthState {
  const [data, setData] = useState<HealthCheckResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const performCheck = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHealthCheck();
      setData(result.data);
      setLatencyMs(result.latencyMs);
      setLastChecked(result.timestamp);
      setError(null);
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'latencyMs' in err) {
        setLatencyMs((err as { latencyMs: number }).latencyMs);
      }
      if (err && typeof err === 'object' && 'error' in err) {
        const errorObj = (err as { error: Error }).error;
        setError(errorObj.message || 'Failed to connect to backend service.');
      } else {
        setError('Network error: Unable to reach FastAPI backend.');
      }
      setData(null);
      setLastChecked(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    performCheck();
    if (pollIntervalMs > 0) {
      const interval = setInterval(performCheck, pollIntervalMs);
      return () => clearInterval(interval);
    }
  }, [performCheck, pollIntervalMs]);

  return {
    data,
    loading,
    error,
    latencyMs,
    lastChecked,
    refetch: performCheck,
  };
}
