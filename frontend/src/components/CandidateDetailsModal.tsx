import React, { useEffect, useRef, useState } from 'react';
import type { Candidate, CandidateFitResult, TriageStatus } from '../types/candidate';
import { StatusBadge } from './StatusBadge';
import { evaluateCandidateFit } from '../services/api';

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

  const [jobDescription, setJobDescription] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [fitResult, setFitResult] = useState<CandidateFitResult | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);

  // Initialize preset job description and reset evaluation state when candidate changes
  useEffect(() => {
    if (candidate) {
      setJobDescription(
        `Seeking a qualified ${candidate.target_role} with proven hands-on experience, solid engineering fundamentals, and strong team communication.`
      );
      setFitResult(null);
      setEvalError(null);
      setIsEvaluating(false);
    }
  }, [candidate?.id]);

  const handleEvaluateFit = async () => {
    if (!candidate || !jobDescription.trim() || isEvaluating) return;

    try {
      setIsEvaluating(true);
      setEvalError(null);
      const result = await evaluateCandidateFit(candidate.id, jobDescription.trim());
      setFitResult(result);
    } catch (err: any) {
      setEvalError(err?.message || 'Failed to evaluate candidate fit with AI.');
    } finally {
      setIsEvaluating(false);
    }
  };

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

          {/* AI Candidate-Fit Evaluation Section */}
          <div className="drawer-section">
            <span className="drawer-section-title">AI Candidate-Fit Evaluation (Gemini)</span>

            <div className="ai-eval-container">
              <div className="ai-eval-header">
                <div className="ai-eval-title">
                  <span>⚡</span>
                  <span>Fit Summary & Gap Analysis</span>
                </div>
                <span className="ai-eval-badge">Decision Support</span>
              </div>

              {/* Quick Presets */}
              <div className="ai-presets-row" role="group" aria-label="Job description presets">
                <span className="ai-preset-label">Presets:</span>
                <button
                  type="button"
                  className="ai-preset-btn"
                  onClick={() =>
                    setJobDescription(
                      `Seeking a qualified ${candidate.target_role} with proven hands-on industry experience, solid engineering fundamentals, and strong team communication.`
                    )
                  }
                >
                  {candidate.target_role}
                </button>
                <button
                  type="button"
                  className="ai-preset-btn"
                  onClick={() =>
                    setJobDescription(
                      'Senior Full-Stack Engineer with 4+ years building production applications using React, TypeScript, Node.js, and relational databases.'
                    )
                  }
                >
                  Full-Stack (4+ yrs)
                </button>
                <button
                  type="button"
                  className="ai-preset-btn"
                  onClick={() =>
                    setJobDescription(
                      'Frontend Engineer specializing in React, TypeScript, accessible web UI components, and state management.'
                    )
                  }
                >
                  Frontend Specialist
                </button>
                <button
                  type="button"
                  className="ai-preset-btn"
                  onClick={() =>
                    setJobDescription(
                      'Backend & Distributed Systems Engineer with Docker, Kubernetes, microservices architecture, and high-throughput databases.'
                    )
                  }
                >
                  Backend & Systems
                </button>
              </div>

              {/* Job Description Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <textarea
                  className="ai-jd-textarea"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Enter or paste a job description (10 - 3,000 characters) to evaluate this candidate against..."
                  rows={3}
                  maxLength={3000}
                  aria-label="Job description for AI evaluation"
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.6875rem', color: 'var(--text-dim)' }}>
                  {jobDescription.length} / 3,000 chars
                </div>
              </div>

              {/* Action Button */}
              <div className="ai-actions-row">
                <button
                  type="button"
                  className="ai-eval-btn"
                  disabled={isEvaluating || jobDescription.trim().length < 10}
                  onClick={handleEvaluateFit}
                >
                  {isEvaluating ? (
                    <>
                      <span className="spinner" style={{ width: 14, height: 14 }} />
                      <span>Evaluating with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <span>✨</span>
                      <span>Evaluate Fit with Gemini</span>
                    </>
                  )}
                </button>
              </div>

              {/* Error Banner */}
              {evalError && (
                <div className="ai-error-box" role="alert">
                  <div>
                    <strong>Evaluation Failed:</strong> {evalError}
                  </div>
                  <button
                    type="button"
                    className="ai-error-retry-btn"
                    onClick={handleEvaluateFit}
                  >
                    Retry
                  </button>
                </div>
              )}

              {/* Evaluation Results Card */}
              {fitResult && (
                <div className="ai-result-card" aria-live="polite">
                  <div className="ai-result-header">
                    <span className={`fit-level-pill ${fitResult.fitLevel}`}>
                      Fit Level: {fitResult.fitLevel}
                    </span>
                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-dim)', fontFamily: 'monospace' }}>
                      Model: {fitResult.model}
                    </span>
                  </div>

                  {/* One-Line Summary */}
                  <div className="ai-one-line-summary">
                    "{fitResult.oneLineSummary}"
                  </div>

                  {/* Skills Grid */}
                  <div className="ai-skills-grid">
                    <div className="ai-skill-col">
                      <span className="ai-col-title">
                        ✓ Supported Skills ({fitResult.supportedSkills.length})
                      </span>
                      <div className="ai-chip-list">
                        {fitResult.supportedSkills.length > 0 ? (
                          fitResult.supportedSkills.map((s) => (
                            <span key={s} className="ai-chip supported">
                              ✓ {s}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            None directly matched
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="ai-skill-col">
                      <span className="ai-col-title">
                        ⚠ Missing / Unverified ({fitResult.missingOrUnverifiedSkills.length})
                      </span>
                      <div className="ai-chip-list">
                        {fitResult.missingOrUnverifiedSkills.length > 0 ? (
                          fitResult.missingOrUnverifiedSkills.map((s) => (
                            <span key={s} className="ai-chip missing">
                              ? {s}
                            </span>
                          ))
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                            No major missing requirements noted
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Experience Fit */}
                  <div className="ai-detail-block">
                    <span className="ai-detail-label">Experience Seniority Assessment</span>
                    <p className="ai-detail-text">{fitResult.experienceFit}</p>
                  </div>

                  {/* Grounded Rationale */}
                  <div className="ai-detail-block">
                    <span className="ai-detail-label">Evidence-Grounded Rationale</span>
                    <p className="ai-detail-text">{fitResult.fitRationale}</p>
                  </div>

                  {/* Uncertainties / Probing Flags */}
                  <div className="ai-detail-block">
                    <span className="ai-detail-label">Interview Probing & Flags</span>
                    <p className="ai-detail-text" style={{ color: '#fed7aa' }}>
                      {fitResult.uncertaintiesOrRisks}
                    </p>
                  </div>

                  {/* Human In The Loop Disclaimer */}
                  <div className="ai-disclaimer">
                    ⚖️ {fitResult.disclaimer}
                  </div>
                </div>
              )}
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
