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
        className="fixed inset-0 th-drawer-backdrop transition-opacity"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div
        className="relative w-full max-w-2xl flex flex-col h-full z-10 animate-slide-in-right"
        style={{
          background: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="px-6 py-5 flex items-start justify-between shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-[10px] font-bold uppercase tracking-wider"
                style={{ color: 'var(--accent-hover)' }}
              >
                Agent Audit & Timeline
              </span>
              <span
                className="text-[10px] px-2 py-0.5 rounded-full font-mono"
                style={{
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-default)',
                }}
              >
                Live Trace
              </span>
            </div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Transaction Details
            </h2>
            {data && (
              <div className="flex items-center gap-2 mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                <span>
                  <strong style={{ color: 'var(--text-primary)' }}>{data.customer.name}</strong>
                </span>
                <span>•</span>
                <span className="font-mono text-[11px]">{data.customer.email}</span>
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded font-bold uppercase"
                  style={{
                    background: 'var(--accent-muted)',
                    color: 'var(--accent-hover)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  {data.customer.segment}
                </span>
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="th-btn-ghost p-2 rounded-xl"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-hover)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Tracing agent steps...
              </span>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl th-alert-danger text-sm">
              Failed to load audit trail: {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Summary Banner */}
              <div
                className="grid grid-cols-3 gap-3 p-4 rounded-xl"
                style={{
                  background: 'var(--bg-elevated)',
                  border: '1px solid var(--border-default)',
                }}
              >
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Failed Amount
                  </span>
                  <span className="text-sm font-bold" style={{ color: 'var(--danger)' }}>
                    {data.transaction.currency}{' '}
                    {data.transaction.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Razorpay ID
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono truncate max-w-[100px]" style={{ color: 'var(--text-primary)' }}>
                      {data.transaction.razorpay_payment_id}
                    </span>
                    <button
                      onClick={() => handleCopyId(data.transaction.razorpay_payment_id)}
                      className="shrink-0"
                      style={{ color: 'var(--text-tertiary)' }}
                      title="Copy Payment ID"
                    >
                      {copied ? (
                        <Check className="w-3 h-3" style={{ color: 'var(--success)' }} />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-medium block mb-1" style={{ color: 'var(--text-tertiary)' }}>
                    Status
                  </span>
                  <span className="text-xs font-bold uppercase" style={{ color: 'var(--warning)' }}>
                    {data.transaction.status}
                  </span>
                </div>
              </div>

              {/* Vertical Timeline */}
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                    <Clock className="w-3.5 h-3.5" style={{ color: 'var(--accent-hover)' }} />
                    Orchestration Lifecycle
                  </h3>
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    5-Step Decision Trail
                  </span>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-3 before:bottom-3 before:w-px"
                  style={{ '--tw-content': '', borderLeftColor: 'transparent' } as React.CSSProperties}
                >
                  {/* Timeline line */}
                  <div
                    className="absolute left-[7px] top-3 bottom-3 w-px"
                    style={{
                      background: 'linear-gradient(to bottom, var(--danger), var(--purple), var(--accent-hover), var(--sky), var(--success))',
                      opacity: 0.5,
                    }}
                  />

                  {/* Step 1: Payment Failed */}
                  {renderTimelineStep({
                    color: 'var(--danger)',
                    dotBg: 'var(--danger-muted)',
                    icon: <AlertTriangle className="w-2.5 h-2.5" style={{ color: 'var(--danger)' }} />,
                    label: 'Step 1 • Payment Failed',
                    labelColor: 'var(--danger)',
                    timestamp: data.transaction.created_at
                      ? new Date(data.transaction.created_at).toLocaleTimeString()
                      : 'Initial Event',
                    content: (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Gateway error:{' '}
                        <strong className="font-mono" style={{ color: 'var(--danger)' }}>
                          {data.transaction.failure_reason_raw}
                        </strong>
                      </p>
                    ),
                    footnote: 'Received via POST /webhooks/razorpay — HMAC SHA256 verified.',
                  })}

                  {/* Step 2: AI Classification */}
                  {renderTimelineStep({
                    color: 'var(--purple)',
                    dotBg: 'var(--purple-muted)',
                    icon: <BrainCircuit className="w-2.5 h-2.5" style={{ color: 'var(--purple)' }} />,
                    label: 'Step 2 • AI Classification',
                    labelColor: 'var(--purple)',
                    badge: `${Math.round((data.transaction.confidence_score || 0.94) * 100)}% Confidence`,
                    badgeStyle: { background: 'var(--purple-muted)', color: 'var(--purple)', border: '1px solid var(--purple-border)' },
                    content: (
                      <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Mapped to:{' '}
                        <span
                          className="px-2 py-0.5 rounded font-semibold uppercase tracking-wide ml-1"
                          style={{
                            background: 'var(--purple-muted)',
                            color: 'var(--purple)',
                            border: '1px solid var(--purple-border)',
                          }}
                        >
                          {data.transaction.failure_reason_classified?.replace('_', ' ') || 'insufficient funds'}
                        </span>
                      </div>
                    ),
                    footnote: 'Classified using pattern analysis of issuer error codes and historical recovery success propensity.',
                  })}

                  {/* Step 3: Agent Decision — HIGHLIGHTED */}
                  <div className="relative">
                    <div
                      className="absolute -left-6 top-0 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{
                        background: 'var(--accent-muted)',
                        border: '2px solid var(--accent-hover)',
                        boxShadow: '0 0 8px var(--accent-muted)',
                      }}
                    >
                      <Cpu className="w-2 h-2" style={{ color: 'var(--accent-hover)' }} />
                    </div>
                    <div
                      className="rounded-xl p-5 space-y-3"
                      style={{
                        background: 'var(--accent-muted)',
                        border: '1.5px solid var(--accent-border)',
                        boxShadow: 'var(--shadow-accent)',
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--accent-hover)' }}>
                            Step 3 • Autonomous Decision
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-xs font-bold uppercase"
                            style={{ background: 'var(--accent)', color: '#fff' }}
                          >
                            {data.timeline.find((t) => t.type === 'agent_decision')?.action_type || 'NOTIFY_CUSTOMER'}
                          </span>
                        </div>
                        <span
                          className="text-[10px] px-2 py-0.5 rounded font-mono"
                          style={{
                            background: 'var(--accent-muted)',
                            color: 'var(--accent-hover)',
                            border: '1px solid var(--accent-border)',
                          }}
                        >
                          AUDIT
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: 'var(--accent-hover)' }}>
                          Agent Reasoning:
                        </span>
                        <div
                          className="p-4 rounded-xl text-sm font-medium leading-relaxed"
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--accent-border)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          "{data.timeline.find((t) => t.type === 'agent_decision')?.agent_reasoning ||
                            'Autonomous recovery orchestrator evaluated transaction risk, customer profile, and failure code to select the optimal dunning or retry strategy.'}"
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Step 4: Action Execution */}
                  {renderTimelineStep({
                    color: 'var(--sky)',
                    dotBg: 'var(--sky-muted)',
                    icon: <RefreshCw className="w-2.5 h-2.5" style={{ color: 'var(--sky)' }} />,
                    label: 'Step 4 • Action Execution',
                    labelColor: 'var(--sky)',
                    timestamp: 'MOCK_MODE',
                    content: data.timeline.some((t) => t.type === 'customer_notification') ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                          <Mail className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} />
                          <span>
                            Gemini notification dispatched to{' '}
                            <strong style={{ color: 'var(--text-primary)' }}>{data.customer.email}</strong>
                          </span>
                        </div>
                        {data.timeline.find((t) => t.type === 'customer_notification')?.details?.content_preview && (
                          <div
                            className="p-3 rounded-lg text-[11px] font-mono whitespace-pre-wrap max-h-36 overflow-y-auto"
                            style={{
                              background: 'var(--bg-elevated)',
                              border: '1px solid var(--border-default)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {data.timeline.find((t) => t.type === 'customer_notification')?.details?.content_preview}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                        <div className="flex items-center justify-between">
                          <span>Smart Retry scheduled via APScheduler</span>
                          <span className="font-mono" style={{ color: 'var(--sky)' }}>60s polling loop</span>
                        </div>
                      </div>
                    ),
                  })}

                  {/* Step 5: Final State */}
                  {renderTimelineStep({
                    color: 'var(--success)',
                    dotBg: 'var(--success-muted)',
                    icon: <CheckCircle2 className="w-2.5 h-2.5" style={{ color: 'var(--success)' }} />,
                    label: 'Step 5 • Lifecycle State',
                    labelColor: 'var(--success)',
                    badge: data.transaction.status,
                    badgeStyle: { background: 'var(--success-muted)', color: 'var(--success)', border: '1px solid var(--success-border)' },
                    content: (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Autonomous recovery pipeline in progress. Customer engaged with tailored call-to-action or retry queue pending next optimal recovery window.
                      </p>
                    ),
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-between shrink-0"
          style={{
            borderTop: '1px solid var(--border-subtle)',
            background: 'var(--bg-elevated)',
          }}
        >
          <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Powered by Gemini Agent & Autonomous Orchestrator
          </span>
          <button
            onClick={onClose}
            className="th-btn-ghost px-4 py-1.5 text-xs font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to render a timeline step
function renderTimelineStep({
  color,
  dotBg,
  icon,
  label,
  labelColor,
  timestamp,
  badge,
  badgeStyle,
  content,
  footnote,
}: {
  color: string;
  dotBg: string;
  icon: React.ReactNode;
  label: string;
  labelColor: string;
  timestamp?: string;
  badge?: string;
  badgeStyle?: React.CSSProperties;
  content: React.ReactNode;
  footnote?: string;
}) {
  return (
    <div className="relative">
      <div
        className="absolute -left-6 top-0 w-4 h-4 rounded-full flex items-center justify-center"
        style={{ background: dotBg, border: `2px solid ${color}` }}
      >
        {icon}
      </div>
      <div
        className="rounded-xl p-4 space-y-2"
        style={{
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold" style={{ color: labelColor }}>
            {label}
          </span>
          {badge ? (
            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold uppercase" style={badgeStyle}>
              {badge}
            </span>
          ) : timestamp ? (
            <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
              {timestamp}
            </span>
          ) : null}
        </div>
        {content}
        {footnote && (
          <p className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
            {footnote}
          </p>
        )}
      </div>
    </div>
  );
}
