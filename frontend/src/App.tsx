import React, { useCallback, useEffect, useState } from 'react';
import type {
  Candidate,
  CandidateFilterState,
  PaginationMeta,
  SkillItem,
  TriageStats,
  TriageStatus,
} from './types/candidate';
import {
  fetchCandidates,
  fetchHealth,
  fetchRoles,
  fetchSkills,
  fetchSources,
  fetchTriageStats,
  updateCandidateStatus,
} from './services/api';
import { Header } from './components/Header';
import { StatsOverview } from './components/StatsOverview';
import { FilterBar } from './components/FilterBar';
import { CandidateTable } from './components/CandidateTable';
import { CandidateDetailsModal } from './components/CandidateDetailsModal';
import { Pagination } from './components/Pagination';
import { ToastContainer, type ToastMessage } from './components/Toast';

const DEFAULT_FILTERS: CandidateFilterState = {
  q: '',
  status: 'all',
  role: 'all',
  source: 'all',
  skill: 'all',
  min_experience: '',
  max_experience: '',
  sort_by: 'applied_date',
  sort_order: 'desc',
  page: 1,
  limit: 20,
};

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
  hasNextPage: false,
  hasPrevPage: false,
};

export default function App(): React.JSX.Element {
  const [filters, setFilters] = useState<CandidateFilterState>(DEFAULT_FILTERS);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta>(DEFAULT_PAGINATION);
  const [stats, setStats] = useState<TriageStats>({
    total: 0,
    untriaged: 0,
    shortlisted: 0,
    rejected: 0,
  });

  const [availableSkills, setAvailableSkills] = useState<SkillItem[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);

  const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [backendConnected, setBackendConnected] = useState<boolean>(false);

  const [updatingCandidateId, setUpdatingCandidateId] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<TriageStatus | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (type: 'success' | 'error', text: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setToasts((prev) => [...prev, { id, type, text }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load KPI overview statistics
  const loadStats = useCallback(async () => {
    try {
      const statsData = await fetchTriageStats();
      setStats(statsData);
    } catch (err: any) {
      console.warn('Unable to load overview stats:', err.message);
    }
  }, []);

  // Load candidate list matching current filters
  const loadCandidates = useCallback(async (currentFilters: CandidateFilterState) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchCandidates(currentFilters);
      setCandidates(response.data);
      setPagination(response.pagination);
      setBackendConnected(true);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch candidate records.');
      setCandidates([]);
      setBackendConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial metadata and filter vocabulary loading
  useEffect(() => {
    async function initMetadata() {
      try {
        const health = await fetchHealth();
        setBackendConnected(health.status === 'ok');

        const [skillsData, rolesData, sourcesData] = await Promise.all([
          fetchSkills(),
          fetchRoles().catch(() => []),
          fetchSources().catch(() => []),
        ]);
        setAvailableSkills(skillsData);
        if (rolesData.length > 0) {
          setAvailableRoles(rolesData);
        }
        if (sourcesData.length > 0) {
          setAvailableSources(sourcesData);
        }
      } catch (err: any) {
        console.warn('Initial metadata loading error:', err.message);
      }
    }

    initMetadata();
    loadStats();
  }, [loadStats]);

  // Re-fetch candidates when filters change
  useEffect(() => {
    loadCandidates(filters);
  }, [filters, loadCandidates]);

  // Handle triage action mutation
  const handleUpdateStatus = async (id: string, newStatus: TriageStatus) => {
    setUpdatingCandidateId(id);
    setUpdatingStatus(newStatus);
    try {
      const updatedCandidate = await updateCandidateStatus(id, newStatus);

      // Update candidate in local table state
      setCandidates((prev) =>
        prev.map((c) => (c.id === id ? updatedCandidate : c))
      );

      // Update modal candidate if currently open
      if (selectedCandidate && selectedCandidate.id === id) {
        setSelectedCandidate(updatedCandidate);
      }

      addToast(
        'success',
        `Candidate ${updatedCandidate.name} successfully updated to '${newStatus}'.`
      );

      // Refresh overview KPI numbers
      loadStats();
    } catch (err: any) {
      addToast(
        'error',
        `Failed to update status for candidate: ${err.message}`
      );
    } finally {
      setUpdatingCandidateId(null);
      setUpdatingStatus(null);
    }
  };

  const handleFilterChange = (updates: Partial<CandidateFilterState>) => {
    setFilters((prev) => ({
      ...prev,
      ...updates,
      // If a non-page parameter changed, reset to page 1
      page: updates.page !== undefined ? updates.page : 1,
    }));
  };

  const handleResetFilters = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <div className="app-container">
      <Header
        backendConnected={backendConnected}
        totalCandidates={stats.total}
      />

      <main className="app-main" id="main-content">
        {/* KPI Summary Cards */}
        <StatsOverview
          stats={stats}
          currentStatusFilter={filters.status}
          onSelectStatusFilter={(status) => handleFilterChange({ status, page: 1 })}
          isLoading={isLoading && stats.total === 0}
        />

        {/* Filter & Search Bar */}
        <FilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          availableSkills={availableSkills}
          availableRoles={availableRoles}
          availableSources={availableSources}
        />

        {/* Error Alert */}
        {error && (
          <div
            className="toast error"
            style={{ position: 'static', width: '100%', maxWidth: '100%' }}
            role="alert"
          >
            <span>{error}</span>
            <button
              type="button"
              className="action-btn"
              style={{ backgroundColor: '#fff', color: '#000' }}
              onClick={() => loadCandidates(filters)}
            >
              Retry
            </button>
          </div>
        )}

        {/* Candidates Table */}
        <CandidateTable
          candidates={candidates}
          isLoading={isLoading}
          onSelectCandidate={(c) => setSelectedCandidate(c)}
          onUpdateStatus={handleUpdateStatus}
          updatingCandidateId={updatingCandidateId}
          updatingStatus={updatingStatus}
        />

        {/* Pagination */}
        {candidates.length > 0 && (
          <Pagination
            pagination={pagination}
            onPageChange={(page) => handleFilterChange({ page })}
            onLimitChange={(limit) => handleFilterChange({ limit, page: 1 })}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Candidate Details Drawer / Modal */}
      {selectedCandidate && (
        <CandidateDetailsModal
          candidate={selectedCandidate}
          onClose={() => setSelectedCandidate(null)}
          onUpdateStatus={handleUpdateStatus}
          isUpdating={updatingCandidateId === selectedCandidate.id}
          updatingStatus={updatingStatus}
        />
      )}

      {/* Feedback Notifications Toast */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
