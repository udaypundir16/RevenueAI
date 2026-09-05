import React, { useState, useEffect } from 'react';
import {
  MessageSquareQuote,
  Mail,
  RefreshCw,
  Sparkles,
  CheckCircle2,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import {
  type RecoveryMessageItem,
  fetchRecoveryMessages,
} from '../api/client';
import { Link } from 'react-router-dom';

export const MessagesPage: React.FC = () => {
  const [messages, setMessages] = useState<RecoveryMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [segmentFilter, setSegmentFilter] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');

  const loadMessages = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchRecoveryMessages(50);
      setMessages(data);
    } catch (err: any) {
      console.error('Failed to load messages:', err);
      setError(err.message || 'Failed to fetch recovery messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const filteredMessages = messages.filter((m) => {
    const seg = (m.customer_segment || 'b2c').toLowerCase();
    const chan = (m.channel || 'email').toLowerCase();

    if (segmentFilter !== 'all' && seg !== segmentFilter) return false;
    if (channelFilter !== 'all' && chan !== channelFilter) return false;
    return true;
  });

  const b2cCount = messages.filter((m) => (m.customer_segment || 'b2c').toLowerCase() === 'b2c').length;
  const b2bCount = messages.filter((m) => (m.customer_segment || '').toLowerCase() === 'b2b').length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            Gemini Adaptive Customer Messages
          </h2>
          <p className="text-xs text-slate-400">
            AI-generated dunning notifications tailored dynamically by customer segment (B2C Friendly vs B2B Professional)
          </p>
        </div>

        <button
          onClick={loadMessages}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-semibold text-slate-200 transition-colors cursor-pointer self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Messages</span>
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/40 text-xs text-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadMessages}
            className="px-3 py-1 rounded-lg bg-rose-900/60 hover:bg-rose-800 text-xs font-semibold text-white transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI & Mode Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Total Dispatched</span>
          <span className="text-2xl font-extrabold text-white mt-1 block">{messages.length}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">In recovery_messages table</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider block">B2C Casual Tone</span>
          <span className="text-2xl font-extrabold text-emerald-300 mt-1 block">{b2cCount}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">Friendly & warm voice</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-purple-400 uppercase tracking-wider block">B2B Formal Tone</span>
          <span className="text-2xl font-extrabold text-purple-300 mt-1 block">{b2bCount}</span>
          <span className="text-[10px] text-slate-500 mt-1 block">Executive invoice & corporate voice</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
          <span className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider block">Dispatch Safety</span>
          <span className="text-base font-extrabold text-white mt-1 block font-mono">MOCK_MODE = true</span>
          <span className="text-[10px] text-emerald-400 mt-1 block flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Safe hackathon demo mode
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mr-2">
            <Filter className="w-3.5 h-3.5" /> Segment:
          </span>
          <button
            onClick={() => setSegmentFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              segmentFilter === 'all'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Segments ({messages.length})
          </button>
          <button
            onClick={() => setSegmentFilter('b2c')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              segmentFilter === 'b2c'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            B2C ({b2cCount})
          </button>
          <button
            onClick={() => setSegmentFilter('b2b')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              segmentFilter === 'b2b'
                ? 'bg-purple-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            B2B ({b2bCount})
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-400">Channel:</span>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1 text-xs focus:outline-none cursor-pointer"
          >
            <option value="all">All Channels</option>
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
        </div>
      </div>

      {/* Messages Grid */}
      {loading && messages.length === 0 ? (
        <div className="py-20 text-center text-slate-500">
          <RefreshCw className="w-6 h-6 text-amber-400 animate-spin mx-auto mb-2" />
          Loading recovery messages...
        </div>
      ) : filteredMessages.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <MessageSquareQuote className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No recovery messages found matching filters.</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Messages are automatically generated by the Gemini Agent when the Orchestrator returns{' '}
            <code className="text-indigo-400 font-mono">notify_customer</code>.
          </p>
          <Link
            to="/"
            className="inline-block mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-colors"
          >
            Trigger Simulation on Dashboard
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMessages.map((msg) => {
            const isB2B = (msg.customer_segment || '').toLowerCase() === 'b2b';
            return (
              <div
                key={msg.id}
                className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5 shadow-xl hover:border-amber-500/40 transition-all flex flex-col justify-between space-y-4 group"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-extrabold uppercase tracking-wide border ${
                          isB2B
                            ? 'bg-purple-950 text-purple-300 border-purple-800'
                            : 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        }`}
                      >
                        {isB2B ? 'B2B Formal Tone' : 'B2C Friendly Tone'}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono flex items-center gap-1">
                        <Mail className="w-3 h-3 text-amber-400" />
                        {msg.channel}
                      </span>
                    </div>

                    <span className="text-[11px] text-slate-500 font-mono">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Customer Information */}
                  <div>
                    <div className="text-sm font-bold text-white group-hover:text-amber-300 transition-colors">
                      {msg.customer_name || 'Customer'}
                    </div>
                    <div className="text-xs text-slate-400 font-mono truncate">
                      {msg.customer_email || 'customer@example.com'}
                    </div>
                  </div>

                  {/* Rendered Message Content Body */}
                  <div className="rounded-xl bg-slate-950 p-4 border border-slate-800/80 text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto space-y-2">
                    {msg.content}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="text-slate-500 font-mono">
                    Ref: <span className="text-slate-300">{msg.payment_id || msg.transaction_id.slice(0, 8)}</span>
                  </div>

                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Logged to DB
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
