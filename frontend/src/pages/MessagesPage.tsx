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

  useEffect(() => { loadMessages(); }, []);

  const filteredMessages = messages.filter((m) => {
    const seg = (m.customer_segment || 'b2c').toLowerCase();
    const chan = (m.channel || 'email').toLowerCase();
    if (segmentFilter !== 'all' && seg !== segmentFilter) return false;
    if (channelFilter !== 'all' && chan !== channelFilter) return false;
    return true;
  });

  const b2cCount = messages.filter((m) => (m.customer_segment || 'b2c').toLowerCase() === 'b2c').length;
  const b2bCount = messages.filter((m) => (m.customer_segment || '').toLowerCase() === 'b2b').length;

  const statCards = [
    { label: 'Total Dispatched', value: messages.length.toString(), sub: 'In recovery_messages table', color: 'var(--text-primary)' },
    { label: 'B2C Casual Tone', value: b2cCount.toString(), sub: 'Friendly & warm voice', color: 'var(--success)' },
    { label: 'B2B Formal Tone', value: b2bCount.toString(), sub: 'Executive invoice & corporate voice', color: 'var(--purple)' },
    { label: 'Dispatch Safety', value: 'MOCK_MODE', sub: 'Safe hackathon demo mode', color: 'var(--warning)', isText: true },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <Sparkles className="w-5 h-5" style={{ color: 'var(--warning)' }} />
            Gemini Adaptive Customer Messages
          </h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
            AI-generated dunning notifications tailored by customer segment (B2C Friendly vs B2B Professional)
          </p>
        </div>
        <button
          onClick={loadMessages}
          disabled={loading}
          className="th-btn-ghost inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--warning)' }} />
          Refresh Messages
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl th-alert-danger flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadMessages} className="th-btn-ghost px-3 py-1 text-xs font-semibold">Retry</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="th-card p-5"
          >
            <span className="text-[11px] font-semibold uppercase tracking-wider block" style={{ color: 'var(--text-tertiary)' }}>
              {card.label}
            </span>
            <span
              className={`${card.isText ? 'text-base' : 'text-2xl'} font-bold mt-2 block`}
              style={{ color: card.color }}
            >
              {card.value}
            </span>
            {card.label === 'Dispatch Safety' ? (
              <span className="text-[10px] mt-1 flex items-center gap-1" style={{ color: 'var(--success)' }}>
                <CheckCircle2 className="w-3 h-3" /> {card.sub}
              </span>
            ) : (
              <span className="text-[11px] mt-1 block" style={{ color: 'var(--text-tertiary)' }}>{card.sub}</span>
            )}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div
        className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
        }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
            <Filter className="w-3.5 h-3.5" /> Segment:
          </span>
          {[
            { key: 'all', label: `All (${messages.length})`, activeStyle: { background: 'var(--warning)', color: '#000' } },
            { key: 'b2c', label: `B2C (${b2cCount})`, activeStyle: { background: 'var(--success)', color: '#000' } },
            { key: 'b2b', label: `B2B (${b2bCount})`, activeStyle: { background: 'var(--purple)', color: '#fff' } },
          ].map(({ key, label, activeStyle }) => (
            <button
              key={key}
              onClick={() => setSegmentFilter(key)}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer"
              style={
                segmentFilter === key
                  ? activeStyle
                  : { background: 'var(--bg-elevated)', color: 'var(--text-secondary)', border: '1px solid var(--border-default)' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>Channel:</span>
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="th-select px-2.5 py-1 text-xs"
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
        <div className="py-20 text-center">
          <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" style={{ color: 'var(--warning)' }} />
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading recovery messages...</p>
        </div>
      ) : filteredMessages.length === 0 ? (
        <div
          className="p-12 text-center rounded-2xl space-y-3"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
          }}
        >
          <MessageSquareQuote className="w-10 h-10 mx-auto" style={{ color: 'var(--text-disabled)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            No recovery messages matching filters.
          </p>
          <p className="text-xs max-w-md mx-auto" style={{ color: 'var(--text-tertiary)' }}>
            Messages are auto-generated by the Gemini Agent when the Orchestrator returns{' '}
            <code
              className="font-mono px-1 py-0.5 rounded"
              style={{ background: 'var(--bg-elevated)', color: 'var(--accent-hover)' }}
            >
              notify_customer
            </code>.
          </p>
          <Link
            to="/"
            className="th-btn-primary inline-block mt-2 px-4 py-2 text-xs font-bold"
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
                className="th-card p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Top Badges */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wide"
                        style={
                          isB2B
                            ? { background: 'var(--purple-muted)', color: 'var(--purple)', border: '1px solid var(--purple-border)' }
                            : { background: 'var(--success-muted)', color: 'var(--success)', border: '1px solid var(--success-border)' }
                        }
                      >
                        {isB2B ? 'B2B Formal' : 'B2C Friendly'}
                      </span>
                      <span
                        className="text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1"
                        style={{
                          background: 'var(--bg-elevated)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)',
                        }}
                      >
                        <Mail className="w-2.5 h-2.5" style={{ color: 'var(--warning)' }} />
                        {msg.channel}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono" style={{ color: 'var(--text-tertiary)' }}>
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Customer */}
                  <div>
                    <div className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      {msg.customer_name || 'Customer'}
                    </div>
                    <div className="text-xs font-mono truncate" style={{ color: 'var(--text-tertiary)' }}>
                      {msg.customer_email || 'customer@example.com'}
                    </div>
                  </div>

                  {/* Message Body */}
                  <div
                    className="rounded-xl p-4 text-xs leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto"
                    style={{
                      background: 'var(--bg-elevated)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {msg.content}
                  </div>
                </div>

                {/* Card Footer */}
                <div
                  className="pt-3 flex items-center justify-between text-[11px]"
                  style={{ borderTop: '1px solid var(--border-subtle)' }}
                >
                  <div className="font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    Ref: <span style={{ color: 'var(--text-secondary)' }}>
                      {msg.payment_id || msg.transaction_id.slice(0, 8)}
                    </span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 font-bold uppercase text-[10px]"
                    style={{ color: 'var(--success)' }}
                  >
                    <CheckCircle2 className="w-3 h-3" /> Logged
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
