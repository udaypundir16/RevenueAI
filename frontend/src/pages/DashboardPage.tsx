import React, { useState } from 'react';
import {
  Server,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  DollarSign,
  TrendingUp,
  Cpu,
  RefreshCw,
  Code2,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Database,
  BrainCircuit,
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { type HealthCheckResponse, API_BASE_URL } from '../api/client';

interface DashboardPageProps {
  healthData: HealthCheckResponse | null;
  loading: boolean;
  error: string | null;
  latencyMs: number | null;
  lastChecked: Date | null;
  onRefresh: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  healthData,
  loading,
  error,
  latencyMs,
  lastChecked,
  onRefresh,
}) => {
  const [showRawJson, setShowRawJson] = useState(false);

  const isConnected = !!healthData && !error;

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/40 border border-indigo-500/20 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Full-Stack Foundation Ready</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Hello Dashboard 👋
            </h1>
            <p className="mt-2 text-slate-300 text-sm max-w-2xl leading-relaxed">
              Welcome to <span className="text-indigo-400 font-semibold">Revenue Recovery AI</span>. 
              The React frontend is communicating directly with your FastAPI backend to monitor
              microservice availability, payment gateways, and autonomous recovery agents.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="test-connection-btn"
              onClick={onRefresh}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{loading ? 'Pinging API...' : 'Test Connection'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Connectivity Diagnostic Panel */}
      <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
              <Server className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                FastAPI Backend Health Status
                {isConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <XCircle className="w-5 h-5 text-rose-400" />
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Target endpoint: <code className="text-indigo-300 bg-slate-800/80 px-1.5 py-0.5 rounded font-mono">{API_BASE_URL}/api/health</code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              <span>Last checked: {lastChecked ? lastChecked.toLocaleTimeString() : 'Never'}</span>
            </span>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-xl bg-rose-950/40 border border-rose-800/60 p-4 text-rose-300 text-sm flex items-start gap-3">
            <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Backend Unreachable</p>
              <p className="text-xs text-rose-300/80 mt-1">{error}</p>
              <p className="text-xs text-slate-400 mt-2">
                Make sure the FastAPI backend is running on <code className="text-white font-mono">http://localhost:8000</code>.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4">
              <span className="text-xs font-medium text-slate-400">Microservice</span>
              <p className="mt-1 text-sm font-semibold text-white font-mono">
                {healthData?.service || 'Connecting...'}
              </p>
              <span className="mt-1 inline-block text-[11px] text-emerald-400 font-semibold">
                ● Status: {healthData?.status || 'Unknown'}
              </span>
            </div>

            <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4">
              <span className="text-xs font-medium text-slate-400">Response Latency</span>
              <p className="mt-1 text-2xl font-bold text-white">
                {latencyMs !== null ? `${latencyMs} ms` : '--'}
              </p>
              <span className="text-[11px] text-slate-400">Round-trip HTTP ping</span>
            </div>

            <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4">
              <span className="text-xs font-medium text-slate-400">Environment</span>
              <p className="mt-1 text-sm font-semibold text-indigo-300 capitalize">
                {healthData?.environment || 'Development'}
              </p>
              <span className="text-[11px] text-slate-400">API Version: {healthData?.version || '0.1.0'}</span>
            </div>

            <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4">
              <span className="text-xs font-medium text-slate-400">Server UTC Time</span>
              <p className="mt-1 text-xs font-mono text-slate-300 truncate">
                {healthData?.timestamp ? new Date(healthData.timestamp).toUTCString() : '--'}
              </p>
              <span className="text-[11px] text-slate-500">Live timestamp verified</span>
            </div>
          </div>
        )}

        {/* Integration Statuses */}
        <div className="mt-6 border-t border-slate-800 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Configured Connectors & Agent Pipelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-medium text-slate-200">Razorpay Gateway</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Placeholder Ready
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-200">Supabase Storage</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Placeholder Ready
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-slate-200">Gemini Recovery Agent</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-amber-500/10 text-amber-300 border border-amber-500/20">
                Placeholder Ready
              </span>
            </div>
          </div>
        </div>

        {/* Live Payload Viewer Accordion */}
        <div className="mt-6 border-t border-slate-800 pt-4">
          <button
            id="toggle-raw-json-btn"
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <Code2 className="w-4 h-4" />
            <span>{showRawJson ? 'Hide Raw JSON Response' : 'Inspect Raw JSON Response from /api/health'}</span>
            {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRawJson && (
            <div className="mt-3 rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
              <pre>{JSON.stringify(healthData || { error: error || 'No data' }, null, 2)}</pre>
            </div>
          )}
        </div>
      </section>

      {/* Metric Cards Preview */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Revenue Recovery Metrics (Preview)</h2>
            <p className="text-xs text-slate-400">Real-time recovery tracking and agent performance</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Recovered Revenue"
            value="$14,250.00"
            change="+23.5%"
            isPositive={true}
            subtitle="Recovered through smart retry rules"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <MetricCard
            title="Recovery Success Rate"
            value="78.4%"
            change="+4.2%"
            isPositive={true}
            subtitle="Avg recovery rate for failed cards"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            title="Autonomous Agents"
            value="4 Active"
            change="Online"
            isPositive={true}
            subtitle="Handling dunning & notifications"
            icon={<Cpu className="w-5 h-5" />}
          />
          <MetricCard
            title="Pending Invoices"
            value="12 Invoices"
            change="-8%"
            isPositive={true}
            subtitle="Currently in retry scheduled window"
            icon={<Activity className="w-5 h-5" />}
          />
        </div>
      </div>
    </main>
  );
};
