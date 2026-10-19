import React from 'react';
import type { PaginationMeta } from '../types/candidate';

interface PaginationProps {
  pagination: PaginationMeta;
  onPageChange: (newPage: number) => void;
  onLimitChange: (newLimit: number) => void;
  isLoading: boolean;
}

export const Pagination: React.FC<PaginationProps> = ({
  pagination,
  onPageChange,
  onLimitChange,
  isLoading,
}) => {
  const { page, limit, total, totalPages, hasNextPage, hasPrevPage } = pagination;

  const startRecord = total === 0 ? 0 : (page - 1) * limit + 1;
  const endRecord = Math.min(page * limit, total);

  // Generate page numbers to display
  const pages: number[] = [];
  for (let i = 1; i <= totalPages; i++) {
    // Show first, last, and current +/- 1
    if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
      pages.push(i);
    }
  }

  return (
    <nav
      className="pagination-container"
      role="navigation"
      aria-label="Candidate table pagination"
    >
      <div className="pagination-info">
        Showing <strong>{startRecord}</strong> to <strong>{endRecord}</strong> of{' '}
        <strong>{total}</strong> candidates
      </div>

      <div className="pagination-controls">
        <label htmlFor="limit-select" className="sr-only">
          Candidates per page
        </label>
        <select
          id="limit-select"
          className="filter-select"
          style={{ minWidth: '90px', padding: '0.375rem 0.5rem', marginRight: '0.5rem' }}
          value={limit}
          onChange={(e) => onLimitChange(Number(e.target.value))}
          disabled={isLoading}
          aria-label="Select candidates per page"
        >
          <option value={10}>10 / page</option>
          <option value={20}>20 / page</option>
          <option value={50}>50 / page</option>
        </select>

        {/* Previous Page */}
        <button
          type="button"
          className="pagination-btn"
          disabled={!hasPrevPage || isLoading}
          onClick={() => onPageChange(page - 1)}
          aria-label="Go to previous page"
        >
          ← Prev
        </button>

        {/* Page numbers */}
        {pages.map((p, idx) => {
          const prevP = pages[idx - 1];
          const showEllipsis = prevP && p - prevP > 1;

          return (
            <React.Fragment key={p}>
              {showEllipsis && <span style={{ color: 'var(--text-dim)', padding: '0 0.25rem' }}>...</span>}
              <button
                type="button"
                className={`pagination-btn ${p === page ? 'active' : ''}`}
                disabled={isLoading}
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                aria-label={`Page ${p}`}
              >
                {p}
              </button>
            </React.Fragment>
          );
        })}

        {/* Next Page */}
        <button
          type="button"
          className="pagination-btn"
          disabled={!hasNextPage || isLoading}
          onClick={() => onPageChange(page + 1)}
          aria-label="Go to next page"
        >
          Next →
        </button>
      </div>
    </nav>
  );
};
