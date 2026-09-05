import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { fetchHealthCheck, type HealthCheckResponse } from '../api/client';
import { RefreshCw } from 'lucide-react';

export const Layout: React.FC = () => {
  const [healthData, setHealthData] = useState<HealthCheckResponse | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(false);
  const location = useLocation();

  const checkHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await fetchHealthCheck();
      setHealthData(res.data);
    } catch (e) {
      console.error('Health check error:', e);
    } finally {
      setLoadingHealth(false);
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Title based on current route
  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Recovery Dashboard & Analytics';
      case '/transactions':
        return 'Transactions & Audit Trail';
      case '/playbook':
        return 'Recovery Playbook Configuration';
      case '/messages':
        return 'Customer Recovery Messages';
      default:
        return 'Revenue Recovery AI';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-row antialiased selection:bg-indigo-500 selection:text-white">
      {/* Persistent Left Sidebar */}
      <Sidebar
        healthStatus={{
          connected: !!healthData,
          razorpay: healthData?.features?.razorpay_configured ?? true,
          supabase: healthData?.features?.supabase_configured ?? true,
          gemini: healthData?.features?.gemini_agent_configured ?? true,
        }}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="h-16 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md px-8 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-white tracking-tight">{getPageTitle()}</h1>
            <span className="hidden sm:inline-block text-[11px] px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 font-mono">
              v0.1.0 • Autonomous
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Agent Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-semibold text-white">Agents Active:</span>
              <span className="text-slate-400">Orchestrator • Messenger</span>
            </div>

            {/* Refresh button */}
            <button
              onClick={checkHealth}
              disabled={loadingHealth}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs font-medium text-slate-300 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh System Health"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${loadingHealth ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Sync</span>
            </button>
          </div>
        </header>

        {/* Dynamic Route Content */}
        <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
