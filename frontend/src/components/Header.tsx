import React from 'react';

interface HeaderProps {
  backendConnected: boolean;
  totalCandidates: number;
}

export const Header: React.FC<HeaderProps> = ({ backendConnected, totalCandidates }) => {
  return (
    <header className="app-header" role="banner">
      <div className="brand-wrapper">
        <div className="brand-logo" aria-hidden="true">GCCX</div>
        <div>
          <h1 className="brand-title">Candidate Triage Operations</h1>
          <p className="brand-subtitle">Round 1 Case Study — Global Engineering Search</p>
        </div>
      </div>

      <div className="header-status-pill" aria-label="Backend status">
        <span
          className={`status-dot ${backendConnected ? '' : 'disconnected'}`}
          aria-hidden="true"
        />
        <span>
          {backendConnected
            ? `API Online (${totalCandidates} candidates loaded)`
            : 'Connecting to API...'}
        </span>
      </div>
    </header>
  );
};
