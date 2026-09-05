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

export { API_BASE_URL };
