import React, { useEffect, useState } from 'react';
import type { CandidateFilterState, SkillItem } from '../types/candidate';

interface FilterBarProps {
  filters: CandidateFilterState;
  onFilterChange: (newFilters: Partial<CandidateFilterState>) => void;
  onResetFilters: () => void;
  availableSkills: SkillItem[];
  availableRoles: string[];
  availableSources: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilters,
  availableSkills,
  availableRoles,
  availableSources,
}) => {
  // Local debounced search query state
  const [localSearch, setLocalSearch] = useState(filters.q);

  useEffect(() => {
    setLocalSearch(filters.q);
  }, [filters.q]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filters.q) {
        onFilterChange({ q: localSearch, page: 1 });
      }
    }, 300);

    return () => clearTimeout(handler);
  }, [localSearch, filters.q, onFilterChange]);

  const hasActiveFilters =
    Boolean(filters.q) ||
    filters.status !== 'all' ||
    filters.role !== 'all' ||
    filters.source !== 'all' ||
    filters.skill !== 'all' ||
    filters.min_experience !== '' ||
    filters.max_experience !== '' ||
    filters.sort_by !== 'applied_date' ||
    filters.sort_order !== 'desc';

  return (
    <section className="filter-container" aria-label="Search and candidate filter controls">
      {/* Primary search and sort controls */}
      <div className="filter-row-primary">
        <div className="search-input-wrapper">
          <span className="search-icon-left" aria-hidden="true">🔍</span>
          <input
            type="search"
            className="search-input"
            placeholder="Search candidates by name, notes, role, or skills..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            aria-label="Search candidates"
          />
          {localSearch && (
            <button
              type="button"
              className="search-clear-btn"
              onClick={() => {
                setLocalSearch('');
                onFilterChange({ q: '', page: 1 });
              }}
              aria-label="Clear search query"
            >
              ✕
            </button>
          )}
        </div>

        {/* Sort Controls */}
        <select
          className="filter-select"
          value={filters.sort_by}
          onChange={(e) => onFilterChange({ sort_by: e.target.value as any, page: 1 })}
          aria-label="Sort candidates by field"
        >
          <option value="applied_date">Sort: Applied Date</option>
          <option value="years_experience">Sort: Experience</option>
          <option value="name">Sort: Candidate Name</option>
          <option value="id">Sort: Candidate ID</option>
        </select>

        <select
          className="filter-select"
          value={filters.sort_order}
          onChange={(e) => onFilterChange({ sort_order: e.target.value as any, page: 1 })}
          aria-label="Sort order direction"
        >
          <option value="desc">Descending ↓</option>
          <option value="asc">Ascending ↑</option>
        </select>

        {hasActiveFilters && (
          <button
            type="button"
            className="filter-reset-btn"
            onClick={onResetFilters}
            aria-label="Reset all filters"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Secondary filter dropdowns */}
      <div className="filter-row-secondary">
        {/* Status Filter */}
        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
          aria-label="Filter by triage status"
        >
          <option value="all">All Statuses</option>
          <option value="untriaged">Untriaged</option>
          <option value="shortlisted">Shortlisted</option>
          <option value="rejected">Rejected</option>
        </select>

        {/* Role Filter */}
        <select
          className="filter-select"
          value={filters.role}
          onChange={(e) => onFilterChange({ role: e.target.value, page: 1 })}
          aria-label="Filter by target role"
        >
          <option value="all">All Roles</option>
          {availableRoles.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>

        {/* Source Filter */}
        <select
          className="filter-select"
          value={filters.source}
          onChange={(e) => onFilterChange({ source: e.target.value, page: 1 })}
          aria-label="Filter by sourcing channel"
        >
          <option value="all">All Sources</option>
          {availableSources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>

        {/* Skill Filter */}
        <select
          className="filter-select"
          value={filters.skill}
          onChange={(e) => onFilterChange({ skill: e.target.value, page: 1 })}
          aria-label="Filter by skill tag"
        >
          <option value="all">All Skills</option>
          {availableSkills.map((s) => (
            <option key={s.name} value={s.name}>
              {s.name} ({s.count})
            </option>
          ))}
        </select>

        {/* Experience Range */}
        <div className="filter-exp-group" role="group" aria-label="Experience years filter range">
          <span>Exp:</span>
          <input
            type="number"
            min="0"
            max="30"
            placeholder="Min"
            className="filter-exp-input"
            value={filters.min_experience}
            onChange={(e) => onFilterChange({ min_experience: e.target.value, page: 1 })}
            aria-label="Minimum experience years"
          />
          <span>–</span>
          <input
            type="number"
            min="0"
            max="30"
            placeholder="Max"
            className="filter-exp-input"
            value={filters.max_experience}
            onChange={(e) => onFilterChange({ max_experience: e.target.value, page: 1 })}
            aria-label="Maximum experience years"
          />
          <span>yrs</span>
        </div>
      </div>

      {/* Active filter pills */}
      {hasActiveFilters && (
        <div className="active-filters-row">
          <span>Active filters:</span>
          {filters.q && (
            <span className="filter-pill">
              Search: "{filters.q}"
              <button
                type="button"
                className="filter-pill-remove"
                onClick={() => onFilterChange({ q: '', page: 1 })}
                aria-label="Remove search filter"
              >
                ✕
              </button>
            </span>
          )}
          {filters.status !== 'all' && (
            <span className="filter-pill">
              Status: {filters.status}
              <button
                type="button"
                className="filter-pill-remove"
                onClick={() => onFilterChange({ status: 'all', page: 1 })}
                aria-label="Remove status filter"
              >
                ✕
              </button>
            </span>
          )}
          {filters.role !== 'all' && (
            <span className="filter-pill">
              Role: {filters.role}
              <button
                type="button"
                className="filter-pill-remove"
                onClick={() => onFilterChange({ role: 'all', page: 1 })}
                aria-label="Remove role filter"
              >
                ✕
              </button>
            </span>
          )}
          {filters.source !== 'all' && (
            <span className="filter-pill">
              Source: {filters.source}
              <button
                type="button"
                className="filter-pill-remove"
                onClick={() => onFilterChange({ source: 'all', page: 1 })}
                aria-label="Remove source filter"
              >
                ✕
              </button>
            </span>
          )}
          {filters.skill !== 'all' && (
            <span className="filter-pill">
              Skill: {filters.skill}
              <button
                type="button"
                className="filter-pill-remove"
                onClick={() => onFilterChange({ skill: 'all', page: 1 })}
                aria-label="Remove skill filter"
              >
                ✕
              </button>
            </span>
          )}
          {(filters.min_experience || filters.max_experience) && (
            <span className="filter-pill">
              Exp: {filters.min_experience || 0}–{filters.max_experience || '∞'} yrs
              <button
                type="button"
                className="filter-pill-remove"
                onClick={() => onFilterChange({ min_experience: '', max_experience: '', page: 1 })}
                aria-label="Remove experience filter"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </section>
  );
};
