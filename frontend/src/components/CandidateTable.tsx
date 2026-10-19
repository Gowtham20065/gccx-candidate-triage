import React from 'react';
import type { Candidate, TriageStatus } from '../types/candidate';
import { StatusBadge } from './StatusBadge';

interface CandidateTableProps {
  candidates: Candidate[];
  isLoading: boolean;
  onSelectCandidate: (candidate: Candidate) => void;
  onUpdateStatus: (id: string, newStatus: TriageStatus) => Promise<void>;
  updatingCandidateId: string | null;
  updatingStatus: TriageStatus | null;
}

export const CandidateTable: React.FC<CandidateTableProps> = ({
  candidates,
  isLoading,
  onSelectCandidate,
  onUpdateStatus,
  updatingCandidateId,
  updatingStatus,
}) => {
  if (isLoading) {
    return (
      <div className="table-card" aria-busy="true" aria-label="Loading candidate table">
        <div className="table-responsive">
          <table className="candidates-table">
            <thead>
              <tr>
                <th>Candidate</th>
                <th>Target Role</th>
                <th>Exp</th>
                <th>Key Skills</th>
                <th>Source</th>
                <th>Applied Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 6 }).map((_, idx) => (
                <tr key={idx}>
                  <td colSpan={8}>
                    <div className="skeleton-row" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (candidates.length === 0) {
    return (
      <div className="table-card">
        <div className="state-container" role="status">
          <span style={{ fontSize: '2.5rem' }}>📋</span>
          <h2 className="state-title">No candidates match your criteria</h2>
          <p className="state-desc">
            Try adjusting your search query, status filters, or experience range to find candidates.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="table-card">
      <div className="table-responsive">
        <table className="candidates-table" aria-label="Candidates triage table">
          <thead>
            <tr>
              <th scope="col">Candidate</th>
              <th scope="col">Target Role</th>
              <th scope="col">Exp</th>
              <th scope="col">Key Skills</th>
              <th scope="col">Source</th>
              <th scope="col">Applied Date</th>
              <th scope="col">Status</th>
              <th scope="col">Triage Actions</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((candidate) => {
              const isUpdating = updatingCandidateId === candidate.id;
              const skillsToShow = candidate.skills.slice(0, 3);
              const extraCount = candidate.skills.length - skillsToShow.length;

              return (
                <tr key={candidate.id}>
                  {/* Candidate Name & ID */}
                  <td>
                    <div className="candidate-name-cell">
                      <button
                        type="button"
                        className="candidate-name"
                        onClick={() => onSelectCandidate(candidate)}
                        aria-label={`View full dossier for ${candidate.name}`}
                      >
                        {candidate.name}
                      </button>
                      <span className="candidate-id-sub">{candidate.id}</span>
                    </div>
                  </td>

                  {/* Target Role */}
                  <td>
                    <span className="candidate-role">{candidate.target_role}</span>
                  </td>

                  {/* Experience */}
                  <td>
                    <span>{candidate.years_experience} yrs</span>
                  </td>

                  {/* Skills tags */}
                  <td>
                    <div className="skills-pill-list">
                      {skillsToShow.map((skill) => (
                        <span key={skill} className="skill-tag">
                          {skill}
                        </span>
                      ))}
                      {extraCount > 0 && (
                        <span
                          className="skill-tag-more"
                          title={candidate.skills.slice(3).join(', ')}
                        >
                          +{extraCount}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Source */}
                  <td>
                    <span className="candidate-source-badge">{candidate.source}</span>
                  </td>

                  {/* Applied Date */}
                  <td>
                    <span style={{ color: 'var(--text-muted)' }}>{candidate.applied_date}</span>
                  </td>

                  {/* Status */}
                  <td>
                    <StatusBadge status={candidate.status} />
                  </td>

                  {/* Actions */}
                  <td>
                    <div className="row-actions-group" role="group" aria-label={`Triage actions for ${candidate.name}`}>
                      {/* Shortlist Action */}
                      <button
                        type="button"
                        className="action-btn shortlist"
                        disabled={isUpdating || candidate.status === 'shortlisted'}
                        onClick={() => onUpdateStatus(candidate.id, 'shortlisted')}
                        aria-label={`Shortlist ${candidate.name}`}
                        title="Shortlist candidate"
                      >
                        {isUpdating && updatingStatus === 'shortlisted' ? '...' : '✓ Shortlist'}
                      </button>

                      {/* Reject Action */}
                      <button
                        type="button"
                        className="action-btn reject"
                        disabled={isUpdating || candidate.status === 'rejected'}
                        onClick={() => onUpdateStatus(candidate.id, 'rejected')}
                        aria-label={`Reject ${candidate.name}`}
                        title="Reject candidate"
                      >
                        {isUpdating && updatingStatus === 'rejected' ? '...' : '✕ Reject'}
                      </button>

                      {/* Reset to untriaged if already triaged */}
                      {candidate.status !== 'untriaged' && (
                        <button
                          type="button"
                          className="action-btn reset"
                          disabled={isUpdating}
                          onClick={() => onUpdateStatus(candidate.id, 'untriaged')}
                          aria-label={`Reset ${candidate.name} to untriaged`}
                          title="Reset to untriaged"
                        >
                          {isUpdating && updatingStatus === 'untriaged' ? '...' : '↺ Reset'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
