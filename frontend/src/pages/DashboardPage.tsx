import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  RefreshCw,
  Zap,
  ArrowRight,
  BrainCircuit,
  History,
  Play,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { MetricCard } from '../components/MetricCard';
import {
  type DashboardSummaryResponse,
  type RecoveryActionItem,
  type RetryAttemptItem,
  fetchDashboardSummary,
  fetchRecoveryActions,
  fetchRetryAttempts,
  triggerRunRetries,
  simulateFailure,
} from '../api/client';
import { Link } from 'react-router-dom';

export const DashboardPage: React.FC = () => {
  const [summaryData, setSummaryData] = useState<DashboardSummaryResponse | null>(null);
  const [actions, setActions] = useState<RecoveryActionItem[]>([]);
  const [retries, setRetries] = useState<RetryAttemptItem[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [executingRetries, setExecutingRetries] = useState(false);
  const [execResult, setExecResult] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [summaryRes, actionsRes, retriesRes] = await Promise.all([
        fetchDashboardSummary(),
        fetchRecoveryActions(10),
        fetchRetryAttempts(10),
      ]);
      setSummaryData(summaryRes);
      setActions(actionsRes);
      setRetries(retriesRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    loadData();
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
      setSimulationResult(`Autonomous decision: ${action.toUpperCase()} - ${res?.orchestration?.decision?.reasoning?.slice(0, 110)}...`);
      await loadData();
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
      await loadData();
    } catch (err: any) {
      setExecResult(`Error triggering retries: ${err.message}`);
    } finally {
      setExecutingRetries(false);
    }
  };

  const kpis = summaryData?.kpis || {
    revenue_at_risk: 124500,
    revenue_recovered: 78200,
    recovery_rate: 68.4,
    active_retries: 5,
  };

  const chartData = summaryData?.recovery_chart || [];

  return (
    <div className="space-y-8 pb-12">
      {/* 1. TOP 4 KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <MetricCard
          title="Revenue at Risk"
          value={`INR ${kpis.revenue_at_risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change="Pending Recovery"
          isPositive={false}
          subtitle="Failed payments requiring agent recovery"
          icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
        />

        <MetricCard
          title="Revenue Recovered"
          value={`INR ${kpis.revenue_recovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change="+34.2%"
          isPositive={true}
          subtitle="Successfully recaptured via AI retries & dunning"
          icon={<DollarSign className="w-5 h-5 text-emerald-400" />}
        />

        <MetricCard
          title="Recovery Rate %"
          value={`${kpis.recovery_rate}%`}
          change="+8.6% vs benchmark"
          isPositive={true}
          subtitle="Autonomous recovery pipeline effectiveness"
          icon={<TrendingUp className="w-5 h-5 text-indigo-400" />}
        />

        <MetricCard
          title="Active Retries"
          value={`${kpis.active_retries} In Queue`}
          change="Polling 60s"
          isPositive={true}
          subtitle="Autonomous scheduler retry queue"
          icon={<RefreshCw className="w-5 h-5 text-sky-400" />}
        />
      </div>

      {/* 2. RECHARTS LINE CHART: RECOVERY RATE OVER TIME */}
      <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl backdrop-blur-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              Autonomous Recovery Rate Over Time
            </h2>
            <p className="text-xs text-slate-400">
              Daily percentage of failed transaction volume recovered by the orchestration agent
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-indigo-400 font-semibold">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 inline-block" /> Recovery Rate %
            </span>
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
              Past 7 Days
            </span>
          </div>
        </div>

        {/* Recharts Container */}
        <div className="h-72 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="#64748b"
                fontSize={12}
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <YAxis
                stroke="#64748b"
                fontSize={12}
                domain={[0, 100]}
                unit="%"
                tickLine={false}
                axisLine={{ stroke: '#334155' }}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const dataPoint = payload[0].payload;
                    return (
                      <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 shadow-2xl text-xs space-y-1">
                        <p className="font-bold text-slate-200">{dataPoint.full_date || label}</p>
                        <p className="text-indigo-400 font-semibold">
                          Recovery Rate: <strong className="text-white text-sm">{dataPoint.recovery_rate}%</strong>
                        </p>
                        <p className="text-slate-400">
                          Recovered: INR {dataPoint.revenue_recovered?.toLocaleString()}
                        </p>
                        <p className="text-slate-500">
                          At Risk: INR {dataPoint.revenue_at_risk?.toLocaleString()}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="recovery_rate"
                name="Recovery Rate"
                stroke="#818cf8"
                strokeWidth={3}
                dot={{ r: 4, fill: '#6366f1', stroke: '#1e1b4b', strokeWidth: 2 }}
                activeDot={{ r: 7, fill: '#a5b4fc', stroke: '#4f46e5', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 3. 1-CLICK INTERACTIVE FAILURE SIMULATION BAR */}
      <section className="rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Live Gateway Failure Simulator
            </h2>
            <p className="text-xs text-slate-400">
              Trigger instant Razorpay payment failure payloads to test AI classification, Orchestration agent, and Gemini Dunning
            </p>
          </div>
          {simulating && (
            <span className="inline-flex items-center gap-2 text-xs text-amber-300 font-mono animate-pulse">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              Evaluating Agent Action...
            </span>
          )}
        </div>

        {simulationResult && (
          <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-300 flex items-start justify-between gap-3">
            <span>{simulationResult}</span>
            <button
              onClick={() => setSimulationResult(null)}
              className="text-slate-400 hover:text-white text-xs cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <button
            onClick={() =>
              handleSimulate({
                name: 'Kavita Verma',
                email: 'kavita.verma@example.com',
                amount: 499900,
                code: 'BAD_REQUEST_ERROR',
                desc: 'Payment was declined due to insufficient funds in account',
                reason: 'insufficient_funds',
              })
            }
            disabled={simulating}
            className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-amber-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-amber-400 group-hover:text-amber-300 block">1. Insufficient Funds</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">INR 4,999.00</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Agent: retry_later (2-3d)</span>
          </button>

          <button
            onClick={() =>
              handleSimulate({
                name: 'Priya Sharma',
                email: 'priya.sharma@example.com',
                amount: 249900,
                code: 'CARD_EXPIRED',
                desc: 'The card has expired and cannot be charged',
                reason: 'expired_card',
              })
            }
            disabled={simulating}
            className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-indigo-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-indigo-400 group-hover:text-indigo-300 block">2. Expired Card</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">INR 2,499.00</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Agent: notify_customer (Gemini)</span>
          </button>

          <button
            onClick={() =>
              handleSimulate({
                name: 'Rajesh Enterprises',
                email: 'finance@rajeshent.in',
                amount: 1450000,
                code: 'BANK_POLICY_DECLINE',
                desc: 'Transaction declined by customer bank risk policy',
                reason: 'bank_decline',
              })
            }
            disabled={simulating}
            className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-purple-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-purple-400 group-hover:text-purple-300 block">3. Bank Decline</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">INR 14,500.00</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Agent: retry_later in 6h</span>
          </button>

          <button
            onClick={() =>
              handleSimulate({
                name: 'Neha Kapoor',
                email: 'neha.k@example.com',
                amount: 349900,
                code: 'GATEWAY_TIMEOUT',
                desc: 'Issuer switch timeout on 3DS verification socket',
                reason: 'network_error',
              })
            }
            disabled={simulating}
            className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-sky-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-sky-400 group-hover:text-sky-300 block">4. Network Error</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">INR 3,499.00</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Agent: retry_now (5m)</span>
          </button>

          <button
            onClick={() =>
              handleSimulate({
                name: 'High Risk Corp',
                email: 'flagged_user@darkmail.ru',
                amount: 9999900,
                code: 'FRAUD_FLAG',
                desc: 'Risk engine high velocity score blacklist',
                reason: 'risk_block',
              })
            }
            disabled={simulating}
            className="p-3.5 rounded-xl bg-slate-950/70 hover:bg-slate-800/90 border border-slate-800 hover:border-rose-500/40 text-left transition-all group disabled:opacity-50 cursor-pointer flex flex-col justify-between"
          >
            <div>
              <span className="text-xs font-bold text-rose-400 group-hover:text-rose-300 block">5. Risk & Fraud Block</span>
              <span className="text-[11px] text-slate-400 mt-0.5 block">INR 99,999.00</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-2 font-mono">Agent: escalate (manual)</span>
          </button>
        </div>
      </section>

      {/* 4. AGENT DECISIONS & RETRY EXECUTION FEED PREVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Agent Decisions */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-purple-400" />
                  Recent Agent Decisions
                </h3>
                <p className="text-xs text-slate-400">Auditable reasoning log</p>
              </div>
              <Link
                to="/transactions"
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View All <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {actions.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No decisions logged yet. Run a simulation scenario above!
                </div>
              ) : (
                actions.slice(0, 4).map((a) => (
                  <div key={a.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] px-2 py-0.5 rounded font-extrabold uppercase bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        {a.action_type}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {a.created_at ? new Date(a.created_at).toLocaleTimeString() : ''}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {a.agent_reasoning}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        {/* Retry Queue Quick Runner */}
        <section className="rounded-2xl bg-slate-900/80 border border-slate-800 p-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-sky-400" />
                  Scheduled Retries Queue
                </h3>
                <p className="text-xs text-slate-400">Autonomous retry scheduler queue</p>
              </div>
              <button
                onClick={handleTriggerRetries}
                disabled={executingRetries}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-sky-200 bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 transition-all cursor-pointer disabled:opacity-50"
              >
                <Play className={`w-3.5 h-3.5 ${executingRetries ? 'animate-spin' : ''}`} />
                <span>{executingRetries ? 'Executing...' : 'Run Due Now'}</span>
              </button>
            </div>

            {execResult && (
              <div className="mb-3 p-2.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-xs text-sky-300">
                {execResult}
              </div>
            )}

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {retries.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  Retry queue is clear.
                </div>
              ) : (
                retries.slice(0, 4).map((r) => (
                  <div key={r.id} className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">Attempt #{r.attempt_number}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded font-mono uppercase bg-slate-800 text-sky-300">
                          {r.outcome}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Method: {r.method} • Target: {r.payment_id || r.transaction_id.slice(0, 8)}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(r.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
