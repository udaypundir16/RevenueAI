import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  Eye,
  CreditCard,
  BrainCircuit,
  AlertTriangle,
  Play,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  type TransactionItem,
  fetchTransactions,
} from '../api/client';
import { TransactionDetailDrawer } from '../components/TransactionDetailDrawer';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'amount'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [selectedTxId, setSelectedTxId] = useState<string | null>(null);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTransactions({
        status: statusFilter || undefined,
        category: categoryFilter || undefined,
        search: search || undefined,
        limit: 100,
      });
      setTransactions(data);
    } catch (err: any) {
      console.error('Failed to load transactions:', err);
      setError(err.message || 'Failed to load transactions from backend');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => { loadTransactions(); }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, categoryFilter]);

  const handleSort = (field: 'created_at' | 'amount') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const sortedTransactions = [...transactions].sort((a, b) => {
    if (sortField === 'amount') {
      return sortOrder === 'asc' ? a.amount - b.amount : b.amount - a.amount;
    }
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
  });

  const getStatusStyle = (status: string): React.CSSProperties => {
    switch (status.toLowerCase()) {
      case 'recovered':
      case 'paid':
        return { background: 'var(--success-muted)', color: 'var(--success)', border: '1px solid var(--success-border)' };
      case 'failed':
        return { background: 'var(--danger-muted)', color: 'var(--danger)', border: '1px solid var(--danger-border)' };
      case 'pending':
        return { background: 'var(--warning-muted)', color: 'var(--warning)', border: '1px solid var(--warning-border)' };
      default:
        return { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' };
    }
  };

  const getActionStyle = (action: string): React.CSSProperties => {
    switch (action.toLowerCase()) {
      case 'notify':
      case 'notify_customer':
        return { background: 'var(--accent-muted)', color: 'var(--accent-hover)', border: '1px solid var(--accent-border)' };
      case 'retry_later':
      case 'retry_now':
        return { background: 'var(--sky-muted)', color: 'var(--sky)', border: '1px solid var(--sky-border)' };
      case 'escalate':
        return { background: 'var(--danger-muted)', color: 'var(--danger)', border: '1px solid var(--danger-border)' };
      default:
        return { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' };
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <CreditCard className="w-5 h-5" style={{ color: 'var(--accent-hover)' }} />
            Transaction Audit & Recovery Log
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            Click any row to view the 5-step autonomous agent decision timeline
          </p>
        </div>
        <button
          onClick={loadTransactions}
          disabled={loading}
          className="th-btn-ghost inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium self-start md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--accent-hover)' }} />
          Refresh Records
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-3"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search customer, email, payment ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="th-input w-full pl-9 pr-4 py-2 text-xs"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
            }}
          >
            <Filter className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
            <span style={{ color: 'var(--text-tertiary)' }}>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer text-xs"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="">All</option>
              <option value="failed">Failed</option>
              <option value="recovered">Recovered</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-default)',
            }}
          >
            <BrainCircuit className="w-3.5 h-3.5" style={{ color: 'var(--purple)' }} />
            <span style={{ color: 'var(--text-tertiary)' }}>Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent font-medium focus:outline-none cursor-pointer text-xs"
              style={{ color: 'var(--text-primary)' }}
            >
              <option value="">All</option>
              <option value="insufficient_funds">Insufficient Funds</option>
              <option value="expired_card">Expired Card</option>
              <option value="bank_decline">Bank Decline</option>
              <option value="network_error">Network Error</option>
              <option value="risk_block">Risk Block</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl th-alert-danger flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadTransactions} className="th-btn-ghost px-3 py-1 text-xs font-semibold">Retry</button>
        </div>
      )}

      {/* Table */}
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
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Customer</th>
                <th
                  className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center gap-1.5">
                    Amount <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Failure Reason</th>
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>AI Classification</th>
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Status</th>
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Agent Action</th>
                <th
                  className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider cursor-pointer select-none"
                  style={{ color: 'var(--text-tertiary)' }}
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center gap-1.5">
                    Timestamp <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-xs font-semibold uppercase tracking-wider text-right" style={{ color: 'var(--text-tertiary)' }}>Inspect</th>
              </tr>
            </thead>
            <tbody>
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" style={{ color: 'var(--accent-hover)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Loading transactions...</span>
                  </td>
                </tr>
              ) : sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center">
                    <div className="max-w-md mx-auto space-y-3 px-4">
                      <CreditCard className="w-10 h-10 mx-auto" style={{ color: 'var(--text-disabled)' }} />
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {search || statusFilter || categoryFilter
                          ? 'No transactions matched your filters.'
                          : 'No failed transactions yet — run the demo simulator'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        {search || statusFilter || categoryFilter
                          ? 'Clear your filters to see all records.'
                          : 'Stream live payment failure events to test autonomous classification and recovery.'}
                      </p>
                      {!search && !statusFilter && !categoryFilter && (
                        <Link
                          to="/"
                          className="th-btn-primary inline-flex items-center gap-2 px-4 py-2 text-xs"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          Run Demo Simulator
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTxId(tx.id)}
                    className="th-table-row cursor-pointer group"
                  >
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                            {tx.customer?.name || 'Anonymous'}
                          </span>
                          <span
                            className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase"
                            style={
                              (tx.customer?.segment || '').toLowerCase() === 'b2b'
                                ? { background: 'var(--purple-muted)', color: 'var(--purple)', border: '1px solid var(--purple-border)' }
                                : { background: 'var(--success-muted)', color: 'var(--success)', border: '1px solid var(--success-border)' }
                            }
                          >
                            {tx.customer?.segment || 'B2C'}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono block mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {tx.customer?.email || 'N/A'}
                        </span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-xs" style={{ color: 'var(--text-primary)' }}>
                        {tx.currency} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 max-w-[180px]">
                      <span className="text-xs truncate block font-mono" title={tx.failure_reason_raw} style={{ color: 'var(--text-secondary)' }}>
                        {tx.failure_reason_raw}
                      </span>
                      <span className="text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                        {tx.razorpay_payment_id}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span
                          className="inline-block px-2 py-0.5 rounded-full font-semibold uppercase text-[10px] tracking-wide"
                          style={{ background: 'var(--purple-muted)', color: 'var(--purple)', border: '1px solid var(--purple-border)' }}
                        >
                          {tx.failure_reason_classified.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                          Conf: <span className="font-bold" style={{ color: 'var(--purple)' }}>
                            {Math.round((tx.confidence_score || 0.85) * 100)}%
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={getStatusStyle(tx.status)}
                      >
                        {tx.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase"
                        style={getActionStyle(tx.latest_action?.action_type || 'pending')}
                      >
                        {tx.latest_action?.action_type || 'pending'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(tx.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => { e.stopPropagation(); setSelectedTxId(tx.id); }}
                        className="p-1.5 rounded-lg transition-colors cursor-pointer"
                        style={{ background: 'var(--bg-elevated)', color: 'var(--text-tertiary)' }}
                        title="View Timeline"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionDetailDrawer
        transactionId={selectedTxId}
        onClose={() => setSelectedTxId(null)}
      />
    </div>
  );
};
