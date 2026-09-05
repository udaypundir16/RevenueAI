import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  ReceiptText,
  SlidersHorizontal,
  MessageSquareQuote,
  Zap,
  Activity,
  CreditCard,
  Database,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  healthStatus?: {
    connected: boolean;
    razorpay: boolean;
    supabase: boolean;
    gemini: boolean;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ healthStatus }) => {
  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      description: 'KPIs & Recovery Trend',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      to: '/transactions',
      label: 'Transactions',
      description: 'Audit & Agent Timeline',
      icon: ReceiptText,
      badge: null,
    },
    {
      to: '/playbook',
      label: 'Playbook Config',
      description: 'Recovery Decision Rules',
      icon: SlidersHorizontal,
      badge: 'Rules',
    },
    {
      to: '/messages',
      label: 'Customer Messages',
      description: 'Adaptive Gemini Dunning',
      icon: MessageSquareQuote,
      badge: null,
    },
  ];

  return (
    <aside className="w-64 bg-slate-950/95 border-r border-slate-800 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30">
      {/* Brand Header */}
      <div>
        <div className="p-5 border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25 ring-1 ring-white/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base tracking-tight text-white">RevenueAI</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">
                  AGENT
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Autonomous Recovery</p>
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-3 space-y-1.5 mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-600/20 to-purple-600/10 text-white border border-indigo-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80 border border-transparent'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-5 h-5 transition-colors ${
                          isActive
                            ? 'text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]'
                            : 'text-slate-400 group-hover:text-slate-300'
                        }`}
                      />
                      <div className="flex flex-col text-left">
                        <span className="font-semibold text-xs tracking-wide">{item.label}</span>
                        <span className="text-[10px] text-slate-500 font-normal leading-tight">
                          {item.description}
                        </span>
                      </div>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isActive
                            ? 'bg-indigo-500 text-white'
                            : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Integration & Agent Status Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
        <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Activity className="w-3 h-3 text-emerald-400" />
              Engine Health
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-semibold">
              <span className={`w-1.5 h-1.5 rounded-full ${healthStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              {healthStatus?.connected ? 'Active' : 'Standby'}
            </span>
          </div>

          <div className="space-y-1 pt-1 border-t border-slate-800/60 text-[10px]">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <CreditCard className="w-3 h-3 text-indigo-400" /> Razorpay
              </span>
              <span className={healthStatus?.razorpay ? 'text-emerald-400 font-mono' : 'text-slate-400 font-mono'}>
                {healthStatus?.razorpay ? 'Connected' : 'Mock'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <Database className="w-3 h-3 text-sky-400" /> Supabase
              </span>
              <span className={healthStatus?.supabase ? 'text-emerald-400 font-mono' : 'text-slate-400 font-mono'}>
                {healthStatus?.supabase ? 'Synced' : 'Local'}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1 text-slate-400">
                <Sparkles className="w-3 h-3 text-amber-400" /> Gemini Agent
              </span>
              <span className="text-amber-300 font-mono">3.6 Flash</span>
            </div>
          </div>
        </div>

        <div className="mt-3 text-center">
          <span className="text-[10px] text-slate-500 font-mono">
            Hackathon Demo • Localhost Mode
          </span>
        </div>
      </div>
    </aside>
  );
};
