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
  Sparkles,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  Send,
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
import { TransactionDetailDrawer } from '../components/TransactionDetailDrawer';
import {
  type DashboardSummaryResponse,
  type RecoveryActionItem,
  type RetryAttemptItem,
  type DemoSimulationResponse,
  fetchDashboardSummary,
  fetchRecoveryActions,
  fetchRetryAttempts,
  triggerRunRetries,
  simulateFailure,
  runDemoSimulation,
} from '../api/client';
import { Link } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';

export const DashboardPage: React.FC = () => {
  const { theme } = useTheme();
  const [summaryData, setSummaryData] = useState<DashboardSummaryResponse | null>(null);
  const [actions, setActions] = useState<RecoveryActionItem[]>([]);
  const [retries, setRetries] = useState<RetryAttemptItem[]>([]);
  const [simulating, setSimulating] = useState(false);
  const [simulationResult, setSimulationResult] = useState<string | null>(null);
  const [executingRetries, setExecutingRetries] = useState(false);
  const [execResult, setExecResult] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [streamCount, setStreamCount] = useState<number>(5);
  const [runningStream, setRunningStream] = useState<boolean>(false);
  const [streamResponse, setStreamResponse] = useState<DemoSimulationResponse | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setDataLoading(true);
      setDashboardError(null);
      const [summaryRes, actionsRes, retriesRes] = await Promise.all([
        fetchDashboardSummary(),
        fetchRecoveryActions(10),
        fetchRetryAttempts(10),
      ]);
      setSummaryData(summaryRes);
      setActions(actionsRes);
      setRetries(retriesRes);
    } catch (err: any) {
      console.error('Failed to load dashboard data:', err);
      setDashboardError(err.message || 'Failed to connect to backend service');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSimulate = async (scenario: {
    name: string; email: string; amount: number;
    code: string; desc: string; reason: string; segment?: string;
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
      setSimulationResult(`Decision: ${action.toUpperCase()} — ${res?.orchestration?.decision?.reasoning?.slice(0, 120)}...`);
      await loadData();
    } catch (err: any) {
      setSimulationResult(`Simulation failed: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  const handleRunDemoStream = async () => {
    try {
      setRunningStream(true);
      setStreamError(null);
      const res = await runDemoSimulation(streamCount, 0.4);
      setStreamResponse(res);
      await loadData();
    } catch (err: any) {
      setStreamError(err.message || 'Simulation failed');
    } finally {
      setRunningStream(false);
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
      setExecResult(`Error: ${err.message}`);
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

  // Chart colors based on theme
  const gridColor = theme === 'dark' ? '#1f1f1f' : '#e4e4e7';
  const axisColor = theme === 'dark' ? '#555' : '#aaa';

  const getActionBadgeStyle = (action: string): React.CSSProperties => {
    if (action === 'retry_later' || action === 'retry_now') return { background: 'var(--sky-muted)', color: 'var(--sky)', border: '1px solid var(--sky-border)' };
    if (action === 'notify_customer') return { background: 'var(--purple-muted)', color: 'var(--purple)', border: '1px solid var(--purple-border)' };
    if (action === 'escalate') return { background: 'var(--danger-muted)', color: 'var(--danger)', border: '1px solid var(--danger-border)' };
    return { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' };
  };

  return (
    <div className="space-y-7 pb-12">
      {/* Error Alert */}
      {dashboardError && (
        <div className="p-4 rounded-xl th-alert-danger flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{dashboardError}</span>
          </div>
          <button onClick={loadData} className="th-btn-ghost px-3 py-1 text-xs font-semibold">
            Retry
          </button>
        </div>
      )}

      {/* Status Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: 'var(--success)' }} />
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Autonomous Pipeline:{' '}
            <strong style={{ color: 'var(--success)' }}>Online & Active</strong>
          </span>
        </div>
        {dataLoading && (
          <span className="inline-flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--accent-hover)' }}>
            <RefreshCw className="w-3 h-3 animate-spin" />
            Syncing...
          </span>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Revenue at Risk"
          value={`INR ${kpis.revenue_at_risk.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change="Pending Recovery"
          isPositive={false}
          subtitle="Failed payments requiring agent recovery"
          icon={<AlertTriangle className="w-4 h-4" style={{ color: 'var(--danger)' }} />}
        />
        <MetricCard
          title="Revenue Recovered"
          value={`INR ${kpis.revenue_recovered.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          change="+34.2%"
          isPositive={true}
          subtitle="Successfully recaptured via AI retries & dunning"
          icon={<DollarSign className="w-4 h-4" style={{ color: 'var(--success)' }} />}
        />
        <MetricCard
          title="Recovery Rate"
          value={`${kpis.recovery_rate}%`}
          change="+8.6% vs benchmark"
          isPositive={true}
          subtitle="Autonomous recovery pipeline effectiveness"
          icon={<TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-hover)' }} />}
        />
        <MetricCard
          title="Active Retries"
          value={`${kpis.active_retries} In Queue`}
          change="Polling 60s"
          isPositive={true}
          subtitle="Autonomous scheduler retry queue"
          icon={<RefreshCw className="w-4 h-4" style={{ color: 'var(--sky)' }} />}
        />
      </div>

      {/* Demo Simulation Stream */}
      <section
        className="th-section p-6 space-y-5"
        style={{
          background: 'var(--bg-surface)',
          borderColor: 'var(--accent-border)',
        }}
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold"
              style={{
                background: 'var(--accent-muted)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent-hover)',
              }}
            >
              <Sparkles className="w-3 h-3" />
              Interactive Demo Suite
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Autonomous Recovery Pipeline Streamer
            </h2>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Generate a burst of varied Razorpay payment failure events and watch the autonomous lifecycle unfold:{' '}
              <span style={{ color: 'var(--accent-hover)' }} className="font-medium">
                Failure Ingestion → AI Classification → Orchestrator Decision → Smart Dunning / Retries
              </span>
            </p>
          </div>

          <div
            className="flex flex-wrap items-center gap-3 p-3 rounded-xl shrink-0"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Events:</span>
              <div
                className="flex rounded-lg p-0.5"
                style={{ background: 'var(--bg-base)', border: '1px solid var(--border-default)' }}
              >
                {[3, 5, 8].map((count) => (
                  <button
                    key={count}
                    onClick={() => setStreamCount(count)}
                    disabled={runningStream}
                    className="px-2.5 py-1 text-xs font-semibold rounded-md cursor-pointer transition-all"
                    style={
                      streamCount === count
                        ? { background: 'var(--accent)', color: '#fff' }
                        : { color: 'var(--text-tertiary)' }
                    }
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleRunDemoStream}
              disabled={runningStream}
              id="run-demo-simulation-button"
              className="th-btn-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              {runningStream ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Simulating {streamCount} Events...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  Run Demo Simulation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Running Banner */}
        {runningStream && (
          <div
            className="p-4 rounded-xl flex items-center gap-3 animate-pulse"
            style={{
              background: 'var(--accent-muted)',
              border: '1px solid var(--accent-border)',
            }}
          >
            <RefreshCw className="w-5 h-5 animate-spin shrink-0" style={{ color: 'var(--accent-hover)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                Streaming {streamCount} payment failures into pipeline...
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                Dispatching webhook payloads, triggering AI classifications, orchestrating recovery decisions.
              </p>
            </div>
          </div>
        )}

        {/* Stream Error */}
        {streamError && (
          <div className="p-4 rounded-xl th-alert-danger flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{streamError}</span>
            </div>
            <button
              onClick={() => setStreamError(null)}
              className="text-xs underline cursor-pointer"
              style={{ color: 'var(--text-secondary)' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Stream Results */}
        {streamResponse && streamResponse.transactions && (
          <div className="space-y-3 pt-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Complete: {streamResponse.total_simulated} transactions ingested
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>Risk: <strong style={{ color: 'var(--text-primary)' }}>INR {streamResponse.summary.total_at_risk_added.toLocaleString()}</strong></span>
                <span>Retries: <strong style={{ color: 'var(--sky)' }}>{(streamResponse.summary.action_counts.retry_later || 0) + (streamResponse.summary.action_counts.retry_now || 0)}</strong></span>
                <span>Dunning: <strong style={{ color: 'var(--purple)' }}>{streamResponse.summary.action_counts.notify_customer || 0}</strong></span>
                <span>Escalated: <strong style={{ color: 'var(--danger)' }}>{streamResponse.summary.action_counts.escalate || 0}</strong></span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {streamResponse.transactions.map((tx) => (
                <div
                  key={tx.payment_id}
                  onClick={() => tx.transaction_id && setSelectedTxId(tx.transaction_id)}
                  className="th-card p-3.5 cursor-pointer flex flex-col justify-between space-y-2"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                        #{tx.step} {tx.customer}
                      </span>
                      <span
                        className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
                        style={getActionBadgeStyle(tx.action)}
                      >
                        {tx.action.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                      <span>INR {tx.amount.toLocaleString()}</span>
                      <span
                        className="px-1.5 py-0.5 rounded font-mono text-[10px]"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--accent-hover)', border: '1px solid var(--border-default)' }}
                      >
                        {tx.segment}
                      </span>
                    </div>
                    <div className="text-[11px] font-mono" style={{ color: 'var(--warning)' }}>
                      {tx.failure_reason_classified}
                    </div>
                    <p
                      className="text-[11px] italic line-clamp-2 p-2 rounded-lg"
                      style={{
                        background: 'var(--bg-elevated)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      "{tx.reasoning}"
                    </p>
                  </div>

                  <div
                    className="flex items-center justify-between pt-1.5 text-[10px]"
                    style={{ borderTop: '1px solid var(--border-subtle)' }}
                  >
                    {tx.has_message ? (
                      <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--purple)' }}>
                        <Send className="w-3 h-3" /> Dunning Dispatched
                      </span>
                    ) : tx.retry_scheduled ? (
                      <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--sky)' }}>
                        <RefreshCw className="w-3 h-3" /> Retry Scheduled
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-semibold" style={{ color: 'var(--danger)' }}>
                        <ShieldAlert className="w-3 h-3" /> Escalate
                      </span>
                    )}
                    <span className="flex items-center gap-0.5 font-medium" style={{ color: 'var(--accent-hover)' }}>
                      Timeline <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <Link
                to="/transactions"
                className="inline-flex items-center gap-1 text-xs font-semibold"
                style={{ color: 'var(--accent-hover)' }}
              >
                View All in Transactions <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}
      </section>

      {/* Recovery Rate Chart */}
      <section className="th-section p-6 space-y-4">
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--accent-hover)' }} />
              Recovery Rate Over Time
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Daily recovery percentage — autonomous orchestration effectiveness
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color: 'var(--accent-hover)' }}>
              <span className="w-2 h-2 rounded-full inline-block" style={{ background: 'var(--accent)' }} />
              Recovery Rate %
            </span>
            <span
              className="text-[11px] px-2.5 py-1 rounded-full font-mono"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-tertiary)',
                border: '1px solid var(--border-default)',
              }}
            >
              Past 7 Days
            </span>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis
                dataKey="date"
                stroke={axisColor}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke={axisColor}
                fontSize={11}
                domain={[0, 100]}
                unit="%"
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div
                        className="rounded-xl p-3 text-xs space-y-1"
                        style={{
                          background: 'var(--bg-surface)',
                          border: '1px solid var(--border-default)',
                          boxShadow: 'var(--shadow-md)',
                        }}
                      >
                        <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>{d.full_date || label}</p>
                        <p style={{ color: 'var(--accent-hover)' }}>
                          Recovery: <strong style={{ color: 'var(--text-primary)' }}>{d.recovery_rate}%</strong>
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }}>Recovered: INR {d.revenue_recovered?.toLocaleString()}</p>
                        <p style={{ color: 'var(--text-tertiary)' }}>At Risk: INR {d.revenue_at_risk?.toLocaleString()}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Line
                type="monotone"
                dataKey="recovery_rate"
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={{ r: 3.5, fill: 'var(--accent)', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: 'var(--accent-hover)', stroke: 'var(--bg-surface)', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Quick Failure Triggers */}
      <section
        className="th-section p-6 space-y-4"
      >
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Zap className="w-4 h-4" style={{ color: 'var(--warning)' }} />
              Quick Single Failure Trigger
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              Fire individual Razorpay failure payloads to test specific error codes and agent rules
            </p>
          </div>
          {simulating && (
            <span className="inline-flex items-center gap-1.5 text-xs font-mono" style={{ color: 'var(--warning)' }}>
              <RefreshCw className="w-3 h-3 animate-spin" /> Evaluating...
            </span>
          )}
        </div>

        {simulationResult && (
          <div className="p-3.5 rounded-xl th-alert-accent flex items-start justify-between gap-3">
            <span className="text-xs">{simulationResult}</span>
            <button
              onClick={() => setSimulationResult(null)}
              className="text-xs cursor-pointer shrink-0"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ✕
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { label: 'Insufficient Funds', amount: 'INR 4,999', segment: 'B2C', note: 'retry_later (2–3d)', color: 'var(--warning)', scenario: { name: 'Kavita Verma', email: 'kavita.verma@example.com', amount: 499900, code: 'BAD_REQUEST_ERROR', desc: 'Payment was declined due to insufficient funds in account', reason: 'insufficient_funds' } },
            { label: 'Expired Card', amount: 'INR 2,499', segment: 'B2C', note: 'notify_customer', color: 'var(--accent-hover)', scenario: { name: 'Priya Sharma', email: 'priya.sharma@example.com', amount: 249900, code: 'CARD_EXPIRED', desc: 'The card has expired and cannot be charged', reason: 'expired_card' } },
            { label: 'Bank Decline', amount: 'INR 14,500', segment: 'B2B', note: 'retry_later (6h)', color: 'var(--purple)', scenario: { name: 'Rajesh Enterprises', email: 'finance@rajeshent.in', amount: 1450000, code: 'BANK_POLICY_DECLINE', desc: 'Transaction declined by customer bank risk policy', reason: 'bank_decline' } },
            { label: 'Network Error', amount: 'INR 3,499', segment: 'B2C', note: 'retry_now (5m)', color: 'var(--sky)', scenario: { name: 'Neha Kapoor', email: 'neha.k@example.com', amount: 349900, code: 'GATEWAY_TIMEOUT', desc: 'Issuer switch timeout on 3DS verification socket', reason: 'network_error' } },
            { label: 'Risk & Fraud Block', amount: 'INR 99,999', segment: 'Escalate', note: 'escalate (manual)', color: 'var(--danger)', scenario: { name: 'DarkWeb Blacklisted', email: 'flagged_user@darkmail.ru', amount: 9999900, code: 'FRAUD_FLAG', desc: 'Risk engine high velocity score blacklist', reason: 'risk_block' } },
          ].map((item, i) => (
            <button
              key={i}
              onClick={() => handleSimulate(item.scenario)}
              disabled={simulating || runningStream}
              className="th-card p-4 text-left flex flex-col justify-between h-full cursor-pointer disabled:opacity-50"
              style={{ minHeight: 90 }}
            >
              <div>
                <span className="text-xs font-bold block" style={{ color: item.color }}>
                  {i + 1}. {item.label}
                </span>
                <span className="text-[11px] mt-1 block" style={{ color: 'var(--text-tertiary)' }}>
                  {item.amount} · {item.segment}
                </span>
              </div>
              <span className="text-[10px] mt-2 font-mono" style={{ color: 'var(--text-disabled)' }}>
                {item.note}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Agent Decisions & Retry Queue */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Decisions */}
        <section className="th-section p-6 flex flex-col">
          <div
            className="flex items-center justify-between pb-4 mb-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <BrainCircuit className="w-4 h-4" style={{ color: 'var(--purple)' }} />
                Recent Agent Decisions
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Auditable reasoning log</p>
            </div>
            <Link
              to="/transactions"
              className="text-xs font-semibold flex items-center gap-1"
              style={{ color: 'var(--accent-hover)' }}
            >
              View All <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 flex-1">
            {actions.length === 0 ? (
              <div className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                No decisions yet — run the demo simulation above.
              </div>
            ) : (
              actions.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  onClick={() => a.transaction_id && setSelectedTxId(a.transaction_id)}
                  className="th-card p-3.5 cursor-pointer space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="text-[10px] px-2 py-0.5 rounded font-bold uppercase"
                      style={{ background: 'var(--purple-muted)', color: 'var(--purple)', border: '1px solid var(--purple-border)' }}
                    >
                      {a.action_type}
                    </span>
                    <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {a.created_at ? new Date(a.created_at).toLocaleTimeString() : ''}
                    </span>
                  </div>
                  <p className="text-xs line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {a.agent_reasoning}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Retry Queue */}
        <section className="th-section p-6 flex flex-col">
          <div
            className="flex items-center justify-between pb-4 mb-4"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}
          >
            <div>
              <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <History className="w-4 h-4" style={{ color: 'var(--sky)' }} />
                Scheduled Retries Queue
              </h3>
              <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Autonomous retry scheduler</p>
            </div>
            <button
              onClick={handleTriggerRetries}
              disabled={executingRetries}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50"
              style={{
                background: 'var(--sky-muted)',
                color: 'var(--sky)',
                border: '1px solid var(--sky-border)',
              }}
            >
              <Play className={`w-3.5 h-3.5 ${executingRetries ? 'animate-spin' : ''}`} />
              {executingRetries ? 'Executing...' : 'Run Due Now'}
            </button>
          </div>

          {execResult && (
            <div className="mb-3 p-2.5 rounded-lg th-alert-accent text-xs">{execResult}</div>
          )}

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 flex-1">
            {retries.length === 0 ? (
              <div className="text-center py-8 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                Retry queue is clear.
              </div>
            ) : (
              retries.slice(0, 4).map((r) => (
                <div
                  key={r.id}
                  onClick={() => r.transaction_id && setSelectedTxId(r.transaction_id)}
                  className="th-card p-3.5 cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                        Attempt #{r.attempt_number}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-mono uppercase"
                        style={{ background: 'var(--sky-muted)', color: 'var(--sky)', border: '1px solid var(--sky-border)' }}
                      >
                        {r.outcome}
                      </span>
                    </div>
                    <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      {r.method} · {r.payment_id || r.transaction_id.slice(0, 8)}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    {new Date(r.scheduled_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      <TransactionDetailDrawer
        transactionId={selectedTxId}
        onClose={() => setSelectedTxId(null)}
      />
    </div>
  );
};
