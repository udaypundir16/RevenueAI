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
    const timer = setTimeout(() => {
      loadTransactions();
    }, 250);
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

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'recovered':
      case 'paid':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'failed':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'pending':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const getActionBadge = (action: string) => {
    switch (action.toLowerCase()) {
      case 'notify':
      case 'notify_customer':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'retry_later':
      case 'retry_now':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/30';
      case 'escalate':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-400" />
            Transaction Audit & Recovery Log
          </h2>
          <p className="text-xs text-slate-400">
            Click any row to open the complete 5-step autonomous agent decision timeline
          </p>
        </div>

        <button
          onClick={loadTransactions}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer self-start md:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Records</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3 shadow-sm">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search customer, email, payment ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-white">All Statuses</option>
              <option value="failed" className="bg-slate-900 text-white">Failed</option>
              <option value="recovered" className="bg-slate-900 text-white">Recovered</option>
              <option value="pending" className="bg-slate-900 text-white">Pending</option>
            </select>
          </div>

          {/* Failure Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <BrainCircuit className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-slate-500">Classification:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="" className="bg-slate-900 text-white">All Classifications</option>
              <option value="insufficient_funds" className="bg-slate-900 text-white">Insufficient Funds</option>
              <option value="expired_card" className="bg-slate-900 text-white">Expired Card</option>
              <option value="bank_decline" className="bg-slate-900 text-white">Bank Decline</option>
              <option value="network_error" className="bg-slate-900 text-white">Network Error</option>
              <option value="risk_block" className="bg-slate-900 text-white">Risk Block</option>
            </select>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadTransactions}
            className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* Table Container */}
      <div className="rounded-2xl bg-slate-900/80 border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/90 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Customer</th>
                <th
                  onClick={() => handleSort('amount')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4">Failure Reason</th>
                <th className="py-3.5 px-4">AI Classification</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Current Agent Action</th>
                <th
                  onClick={() => handleSort('created_at')}
                  className="py-3.5 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Timestamp</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-500" />
                  </div>
                </th>
                <th className="py-3.5 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading && transactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 text-indigo-400 animate-spin mx-auto mb-3" />
                    <span className="text-sm font-medium">Loading transactions from database...</span>
                  </td>
                </tr>
              ) : sortedTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-400">
                    <div className="max-w-md mx-auto space-y-3 px-4">
                      <CreditCard className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-base font-semibold text-white">
                        {search || statusFilter || categoryFilter
                          ? 'No transactions matched your active filters.'
                          : 'No failed transactions yet — run the demo simulator'}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {search || statusFilter || categoryFilter
                          ? 'Try clearing or changing your search terms or classification filters.'
                          : 'Stream live payment failure events into the pipeline to test autonomous classification, orchestration, and recovery.'}
                      </p>
                      <div className="pt-2">
                        <Link
                          to="/"
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-lg shadow-indigo-600/30 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          Run Demo Simulator on Dashboard
                        </Link>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTxId(tx.id)}
                    className="hover:bg-slate-800/50 transition-colors cursor-pointer group"
                  >
                    {/* Customer */}
                    <td className="py-3.5 px-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white group-hover:text-indigo-300 transition-colors">
                            {tx.customer?.name || 'Anonymous Customer'}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                              (tx.customer?.segment || '').toLowerCase() === 'b2b'
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            {tx.customer?.segment || 'B2C'}
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 font-mono block">
                          {tx.customer?.email || 'N/A'}
                        </span>
                      </div>
                    </td>

                    {/* Amount */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-extrabold text-slate-200">
                        {tx.currency} {tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </td>

                    {/* Failure Reason */}
                    <td className="py-3.5 px-4 max-w-[200px]">
                      <span className="text-slate-300 truncate block font-mono text-[11px]" title={tx.failure_reason_raw}>
                        {tx.failure_reason_raw}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {tx.razorpay_payment_id}
                      </span>
                    </td>

                    {/* AI Classification */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-800/80 font-semibold uppercase text-[10px] tracking-wide">
                          {tx.failure_reason_classified.replace('_', ' ')}
                        </span>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono">
                          <span>Conf:</span>
                          <span className="text-purple-300 font-bold">
                            {Math.round((tx.confidence_score || 0.85) * 100)}%
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getStatusBadge(
                          tx.status
                        )}`}
                      >
                        {tx.status}
                      </span>
                    </td>

                    {/* Current Agent Action */}
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${getActionBadge(
                          tx.latest_action?.action_type || 'pending'
                        )}`}
                      >
                        {tx.latest_action?.action_type || 'pending'}
                      </span>
                    </td>

                    {/* Created At */}
                    <td className="py-3.5 px-4 whitespace-nowrap text-slate-400 text-[11px] font-mono">
                      {new Date(tx.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    {/* Inspect Button */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTxId(tx.id);
                        }}
                        className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-indigo-600/30 text-slate-400 group-hover:text-indigo-300 transition-colors"
                        title="View Vertical Timeline"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Transaction Detail Drawer Component */}
      <TransactionDetailDrawer
        transactionId={selectedTxId}
        onClose={() => setSelectedTxId(null)}
      />
    </div>
  );
};
