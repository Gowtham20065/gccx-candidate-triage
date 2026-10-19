import React, { useEffect, useRef } from 'react';
import type { Candidate, TriageStatus } from '../types/candidate';
import { StatusBadge } from './StatusBadge';

interface CandidateDetailsModalProps {
  candidate: Candidate | null;
  onClose: () => void;
  onUpdateStatus: (id: string, newStatus: TriageStatus) => Promise<void>;
  isUpdating: boolean;
  updatingStatus: TriageStatus | null;
}

export const CandidateDetailsModal: React.FC<CandidateDetailsModalProps> = ({
  candidate,
  onClose,
  onUpdateStatus,
  isUpdating,
  updatingStatus,
}) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Focus close button on mount and listen for Escape key
  useEffect(() => {
    if (!candidate) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [candidate, onClose]);

  if (!candidate) return null;

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-candidate-name"
    >
      <div className="drawer-content">
        {/* Header */}
        <div className="drawer-header">
          <div className="drawer-title-group">
            <h2 id="modal-candidate-name">{candidate.name}</h2>
            <p>
              {candidate.target_role} • <span style={{ fontFamily: 'monospace' }}>{candidate.id}</span>
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="drawer-close-btn"
            onClick={onClose}
            aria-label="Close candidate details drawer"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="drawer-body">
          {/* Key Profile Metrics */}
          <div className="drawer-grid-2">
            <div className="drawer-info-card">
              <span className="drawer-info-label">Triage Status</span>
              <div style={{ marginTop: '0.25rem' }}>
                <StatusBadge status={candidate.status} />
              </div>
            </div>

            <div className="drawer-info-card">
              <span className="drawer-info-label">Total Experience</span>
              <div className="drawer-info-value">{candidate.years_experience} Years</div>
            </div>

            <div className="drawer-info-card">
              <span className="drawer-info-label">Sourcing Channel</span>
              <div className="drawer-info-value">{candidate.source}</div>
            </div>

            <div className="drawer-info-card">
              <span className="drawer-info-label">Application Date</span>
              <div className="drawer-info-value">{candidate.applied_date}</div>
            </div>
          </div>

          {/* Recruiter Notes */}
          <div className="drawer-section">
            <span className="drawer-section-title">Qualitative Recruiter Notes</span>
            <div className="notes-card" tabIndex={0} aria-label="Recruiter notes content">
              {candidate.notes || 'No qualitative notes recorded for this applicant.'}
            </div>
          </div>

          {/* Technical Skills */}
          <div className="drawer-section">
            <span className="drawer-section-title">Technical Skills ({candidate.skills.length})</span>
            <div className="skills-pill-list" style={{ maxWidth: '100%' }}>
              {candidate.skills.map((skill) => (
                <span
                  key={skill}
                  className="skill-tag"
                  style={{ fontSize: '0.8125rem', padding: '0.25rem 0.625rem' }}
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Triage Actions Bar */}
        <div className="drawer-actions-bar" role="group" aria-label="Triage action options">
          <button
            type="button"
            className="action-btn shortlist"
            style={{ padding: '0.625rem 1rem', fontSize: '0.875rem' }}
            disabled={isUpdating || candidate.status === 'shortlisted'}
            onClick={() => onUpdateStatus(candidate.id, 'shortlisted')}
          >
            {isUpdating && updatingStatus === 'shortlisted' ? 'Updating...' : '✓ Shortlist Candidate'}
          </button>

          <button
            type="button"
            className="action-btn reject"
            style={{ padding: '0.625rem 1rem', fontSize: '0.875rem' }}
            disabled={isUpdating || candidate.status === 'rejected'}
            onClick={() => onUpdateStatus(candidate.id, 'rejected')}
          >
            {isUpdating && updatingStatus === 'rejected' ? 'Updating...' : '✕ Reject Candidate'}
          </button>

          {candidate.status !== 'untriaged' && (
            <button
              type="button"
              className="action-btn reset"
              style={{ padding: '0.625rem 1rem', fontSize: '0.875rem' }}
              disabled={isUpdating}
              onClick={() => onUpdateStatus(candidate.id, 'untriaged')}
            >
              {isUpdating && updatingStatus === 'untriaged' ? 'Updating...' : '↺ Reset Status'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
