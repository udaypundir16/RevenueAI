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

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Dashboard';
      case '/transactions':
        return 'Transactions';
      case '/playbook':
        return 'Playbook';
      case '/messages':
        return 'Messages';
      default:
        return 'RevenueAI';
    }
  };

  const getPageSubtitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Recovery analytics & autonomous pipeline';
      case '/transactions':
        return 'Audit trail & agent decision log';
      case '/playbook':
        return 'Recovery decision rules configuration';
      case '/messages':
        return 'AI-generated customer dunning messages';
      default:
        return '';
    }
  };

  return (
    <div
      className="min-h-screen flex flex-row antialiased"
      style={{ background: 'var(--bg-base)', color: 'var(--text-primary)' }}
    >
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
        {/* Top Header */}
        <header
          className="th-header h-14 px-8 flex items-center justify-between sticky top-0 z-20"
          style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}
        >
          <div>
            <h1
              className="text-base font-semibold tracking-tight leading-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {getPageTitle()}
            </h1>
            <p className="text-[11px] leading-tight mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
              {getPageSubtitle()}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Agents active pill */}
            <div
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
              style={{
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: 'var(--success)' }}
              />
              <span style={{ color: 'var(--text-primary)' }} className="font-medium text-[11px]">Agents Active</span>
              <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>Orchestrator • Messenger</span>
            </div>

            {/* Sync button */}
            <button
              onClick={checkHealth}
              disabled={loadingHealth}
              className="th-btn-ghost inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
              title="Refresh System Health"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loadingHealth ? 'animate-spin' : ''}`}
                style={{ color: 'var(--accent-hover)' }}
              />
              <span className="hidden sm:inline font-medium">Sync</span>
            </button>
          </div>
        </header>

        {/* Route Content */}
        <main
          className="flex-1 px-8 py-7 max-w-7xl w-full mx-auto animate-fade-in"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};
