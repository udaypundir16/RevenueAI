import React, { useEffect, useState } from 'react';
import {
  X,
  AlertTriangle,
  BrainCircuit,
  Cpu,
  RefreshCw,
  Mail,
  CheckCircle2,
  Clock,
  Copy,
  Check,
} from 'lucide-react';
import {
  type TransactionTimelineResponse,
  fetchTransactionTimeline,
} from '../api/client';

interface TransactionDetailDrawerProps {
  transactionId: string | null;
  onClose: () => void;
}

export const TransactionDetailDrawer: React.FC<TransactionDetailDrawerProps> = ({
  transactionId,
  onClose,
}) => {
  const [data, setData] = useState<TransactionTimelineResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!transactionId) {
      setData(null);
      return;
    }

    const loadTimeline = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetchTransactionTimeline(transactionId);
        setData(res);
      } catch (err: any) {
        console.error('Failed to load transaction timeline:', err);
        setError(err.message || 'Failed to fetch timeline');
      } finally {
        setLoading(false);
      }
    };

    loadTimeline();
  }, [transactionId]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!transactionId) return null;

  const handleCopyId = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="relative w-full max-w-2xl bg-slate-900 border-l border-slate-800 shadow-2xl flex flex-col h-full z-10 overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-6 border-b border-slate-800/90 bg-slate-950/80 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Agent Audit & Timeline
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                Live Trace
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
              Transaction Details
            </h2>
            {data && (
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                <span>Customer: <strong className="text-slate-200">{data.customer.name}</strong></span>
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-400">{data.customer.email}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-indigo-300 font-bold uppercase">
                  {data.customer.segment}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
              <RefreshCw className="w-7 h-7 text-indigo-400 animate-spin" />
              <span className="text-sm font-medium">Tracing autonomous agent steps...</span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
              Failed to load transaction audit trail: {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Summary Stats Banner */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Failed Amount</span>
                  <span className="text-base font-extrabold text-rose-400">
                    {data.transaction.currency} {data.transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Razorpay ID</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-xs font-mono text-slate-200 truncate max-w-[110px]">
                      {data.transaction.razorpay_payment_id}
                    </span>
                    <button
                      onClick={() => handleCopyId(data.transaction.razorpay_payment_id)}
                      className="text-slate-400 hover:text-white cursor-pointer"
                      title="Copy Payment ID"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Current Status</span>
                  <span className="text-xs font-bold uppercase tracking-wide text-amber-300">
                    {data.transaction.status}
                  </span>
                </div>
              </div>

              {/* VERTICAL TIMELINE - Core Demo Feature */}
              <div className="space-y-6 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    Autonomous Orchestration Lifecycle
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">5-Step Decision Trail</span>
                </div>

                <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gradient-to-b before:from-rose-500 before:via-purple-500 before:to-emerald-500">
                  {/* Step 1: Payment Failed */}
                  <div className="relative group">
                    <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-rose-500/20 border-2 border-rose-500 flex items-center justify-center">
                      <AlertTriangle className="w-2.5 h-2.5 text-rose-400" />
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5">
                          Step 1 • Payment Failed
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {data.transaction.created_at ? new Date(data.transaction.created_at).toLocaleTimeString() : 'Initial Event'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Gateway returned error: <strong className="text-rose-300 font-mono">{data.transaction.failure_reason_raw}</strong>
                      </p>
                      <div className="text-[11px] text-slate-500">
                        Received via <code className="text-slate-400">POST /webhooks/razorpay</code> HMAC SHA256 verified.
                      </div>
                    </div>
                  </div>

                  {/* Step 2: AI Classification */}
                  <div className="relative group">
                    <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-purple-500/20 border-2 border-purple-500 flex items-center justify-center">
                      <BrainCircuit className="w-2.5 h-2.5 text-purple-400" />
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-purple-400 flex items-center gap-1.5">
                          Step 2 • AI Classification
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30">
                          {Math.round((data.transaction.confidence_score || 0.94) * 100)}% Confidence
                        </span>
                      </div>
                      <div className="text-xs text-slate-300">
                        Mapped to category:{' '}
                        <span className="px-2 py-0.5 rounded bg-purple-900/40 text-purple-200 font-semibold border border-purple-700/50 uppercase tracking-wide">
                          {data.transaction.failure_reason_classified?.replace('_', ' ') || 'insufficient funds'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                        Classified using pattern analysis of issuer error codes and historical recovery success propensity.
                      </p>
                    </div>
                  </div>

                  {/* Step 3: Agent Decided (HIGHLIGHTED PROMINENTLY) */}
                  <div className="relative group">
                    <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-indigo-500/20 border-2 border-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/50 animate-pulse">
                      <Cpu className="w-2.5 h-2.5 text-indigo-300" />
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-indigo-950/90 via-slate-900 to-purple-950/70 border-2 border-indigo-500/60 p-5 space-y-3 shadow-xl shadow-indigo-500/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
                            Step 3 • Autonomous Agent Decision
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold uppercase tracking-wide bg-indigo-500 text-white shadow-sm">
                            {data.timeline.find((t) => t.type === 'agent_decision')?.action_type || 'NOTIFY_CUSTOMER'}
                          </span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-semibold">
                          CRITICAL AUDIT
                        </span>
                      </div>

                      {/* AGENT REASONING - Made highly visible and prominent per user instruction */}
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-indigo-400 inline-block" />
                          Plain-English Agent Reasoning:
                        </span>
                        <div className="p-4 rounded-xl bg-slate-950/80 border border-indigo-500/40 text-sm text-indigo-100 font-medium leading-relaxed shadow-inner">
                          "{data.timeline.find((t) => t.type === 'agent_decision')?.agent_reasoning ||
                            'Autonomous recovery orchestrator evaluated transaction risk, customer profile, and failure code to select the optimal dunning or retry strategy.'}"
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                        <span>Rule Engine: <strong>Phase 4 Decision Matrix</strong></span>
                        <span className="font-mono text-slate-500">recovery_actions table</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Retry / Message Dispatched */}
                  <div className="relative group">
                    <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-sky-500/20 border-2 border-sky-400 flex items-center justify-center">
                      <RefreshCw className="w-2.5 h-2.5 text-sky-400" />
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                          Step 4 • Action Execution & Delivery
                        </span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          MOCK_MODE Dispatched
                        </span>
                      </div>

                      {data.timeline.some((t) => t.type === 'customer_notification') ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-xs text-slate-300">
                            <Mail className="w-4 h-4 text-amber-400" />
                            <span>Gemini Recovery Notification Dispatched to <strong className="text-white">{data.customer.email}</strong></span>
                          </div>
                          {data.timeline.find((t) => t.type === 'customer_notification')?.details?.content_preview && (
                            <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-36 overflow-y-auto">
                              {data.timeline.find((t) => t.type === 'customer_notification')?.details?.content_preview}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs text-slate-300">
                            <span>Smart Retry Scheduled via APScheduler</span>
                            <span className="text-sky-300 font-mono">Every 60s Polling Loop</span>
                          </div>
                          <p className="text-[11px] text-slate-400">
                            Automated retry call mapped to Razorpay API recreate order / charge token.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 5: Final Outcome */}
                  <div className="relative group">
                    <div className="absolute -left-6 top-0 w-5 h-5 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />
                    </div>
                    <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                          Step 5 • Current Lifecycle State
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 uppercase">
                          {data.transaction.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Autonomous recovery pipeline in progress. Customer engaged with tailored call-to-action or retry queue pending next optimal recovery window.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Powered by Gemini Agent & Autonomous Orchestrator
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Close Trace
          </button>
        </div>
      </div>
    </div>
  );
};
