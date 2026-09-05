import React from 'react';
import { ShieldCheck, RefreshCw, Layers } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface NavbarProps {
  status: 'healthy' | 'loading' | 'offline';
  latencyMs: number | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  status,
  latencyMs,
  onRefresh,
  isRefreshing,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand identity */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-white tracking-tight">RevenueRecovery.AI</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                v0.1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Autonomous Dunning & Intelligent Recovery</p>
          </div>
        </div>

        {/* Live Connectivity Badge and Refresh Trigger */}
        <div className="flex items-center gap-4">
          <StatusBadge status={status} latencyMs={latencyMs} />

          <button
            id="nav-refresh-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 bg-slate-900 border border-slate-700/60 hover:bg-slate-800 hover:text-white transition-all disabled:opacity-50"
            title="Refresh Health Check"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
            <span>{isRefreshing ? 'Checking...' : 'Ping'}</span>
          </button>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-900 border border-slate-800 text-slate-400">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>FastAPI + Vite</span>
          </div>
        </div>
      </div>
    </header>
  );
};
