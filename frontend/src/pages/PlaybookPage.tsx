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

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'retry_later':
      case 'retry_now':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'notify_customer':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'escalate':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
            Autonomous Recovery Playbook
          </h2>
          <p className="text-xs text-slate-400">
            Phase 4 rule-based decision matrix mapping classified failures to optimal recovery actions
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={resetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>
      </div>

      {saveToast && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          Playbook rules updated successfully. Live orchestrator will apply these parameters to subsequent gateway events.
        </div>
      )}

      {/* Info Callout */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/30 flex items-start gap-3 shadow-md">
        <Info className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-semibold text-white">Rule Execution & Agent Autonomy</p>
          <p className="text-slate-400 leading-relaxed">
            When Razorpay fires a payment failure webhook, the Orchestration Agent evaluates these decision rules
            against the classification engine's output. The decision reasoning is stored immutably in the{' '}
            <code className="text-indigo-300 font-mono">recovery_actions</code> table for auditable transparency.
          </p>
        </div>
      </div>

      {/* Rules Table */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Failure Category</th>
                <th className="py-3.5 px-4">Orchestrator Action</th>
                <th className="py-3.5 px-4">Timing Strategy</th>
                <th className="py-3.5 px-4">Max Retries</th>
                <th className="py-3.5 px-4">Customer Dunning Channel</th>
                <th className="py-3.5 px-4">Rationale</th>
                <th className="py-3.5 px-4 text-right">Configure</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {rules.map((r) => {
                const isEditing = editingRuleId === r.id;

                if (isEditing) {
                  return (
                    <tr key={r.id} className="bg-indigo-950/30">
                      <td className="py-3.5 px-4 font-bold text-white uppercase font-mono">
                        {r.failureType.replace('_', ' ')}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={editForm.action}
                          onChange={(e) => setEditForm({ ...editForm, action: e.target.value as any })}
                          className="bg-slate-950 border border-indigo-500/50 rounded-lg px-2 py-1 text-white text-xs"
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
                          className="bg-slate-950 border border-indigo-500/50 rounded-lg px-2 py-1 text-white text-xs w-28"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="number"
                          value={editForm.maxAttempts}
                          onChange={(e) => setEditForm({ ...editForm, maxAttempts: parseInt(e.target.value) || 0 })}
                          className="bg-slate-950 border border-indigo-500/50 rounded-lg px-2 py-1 text-white text-xs w-16"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <input
                          type="text"
                          value={editForm.customerNotification}
                          onChange={(e) => setEditForm({ ...editForm, customerNotification: e.target.value })}
                          className="bg-slate-950 border border-indigo-500/50 rounded-lg px-2 py-1 text-white text-xs w-48"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {r.description}
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={saveEdit}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold cursor-pointer"
                        >
                          Save
                        </button>
                        <button
                          onClick={cancelEdit}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  );
                }

                return (
                  <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white uppercase font-mono">
                      {r.failureType.replace('_', ' ')}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold uppercase border ${getActionBadge(r.action)}`}>
                        {r.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {r.timing}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300">
                      {r.maxAttempts}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {r.customerNotification}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 max-w-xs leading-relaxed">
                      {r.description}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => startEdit(r)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer text-xs"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
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
