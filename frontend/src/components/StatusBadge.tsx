import React from 'react';
import type { TriageStatus } from '../types/candidate';

interface StatusBadgeProps {
  status: TriageStatus;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const labelMap: Record<TriageStatus, string> = {
    untriaged: 'Untriaged',
    shortlisted: 'Shortlisted',
    rejected: 'Rejected',
  };

  return (
    <span
      className={`status-pill ${status} ${size === 'sm' ? 'text-xs' : ''}`}
      role="status"
      aria-label={`Status: ${labelMap[status]}`}
    >
      <span className="sr-only">Status: </span>
      {labelMap[status] || status}
    </span>
  );
};
