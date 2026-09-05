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

export interface DashboardKPIs {
  revenue_at_risk: number;
  revenue_recovered: number;
  recovery_rate: number;
  active_retries: number;
  total_transactions: number;
  total_actions: number;
  total_messages: number;
}

export interface ChartDataPoint {
  date: string;
  full_date: string;
  recovery_rate: number;
  revenue_at_risk: number;
  revenue_recovered: number;
}

export interface DashboardSummaryResponse {
  kpis: DashboardKPIs;
  recovery_chart: ChartDataPoint[];
  summary: {
    currency: string;
    last_updated: string;
  };
}

export interface CustomerInfo {
  id: string | null;
  name: string;
  email: string;
  segment: string;
  risk_flag: boolean;
}

export interface TransactionItem {
  id: string;
  razorpay_payment_id: string;
  amount: number;
  currency: string;
  status: string;
  failure_reason_raw: string;
  failure_reason_classified: string;
  confidence_score: number;
  created_at: string;
  customer: CustomerInfo;
  latest_action?: {
    action_type: string;
    agent_reasoning: string;
    created_at: string;
  } | null;
  retry_count: number;
  message_count: number;
}

export interface TimelineStep {
  step: number;
  type: string;
  title: string;
  timestamp: string | null;
  status: string;
  confidence_score?: number;
  action_type?: string;
  agent_reasoning?: string;
  details: Record<string, any>;
}

export interface TransactionTimelineResponse {
  transaction: {
    id: string;
    razorpay_payment_id: string;
    amount: number;
    currency: string;
    status: string;
    failure_reason_raw: string;
    failure_reason_classified: string;
    confidence_score: number;
    created_at: string;
  };
  customer: CustomerInfo;
  timeline: TimelineStep[];
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
      headers: { 'Accept': 'application/json' },
    });
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);

    if (!response.ok) {
      throw new Error(`Server returned ${response.status}: ${response.statusText}`);
    }

    const data: HealthCheckResponse = await response.json();
    return { data, latencyMs, timestamp: new Date() };
  } catch (error) {
    const endTime = performance.now();
    const latencyMs = Math.round(endTime - startTime);
    throw { error, latencyMs, timestamp: new Date() };
  }
}

export async function fetchDashboardSummary(): Promise<DashboardSummaryResponse> {
  const res = await fetch(`${API_BASE_URL}/api/dashboard/summary`);
  if (!res.ok) throw new Error(`Failed to load dashboard summary: ${res.statusText}`);
  return res.json();
}

export async function fetchTransactions(params?: {
  status?: string;
  category?: string;
  search?: string;
  limit?: number;
}): Promise<TransactionItem[]> {
  const query = new URLSearchParams();
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.search) query.set('search', params.search);
  if (params?.limit) query.set('limit', String(params.limit));

  const res = await fetch(`${API_BASE_URL}/api/transactions?${query.toString()}`);
  if (!res.ok) throw new Error(`Failed to load transactions: ${res.statusText}`);
  return res.json();
}

export async function fetchTransactionTimeline(transactionId: string): Promise<TransactionTimelineResponse> {
  const res = await fetch(`${API_BASE_URL}/api/transactions/${transactionId}/timeline`);
  if (!res.ok) throw new Error(`Failed to load timeline: ${res.statusText}`);
  return res.json();
}

export async function fetchRecoveryMessages(limit: number = 30): Promise<RecoveryMessageItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/recovery/messages?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to load recovery messages: ${res.statusText}`);
  return res.json();
}

export async function fetchRecoveryActions(limit: number = 25): Promise<RecoveryActionItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/recovery/actions?limit=${limit}`);
  if (!res.ok) throw new Error(`Failed to load recovery actions: ${res.statusText}`);
  return res.json();
}

export async function fetchRetryAttempts(limit: number = 25): Promise<RetryAttemptItem[]> {
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
