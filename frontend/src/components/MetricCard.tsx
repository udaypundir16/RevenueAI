import React from 'react';

interface MetricCardProps {
  title: string;
  value: string;
  change?: string;
  isPositive?: boolean;
  subtitle: string;
  icon: React.ReactNode;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  isPositive = true,
  subtitle,
  icon,
}) => {
  return (
    <div
      className="th-card relative overflow-hidden p-5 group cursor-default"
      style={{ borderRadius: 14 }}
    >
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background: isPositive
            ? 'linear-gradient(90deg, transparent, var(--success), transparent)'
            : 'linear-gradient(90deg, transparent, var(--danger), transparent)',
          opacity: 0.4,
        }}
      />

      <div className="flex items-start justify-between">
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          {title}
        </span>
        <div
          className="p-2 rounded-lg shrink-0"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {icon}
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {value}
          </span>
          {change && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: isPositive ? 'var(--success-muted)' : 'var(--danger-muted)',
                color: isPositive ? 'var(--success)' : 'var(--danger)',
                border: `1px solid ${isPositive ? 'var(--success-border)' : 'var(--danger-border)'}`,
              }}
            >
              {change}
            </span>
          )}
        </div>
        <p className="mt-2 text-[11px] leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
          {subtitle}
        </p>
      </div>
    </div>
  );
};
