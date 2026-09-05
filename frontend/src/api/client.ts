export interface HealthFeatures {
  razorpay_configured: boolean;
  supabase_configured: boolean;
  gemini_agent_configured: boolean;
}

export interface HealthCheckResponse {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  environment: string;
  features: HealthFeatures;
}

export interface HealthCheckResult {
  data: HealthCheckResponse | null;
  latencyMs: number;
  timestamp: Date;
}

export interface RecoveryActionItem {
  id: string;
  transaction_id: string;
  action_type: string;
  agent_reasoning: string;
  created_at: string;
  payment_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  failure_reason_raw?: string;
}

export interface RetryAttemptItem {
  id: string;
  transaction_id: string;
  attempt_number: number;
  scheduled_at: string;
  executed_at?: string;
  outcome: string;
  method: string;
  created_at: string;
  payment_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
}

export interface RecoveryMessageItem {
  id: string;
  transaction_id: string;
  channel: string;
  content: string;
  sent_at?: string;
  opened_at?: string;
  created_at: string;
  payment_id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  customer_name?: string;
  customer_email?: string;
  customer_segment?: string;
}

export async function fetchRecoveryMessages(limit: number = 20): Promise<RecoveryMessageItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/recovery/messages?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to load recovery messages: ${res.statusText}`);
  return res.json();
}

export interface SimulatePayload {
  customer_name: string;
  email: string;
  amount: number;
  error_code: string;
  error_description: string;
  error_reason: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export async function fetchHealthCheck(): Promise<HealthCheckResult> {
  const startTime = performance.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data: HealthCheckResponse = await response.json();
    return {
      data,
      latencyMs,
      timestamp: new Date(),
    };
  } catch (error) {
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);
    throw {
      error,
      latencyMs,
      timestamp: new Date(),
    };
  }
}

export async function fetchRecoveryActions(limit: number = 20): Promise<RecoveryActionItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/recovery/actions?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to load recovery actions: ${res.statusText}`);
  return res.json();
}

export async function fetchRetryAttempts(limit: number = 20): Promise<RetryAttemptItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/recovery/retries?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to load retry attempts: ${res.statusText}`);
  return res.json();
}

export async function triggerRunRetries(): Promise<{ status: string; due_retries_executed_count: number; executions: any[] }> {
  const res = await fetch(`${API_BASE_URL}/api/recovery/run-retries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Failed to run due retries: ${res.statusText}`);
  return res.json();
}

export async function simulateFailure(payload: SimulatePayload): Promise<any> {
  const res = await fetch(`${API_BASE_URL}/simulate/failure`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Failed to simulate failure: ${res.statusText}`);
  return res.json();
}

export { API_BASE_URL };
