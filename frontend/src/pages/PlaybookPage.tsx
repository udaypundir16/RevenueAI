import React, { useState } from 'react';
import {
  SlidersHorizontal,
  Edit2,
  RotateCcw,
  Check,
  Info,
} from 'lucide-react';

interface PlaybookRule {
  id: string;
  failureType: string;
  action: 'retry_later' | 'notify_customer' | 'retry_now' | 'escalate';
  timing: string;
  maxAttempts: number;
  customerNotification: string;
  description: string;
}

const DEFAULT_RULES: PlaybookRule[] = [
  {
    id: 'rule-1',
    failureType: 'insufficient_funds',
    action: 'retry_later',
    timing: '2 - 3 Days',
    maxAttempts: 3,
    customerNotification: 'Silent (No notification, wait for funds window)',
    description: 'Avoids notifying customer prematurely. Aligns retry with salary/deposit cycles.',
  },
  {
    id: 'rule-2',
    failureType: 'expired_card',
    action: 'notify_customer',
    timing: 'Immediate',
    maxAttempts: 0,
    customerNotification: 'Gemini Adaptive Email with Card Update CTA',
    description: 'Auto-retries will fail. Immediately prompt customer with secure self-service link.',
  },
  {
    id: 'rule-3',
    failureType: 'bank_decline',
    action: 'retry_later',
    timing: 'In 6 Hours',
    maxAttempts: 2,
    customerNotification: 'Notify on 2nd consecutive decline',
    description: 'Issuer risk throttles often reset within a few hours. Escalate to customer if persistent.',
  },
  {
    id: 'rule-4',
    failureType: 'network_error',
    action: 'retry_now',
    timing: '5 - 15 Minutes',
    maxAttempts: 3,
    customerNotification: 'None (Transient socket timeout)',
    description: 'Transient gateway timeouts are recaptured immediately without alerting customer.',
  },
  {
    id: 'rule-5',
    failureType: 'risk_block',
    action: 'escalate',
    timing: 'Immediate Manual Hold',
    maxAttempts: 0,
    customerNotification: 'No customer contact (Fraud protection)',
    description: 'Flag for manual compliance review. Prevent automated dunning or retries.',
  },
  {
    id: 'rule-6',
    failureType: 'unknown',
    action: 'notify_customer',
    timing: 'Immediate',
    maxAttempts: 1,
    customerNotification: 'Generic Support Link',
    description: 'Fallback dunning message for unclassified issuer declines.',
  },
];

export const PlaybookPage: React.FC = () => {
  const [rules, setRules] = useState<PlaybookRule[]>(DEFAULT_RULES);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PlaybookRule>>({});
  const [saveToast, setSaveToast] = useState(false);

  const startEdit = (rule: PlaybookRule) => {
    setEditingRuleId(rule.id);
    setEditForm({ ...rule });
  };

  const saveEdit = () => {
    if (!editingRuleId) return;
    setRules((prev) =>
      prev.map((r) => (r.id === editingRuleId ? ({ ...r, ...editForm } as PlaybookRule) : r))
    );
    setEditingRuleId(null);
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2500);
  };

  const cancelEdit = () => {
    setEditingRuleId(null);
    setEditForm({});
  };

  const resetDefaults = () => {
    setRules(DEFAULT_RULES);
    setEditingRuleId(null);
  };

  const getActionStyle = (action: string): React.CSSProperties => {
    switch (action) {
      case 'retry_later':
      case 'retry_now':
        return { background: 'var(--sky-muted)', color: 'var(--sky)', border: '1px solid var(--sky-border)' };
      case 'notify_customer':
        return { background: 'var(--accent-muted)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' };
      case 'escalate':
        return { background: 'var(--danger-muted)', color: 'var(--danger)', border: '1px solid var(--danger-border)' };
      default:
        return { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <SlidersHorizontal className="w-5 h-5" style={{ color: 'var(--accent-hover)' }} />
            Autonomous Recovery Playbook
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Phase 4 rule-based decision matrix mapping classified failures to optimal recovery actions
          </p>
        </div>
        <button
          onClick={resetDefaults}
          className="th-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset Defaults
        </button>
      </div>

      {/* Save Toast */}
      {saveToast && (
        <div className="p-3.5 rounded-xl th-alert-success flex items-center gap-2 text-sm">
          <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--success)' }} />
          <span>Playbook rules updated. Live orchestrator will apply on subsequent gateway events.</span>
        </div>
      )}

      {/* Info Callout */}
      <div
        className="p-4 rounded-2xl flex items-start gap-3"
        style={{
          background: 'var(--accent-muted)',
          border: '1px solid var(--accent-border)',
        }}
      >
        <Info className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--accent-hover)' }} />
        <div className="text-xs space-y-1">
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>Rule Execution & Agent Autonomy</p>
          <p className="leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            When Razorpay fires a payment failure webhook, the Orchestration Agent evaluates these decision rules
            against the classification engine's output. The decision reasoning is stored immutably in the{' '}
            <code className="font-mono px-1 py-0.5 rounded" style={{ background: 'var(--bg-elevated)', color: 'var(--accent-hover)' }}>
              recovery_actions
            </code>{' '}
            table for auditable transparency.
          </p>
        </div>
      </div>

      {/* Rules Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="th-table-head">
              <tr>
                {['Failure Category', 'Orchestrator Action', 'Timing', 'Max Retries', 'Customer Dunning', 'Rationale', 'Configure'].map((h, i) => (
                  <th
                    key={h}
                    className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-tertiary)', textAlign: i === 6 ? 'right' : 'left' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rules.map((r) => {
                const isEditing = editingRuleId === r.id;

                if (isEditing) {
                  return (
                    <tr key={r.id} className="th-table-row" style={{ background: 'var(--accent-muted)' }}>
                      <td className="py-3.5 px-4 font-bold uppercase font-mono" style={{ color: 'var(--text-primary)' }}>
                        {r.failureType.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={editForm.action}
                          onChange={(e) => setEditForm({ ...editForm, action: e.target.value as any })}
                          className="th-select px-2 py-1 text-xs"
                          style={{ minWidth: 130 }}
                        >
                          <option value="retry_later">retry_later</option>
                          <option value="notify_customer">notify_customer</option>
                          <option value="retry_now">retry_now</option>
                          <option value="escalate">escalate</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={editForm.timing}
                          onChange={(e) => setEditForm({ ...editForm, timing: e.target.value })}
                          className="th-input px-2 py-1 text-xs w-28"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          value={editForm.maxAttempts}
                          onChange={(e) => setEditForm({ ...editForm, maxAttempts: parseInt(e.target.value) || 0 })}
                          className="th-input px-2 py-1 text-xs w-16"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={editForm.customerNotification}
                          onChange={(e) => setEditForm({ ...editForm, customerNotification: e.target.value })}
                          className="th-input px-2 py-1 text-xs w-48"
                        />
                      </td>
                      <td className="py-3.5 px-4" style={{ color: 'var(--text-secondary)' }}>
                        {r.description}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={saveEdit}
                          className="th-btn-primary px-2.5 py-1 text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="th-btn-ghost px-2.5 py-1 text-xs"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={r.id} className="th-table-row">
                    <td className="py-3.5 px-4 font-bold uppercase font-mono" style={{ color: 'var(--text-primary)' }}>
                      {r.failureType.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-block px-2.5 py-0.5 rounded-full font-bold uppercase text-[10px]" style={getActionStyle(r.action)}>
                        {r.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {r.timing}
                    </td>
                    <td className="py-3.5 px-4 font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {r.maxAttempts}
                    </td>
                    <td className="py-3.5 px-4" style={{ color: 'var(--text-secondary)' }}>
                      {r.customerNotification}
                    </td>
                    <td className="py-3.5 px-4 max-w-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                      {r.description}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(r)}
                        className="th-btn-ghost inline-flex items-center gap-1 px-2.5 py-1 text-xs"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
