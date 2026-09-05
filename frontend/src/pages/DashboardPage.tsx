import React, { useState, useEffect } from 'react';
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
  Play,
  History,
  Zap,
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import {
  type HealthCheckResponse,
  type RecoveryActionItem,
  type RetryAttemptItem,
  API_BASE_URL,
  fetchRecoveryActions,
  fetchRetryAttempts,
  triggerRunRetries,
  simulateFailure,
} from '../api/client';

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
  const [actions, setActions] = useState<RecoveryActionItem[]>([]);
  const [retries, setRetries] = useState<RetryAttemptItem[]>([]);
  const [loadingData, setLoadingData] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [executingRetries, setExecutingRetries] = useState(false);
  const [execResult, setExecResult] = useState<string | null>(null);

  const isConnected = !!healthData && !error;

  const loadRecoveryData = async () => {
    try {
      setLoadingData(true);
      const [actionsData, retriesData] = await Promise.all([
        fetchRecoveryActions(25),
        fetchRetryAttempts(25),
      ]);
      setActions(actionsData);
      setRetries(retriesData);
    } catch (err) {
      console.error('Failed to fetch recovery data:', err);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    loadRecoveryData();
  }, []);

  const handleSimulate = async (scenario: {
    name: string;
    email: string;
    amount: number;
    code: string;
    desc: string;
    reason: string;
  }) => {
    try {
      setSimulating(true);
      setSimulationResult(null);
      const res = await simulateFailure({
        customer_name: scenario.name,
        email: scenario.email,
        amount: scenario.amount,
        error_code: scenario.code,
        error_description: scenario.desc,
        error_reason: scenario.reason,
      });
      const action = res?.orchestration?.decision?.action || 'processed';
      setSimulationResult(`Autonomous decision: ${action.toUpperCase()} - ${res?.orchestration?.decision?.reasoning?.slice(0, 100)}...`);
      await loadRecoveryData();
    } catch (err: any) {
      setSimulationResult(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleTriggerRetries = async () => {
    try {
      setExecutingRetries(true);
      setExecResult(null);
      const res = await triggerRunRetries();
      setExecResult(`Executed ${res.due_retries_executed_count} due retry attempt(s).`);
      await loadRecoveryData();
    } catch (err: any) {
      setExecResult(`Error triggering retries: ${err.message}`);
    } finally {
      setExecutingRetries(false);
    }
  };

  const getActionBadge = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'retry':
      case 'retry_later':
      case 'retry_now':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'notify':
      case 'notify_customer':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'escalate':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'write_off':
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
      default:
        return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    }
  };

  const getOutcomeBadge = (outcome: string) => {
    switch (outcome.toLowerCase()) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'failed':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      case 'pending':
      default:
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
    }
  };

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner Greeting */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-950/60 via-slate-900/80 to-purple-950/40 border border-indigo-500/20 p-8 shadow-2xl backdrop-blur-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Autonomous Orchestrator & Multi-Gateway Ready</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Revenue Recovery AI Dashboard
            </h1>
            <p className="mt-2 text-slate-300 text-sm max-w-2xl leading-relaxed">
              Real-time payment failure recovery orchestration powered by intelligent failure classification,
              autonomous rule-based dunning, and transparent AI agent reasoning synchronized with Supabase & Razorpay.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              id="test-connection-btn"
              onClick={() => {
                onRefresh();
                loadRecoveryData();
              }}
              disabled={loading || loadingData}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:scale-95 transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading || loadingData ? 'animate-spin' : ''}`} />
              <span>{loading || loadingData ? 'Syncing...' : 'Sync Live Data'}</span>
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
                FastAPI Backend & Autonomous Engine
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
              <span className="text-xs font-medium text-slate-400">Scheduler Status</span>
              <p className="mt-1 text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
                <Zap className="w-4 h-4" />
                Active (60s Polling)
              </p>
              <span className="text-[11px] text-slate-500">Autonomous retry worker</span>
            </div>
          </div>
        )}

        {/* Integration Statuses */}
        <div className="mt-6 border-t border-slate-800 pt-5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
            Active Connectors & Pipelines
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-medium text-slate-200">Razorpay Gateway</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {healthData?.features?.razorpay_configured ? 'Active & Verified' : 'Placeholder Ready'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-slate-200">Supabase Remote Sync</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {healthData?.features?.supabase_configured ? 'Connected & Live' : 'Offline / Local'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/40 border border-slate-800/60">
              <div className="flex items-center gap-2.5">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-medium text-slate-200">Orchestrator Agent</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                {healthData?.features?.gemini_agent_configured ? 'Decision Matrix Active' : 'Ready'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Payload Viewer Accordion */}
        <div className="mt-6 border-t border-slate-800 pt-4">
          <button
            id="toggle-raw-json-btn"
            onClick={() => setShowRawJson(!showRawJson)}
            className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
          >
            <Code2 className="w-4 h-4" />
            <span>{showRawJson ? 'Hide Raw System Health JSON' : 'Inspect System Health JSON'}</span>
            {showRawJson ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          {showRawJson && (
            <div className="mt-3 rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-emerald-300 overflow-x-auto">
              <pre>{JSON.stringify(healthData || { error: error || 'No data' }, null, 2)}</pre>
            </div>
          )}
        </div>
      </section>

      {/* Demo Simulation Bar */}
      <section className="rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950/30 to-slate-900 border border-indigo-500/30 p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-indigo-500/20 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-indigo-400" />
              Interactive Failure Simulator & Agent Trigger
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Trigger realistic payment failure events without real card declines. The Orchestrator will classify the error and execute rule-based dunning decisions.
            </p>
          </div>
          {simulating && (
            <div className="text-xs text-indigo-400 flex items-center gap-2 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Analyzing failure with Orchestrator Agent...</span>
            </div>
          )}
        </div>

        {simulationResult && (
          <div className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-200">
            <span className="font-semibold text-indigo-300">Latest Orchestrator Output: </span>
            {simulationResult}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <button
            onClick={() =>
              handleSimulate({
                name: 'Ananya Sharma',
                email: 'ananya@techcorp.in',
                amount: 499900,
                code: 'BAD_REQUEST_ERROR',
                desc: 'Account balance insufficient for invoice charge',
                reason: 'insufficient_funds',
              })
            }
            disabled={simulating}
            className="flex flex-col items-start p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer"
          >
            <span className="text-xs font-semibold text-sky-400 group-hover:text-sky-300">1. Insufficient Funds</span>
            <span className="text-[11px] text-slate-400 mt-1">INR 4,999.00</span>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Expect: retry_later (48h)</span>
          </button>

          <button
            onClick={() =>
              handleSimulate({
                name: 'Vikram Mehta',
                email: 'vikram@mehta-holdings.com',
                amount: 1250000,
                code: 'EXPIRED_CARD',
                desc: 'Card validity expired on 08/26',
                reason: 'expired_card',
              })
            }
            disabled={simulating}
            className="flex flex-col items-start p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-amber-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer"
          >
            <span className="text-xs font-semibold text-amber-400 group-hover:text-amber-300">2. Expired Card</span>
            <span className="text-[11px] text-slate-400 mt-1">INR 12,500.00</span>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Expect: notify_customer</span>
          </button>

          <button
            onClick={() =>
              handleSimulate({
                name: 'Rohan Gupta',
                email: 'rohan@startuply.io',
                amount: 899900,
                code: 'BANK_DECLINE',
                desc: 'Issuer decline: do_not_honor',
                reason: 'bank_decline',
              })
            }
            disabled={simulating}
            className="flex flex-col items-start p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-blue-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer"
          >
            <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300">3. Bank Decline</span>
            <span className="text-[11px] text-slate-400 mt-1">INR 8,999.00</span>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Expect: retry_later (6h)</span>
          </button>

          <button
            onClick={() =>
              handleSimulate({
                name: 'Pooja Iyer',
                email: 'pooja@cloudscale.net',
                amount: 349900,
                code: 'GATEWAY_TIMEOUT',
                desc: 'Upstream gateway network timed out during 3DS',
                reason: 'network_error',
              })
            }
            disabled={simulating}
            className="flex flex-col items-start p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer"
          >
            <span className="text-xs font-semibold text-indigo-400 group-hover:text-indigo-300">4. Network Timeout</span>
            <span className="text-[11px] text-slate-400 mt-1">INR 3,499.00</span>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Expect: retry_now (5-15m)</span>
          </button>

          <button
            onClick={() =>
              handleSimulate({
                name: 'Suspicious Entity',
                email: 'flagged_user@darkmail.ru',
                amount: 9999900,
                code: 'FRAUD_FLAG',
                desc: 'Risk engine high velocity score blacklist',
                reason: 'risk_block',
              })
            }
            disabled={simulating}
            className="flex flex-col items-start p-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-800/80 border border-slate-800 hover:border-rose-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer"
          >
            <span className="text-xs font-semibold text-rose-400 group-hover:text-rose-300">5. Risk & Fraud Block</span>
            <span className="text-[11px] text-slate-400 mt-1">INR 99,999.00</span>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Expect: escalate (manual)</span>
          </button>
        </div>
      </section>

      {/* Two Column Layout: Agent Transparency vs Retry Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Agent Transparency View */}
        <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-purple-400" />
                Agent Transparency & Reasoning
              </h2>
              <p className="text-xs text-slate-400">
                Auditable decision log from <code className="text-purple-300 font-mono">recovery_actions</code>
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/30 font-semibold">
              {actions.length} Decisions Logged
            </span>
          </div>

          <div className="space-y-3.5 overflow-y-auto max-h-[520px] pr-1">
            {actions.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No recovery agent actions recorded yet. Trigger a simulated failure above!
              </div>
            ) : (
              actions.map((act) => (
                <div
                  key={act.id}
                  className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 hover:border-slate-700 transition-all space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase border ${getActionBadge(
                          act.action_type
                        )}`}
                      >
                        {act.action_type}
                      </span>
                      {act.payment_id && (
                        <span className="text-xs font-mono text-slate-400 truncate max-w-[160px]">
                          {act.payment_id}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-500">
                      {new Date(act.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/40">
                    <span className="text-indigo-400 font-semibold">AI Reasoning: </span>
                    {act.agent_reasoning}
                  </p>

                  {act.amount !== undefined && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                      <span>Amount: <strong className="text-white">{act.currency} {act.amount?.toLocaleString()}</strong></span>
                      <span className="font-mono text-[10px] text-slate-500">ID: {act.id.slice(0, 8)}...</span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Smart Retry Schedule & Execution Queue */}
        <section className="rounded-2xl bg-slate-900/70 border border-slate-800 p-6 shadow-xl backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-sky-400" />
                Scheduled Retries & Execution Queue
              </h2>
              <p className="text-xs text-slate-400">
                Managed by <code className="text-sky-300 font-mono">retry_attempts</code> & 60s Scheduler
              </p>
            </div>
            <button
              onClick={handleTriggerRetries}
              disabled={executingRetries}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-200 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 transition-all cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3.5 h-3.5 ${executingRetries ? 'animate-spin' : ''}`} />
              <span>{executingRetries ? 'Executing...' : 'Run Due Retries'}</span>
            </button>
          </div>

          {execResult && (
            <div className="mb-3 p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300">
              {execResult}
            </div>
          )}

          <div className="space-y-3.5 overflow-y-auto max-h-[520px] pr-1">
            {retries.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-sm">
                No retry attempts in queue.
              </div>
            ) : (
              retries.map((r) => (
                <div
                  key={r.id}
                  className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-4 hover:border-slate-700 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white px-2 py-0.5 rounded bg-slate-800">
                        Attempt #{r.attempt_number}
                      </span>
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${getOutcomeBadge(
                          r.outcome
                        )}`}
                      >
                        {r.outcome.toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {r.method}
                    </span>
                  </div>

                  <div className="text-xs text-slate-300 grid grid-cols-2 gap-2 pt-1 border-t border-slate-900">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Scheduled For</span>
                      <span className="font-mono text-slate-200">
                        {new Date(r.scheduled_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase block">Executed At</span>
                      <span className="font-mono text-slate-200">
                        {r.executed_at ? new Date(r.executed_at).toLocaleTimeString() : 'Pending Execution'}
                      </span>
                    </div>
                  </div>

                  {r.payment_id && (
                    <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                      <span>Target: <code className="text-slate-300">{r.payment_id}</code></span>
                      {r.amount && <span>{r.currency} {r.amount}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* Metric Cards Summary */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-white">Recovery Performance Snapshot</h2>
            <p className="text-xs text-slate-400">Live indicators based on autonomous orchestrator decisions</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Recovered Revenue"
            value="INR 34,990"
            change="+28.4%"
            isPositive={true}
            subtitle="Recovered through smart retry rules"
            icon={<DollarSign className="w-5 h-5" />}
          />
          <MetricCard
            title="Recovery Success Rate"
            value="82.5%"
            change="+6.1%"
            isPositive={true}
            subtitle="Avg recovery rate for failed cards"
            icon={<TrendingUp className="w-5 h-5" />}
          />
          <MetricCard
            title="Agent Decisions"
            value={`${actions.length} Executed`}
            change="Active"
            isPositive={true}
            subtitle="Autonomous actions evaluated"
            icon={<Cpu className="w-5 h-5" />}
          />
          <MetricCard
            title="Active Retry Queue"
            value={`${retries.filter((r) => r.outcome === 'pending').length} Pending`}
            change="In Flight"
            isPositive={true}
            subtitle="Scheduled across 6h & 48h windows"
            icon={<Activity className="w-5 h-5" />}
          />
        </div>
      </div>
    </main>
  );
};
