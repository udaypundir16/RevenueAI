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
  Sun,
  Moon,
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface SidebarProps {
  healthStatus?: {
    connected: boolean;
    razorpay: boolean;
    supabase: boolean;
    gemini: boolean;
  };
}

export const Sidebar: React.FC<SidebarProps> = ({ healthStatus }) => {
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    {
      to: '/',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: 'Live',
    },
    {
      to: '/transactions',
      label: 'Transactions',
      icon: ReceiptText,
      badge: null,
    },
    {
      to: '/playbook',
      label: 'Playbook',
      icon: SlidersHorizontal,
      badge: null,
    },
    {
      to: '/messages',
      label: 'Messages',
      icon: MessageSquareQuote,
      badge: null,
    },
  ];

  return (
    <aside
      className="th-sidebar w-60 flex flex-col justify-between h-screen sticky top-0 shrink-0 select-none z-30"
      style={{ minWidth: 240 }}
    >
      {/* Brand Header */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div
          className="px-5 py-4 flex items-center gap-3"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {/* Logo mark */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            }}
          >
            <Zap className="w-4.5 h-4.5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm tracking-tight th-text-primary">RevenueAI</span>
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wider"
                style={{
                  background: 'var(--accent-muted)',
                  color: 'var(--accent-hover)',
                  border: '1px solid var(--accent-border)',
                }}
              >
                Agent
              </span>
            </div>
            <p className="text-[11px] th-text-tertiary font-medium mt-0.5">Autonomous Recovery</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `th-nav-item ${isActive ? 'th-nav-item-active' : ''} flex items-center justify-between px-3 py-2.5 text-sm font-medium`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors`}
                        style={{ color: isActive ? 'var(--accent-hover)' : 'var(--text-tertiary)' }}
                      />
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}
                      >
                        {item.label}
                      </span>
                    </div>
                    {item.badge && (
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider"
                        style={
                          isActive
                            ? { background: 'var(--accent)', color: '#fff' }
                            : { background: 'var(--bg-overlay)', color: 'var(--text-tertiary)' }
                        }
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

      {/* Footer: Status + Theme Toggle */}
      <div
        className="px-3 pb-4 pt-3 space-y-3"
        style={{ borderTop: '1px solid var(--border-subtle)' }}
      >
        {/* System Health */}
        <div
          className="rounded-xl px-3 py-2.5 space-y-2"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="flex items-center justify-between">
            <span
              className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <Activity className="w-3 h-3" style={{ color: 'var(--success)' }} />
              Engine Health
            </span>
            <span
              className="flex items-center gap-1 text-[10px] font-semibold"
              style={{ color: 'var(--success)' }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: 'var(--success)' }}
              />
              {healthStatus?.connected ? 'Active' : 'Standby'}
            </span>
          </div>
          <div className="space-y-1.5" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 6 }}>
            {[
              { icon: CreditCard, label: 'Razorpay', value: healthStatus?.razorpay ? 'Connected' : 'Mock', ok: healthStatus?.razorpay, color: 'var(--accent-hover)' },
              { icon: Database, label: 'Supabase', value: healthStatus?.supabase ? 'Synced' : 'Local', ok: healthStatus?.supabase, color: 'var(--sky)' },
              { icon: Sparkles, label: 'Gemini', value: '3.6 Flash', ok: true, color: 'var(--warning)' },
            ].map(({ icon: Icon, label, value, ok, color }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                  <Icon className="w-3 h-3" style={{ color }} />
                  {label}
                </span>
                <span
                  className="text-[10px] font-mono font-semibold"
                  style={{ color: ok ? 'var(--success)' : 'var(--text-tertiary)' }}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="th-btn-ghost w-full flex items-center justify-between px-3 py-2 text-xs"
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          <span className="flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5" style={{ color: 'var(--warning)' }} />
            ) : (
              <Moon className="w-3.5 h-3.5" style={{ color: 'var(--accent-hover)' }} />
            )}
            <span className="font-medium">{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </span>
          {/* Toggle pill */}
          <div
            className="relative w-8 h-4.5 rounded-full flex items-center px-0.5 shrink-0"
            style={{
              width: 32,
              height: 18,
              background: theme === 'dark' ? 'var(--bg-overlay)' : 'var(--accent)',
              border: '1px solid var(--border-default)',
              transition: 'background 0.2s ease',
            }}
          >
            <div
              style={{
                width: 13,
                height: 13,
                borderRadius: 9999,
                background: theme === 'dark' ? 'var(--text-tertiary)' : '#fff',
                transform: theme === 'dark' ? 'translateX(0)' : 'translateX(14px)',
                transition: 'transform 0.2s ease, background 0.2s ease',
              }}
            />
          </div>
        </button>

        <p className="text-center text-[10px]" style={{ color: 'var(--text-disabled)' }}>
          Hackathon Demo • v0.1.0
        </p>
      </div>
    </aside>
  );
};
