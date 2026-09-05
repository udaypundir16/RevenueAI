import React from 'react';

interface StatusBadgeProps {
  status: 'healthy' | 'loading' | 'offline';
  latencyMs?: number | null;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, latencyMs }) => {
  if (status === 'loading') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span>Connecting to API...</span>
      </div>
    );
  }

  if (status === 'healthy') {
    return (
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="font-semibold">API Connected</span>
        {latencyMs !== undefined && latencyMs !== null && (
          <span className="text-emerald-400/70 border-l border-emerald-500/30 pl-2">
            {latencyMs}ms
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
      <span className="w-2 h-2 rounded-full bg-rose-500" />
      <span>API Offline</span>
    </div>
  );
};
