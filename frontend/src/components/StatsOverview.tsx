import React from 'react';
import type { TriageStats } from '../types/candidate';

interface StatsOverviewProps {
  stats: TriageStats;
  currentStatusFilter: string;
  onSelectStatusFilter: (status: string) => void;
  isLoading: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  stats,
  currentStatusFilter,
  onSelectStatusFilter,
  isLoading,
}) => {
  const cards = [
    {
      id: 'all',
      label: 'Total Candidates',
      count: stats.total,
      badge: 'All Pools',
      badgeClass: 'metric-badge',
      badgeStyle: { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#cbd5e1' },
    },
    {
      id: 'untriaged',
      label: 'Needs Review',
      count: stats.untriaged,
      badge: 'Untriaged',
      badgeClass: 'metric-badge',
      badgeStyle: { backgroundColor: 'var(--status-untriaged-bg)', color: 'var(--status-untriaged-text)' },
    },
    {
      id: 'shortlisted',
      label: 'Shortlisted',
      count: stats.shortlisted,
      badge: 'Progressing',
      badgeClass: 'metric-badge',
      badgeStyle: { backgroundColor: 'var(--status-shortlisted-bg)', color: 'var(--status-shortlisted-text)' },
    },
    {
      id: 'rejected',
      label: 'Archived',
      count: stats.rejected,
      badge: 'Rejected',
      badgeClass: 'metric-badge',
      badgeStyle: { backgroundColor: 'var(--status-rejected-bg)', color: 'var(--status-rejected-text)' },
    },
  ];

  return (
    <section className="metrics-grid" aria-label="Triage Overview Statistics">
      {cards.map((card) => {
        const isActive = currentStatusFilter === card.id;
        return (
          <button
            key={card.id}
            type="button"
            className={`metric-card interactive ${isActive ? 'active-filter' : ''}`}
            onClick={() => onSelectStatusFilter(isActive && card.id !== 'all' ? 'all' : card.id)}
            aria-pressed={isActive}
            aria-label={`Filter by ${card.label}: ${card.count} candidates`}
          >
            <span className="metric-label">{card.label}</span>
            <div className="metric-value-row">
              <span className="metric-value">
                {isLoading ? '...' : card.count.toLocaleString()}
              </span>
              <span className={card.badgeClass} style={card.badgeStyle}>
                {card.badge}
              </span>
            </div>
          </button>
        );
      })}
    </section>
  );
};
