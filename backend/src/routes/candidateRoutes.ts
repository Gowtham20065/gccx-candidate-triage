import { Router, type Request, type Response, type NextFunction } from 'express';
import type Database from 'better-sqlite3';
import {
  getCandidateById,
  listCandidates,
  updateCandidateStatus,
} from '../repositories/candidateRepo';
import {
  VALID_TRIAGE_STATUSES,
  type CandidateFilterParams,
  type SortColumn,
  type TriageStatus,
} from '../db/types';

export function createCandidateRouter(db: Database.Database): Router {
  const router = Router();

  /**
   * GET /api/candidates
   * Lists candidates with optional pagination, search, and filters.
   */
  router.get('/', (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        page,
        limit,
        q,
        role,
        source,
        status,
        min_experience,
        max_experience,
        skill,
        sort_by,
        sort_order,
      } = req.query;

      const filters: CandidateFilterParams = {};

      // Validate page
      if (page !== undefined) {
        const parsedPage = Number(page);
        if (!Number.isInteger(parsedPage) || parsedPage < 1) {
          res.status(400).json({
            error: {
              code: 'INVALID_QUERY_PARAMETER',
              message: "Parameter 'page' must be a positive integer greater than or equal to 1.",
            },
          });
          return;
        }
        filters.page = parsedPage;
      }

      // Validate limit
      if (limit !== undefined) {
        const parsedLimit = Number(limit);
        if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
          res.status(400).json({
            error: {
              code: 'INVALID_QUERY_PARAMETER',
              message: "Parameter 'limit' must be an integer between 1 and 100.",
            },
          });
          return;
        }
        filters.limit = parsedLimit;
      }

      // Validate status
      if (status !== undefined) {
        const statusStr = String(status).trim() as TriageStatus;
        if (!VALID_TRIAGE_STATUSES.includes(statusStr)) {
          res.status(400).json({
            error: {
              code: 'INVALID_QUERY_PARAMETER',
              message: `Parameter 'status' must be one of: ${VALID_TRIAGE_STATUSES.join(', ')}.`,
            },
          });
          return;
        }
        filters.status = statusStr;
      }

      // Validate min_experience
      if (min_experience !== undefined) {
        const minExp = Number(min_experience);
        if (isNaN(minExp) || minExp < 0) {
          res.status(400).json({
            error: {
              code: 'INVALID_QUERY_PARAMETER',
              message: "Parameter 'min_experience' must be a non-negative number.",
            },
          });
          return;
        }
        filters.min_experience = minExp;
      }

      // Validate max_experience
      if (max_experience !== undefined) {
        const maxExp = Number(max_experience);
        if (isNaN(maxExp) || maxExp < 0) {
          res.status(400).json({
            error: {
              code: 'INVALID_QUERY_PARAMETER',
              message: "Parameter 'max_experience' must be a non-negative number.",
            },
          });
          return;
        }
        filters.max_experience = maxExp;
      }

      // Validate min_experience does not exceed max_experience
      if (
        filters.min_experience !== undefined &&
        filters.max_experience !== undefined &&
        filters.min_experience > filters.max_experience
      ) {
        res.status(400).json({
          error: {
            code: 'INVALID_QUERY_PARAMETER',
            message: "Parameter 'min_experience' cannot be greater than 'max_experience'.",
          },
        });
        return;
      }

      // String filters
      if (typeof q === 'string') filters.q = q;
      if (typeof role === 'string') filters.role = role;
      if (typeof source === 'string') filters.source = source;
      if (typeof skill === 'string') filters.skill = skill;

      // Sort validations
      if (sort_by !== undefined) {
        const allowedSorts: readonly SortColumn[] = ['applied_date', 'years_experience', 'name', 'id'];
        const sortCandidate = String(sort_by) as SortColumn;
        if (!allowedSorts.includes(sortCandidate)) {
          res.status(400).json({
            error: {
              code: 'INVALID_QUERY_PARAMETER',
              message: `Parameter 'sort_by' must be one of: ${allowedSorts.join(', ')}.`,
            },
          });
          return;
        }
        filters.sort_by = sortCandidate;
      }

      if (sort_order !== undefined) {
        const orderLower = String(sort_order).toLowerCase();
        if (orderLower !== 'asc' && orderLower !== 'desc') {
          res.status(400).json({
            error: {
              code: 'INVALID_QUERY_PARAMETER',
              message: "Parameter 'sort_order' must be either 'asc' or 'desc'.",
            },
          });
          return;
        }
        filters.sort_order = orderLower as 'asc' | 'desc';
      }

      const result = listCandidates(db, filters);
      res.json(result);
    } catch (err) {
      next(err);
    }
  });

  /**
   * GET /api/candidates/:id
   * Returns details for a single candidate.
   */
  router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const candidate = getCandidateById(db, id);

      if (!candidate) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Candidate with ID '${id}' was not found.`,
          },
        });
        return;
      }

      res.json({ data: candidate });
    } catch (err) {
      next(err);
    }
  });

  /**
   * PATCH /api/candidates/:id/status
   * Updates a candidate's triage status.
   */
  router.patch('/:id/status', (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { status } = req.body || {};

      if (!status || typeof status !== 'string') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Missing or invalid 'status' field in request body. Must be one of: ${VALID_TRIAGE_STATUSES.join(', ')}.`,
          },
        });
        return;
      }

      const statusVal = status.trim().toLowerCase() as TriageStatus;
      if (!VALID_TRIAGE_STATUSES.includes(statusVal)) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid triage status '${status}'. Allowed values are: ${VALID_TRIAGE_STATUSES.join(', ')}.`,
          },
        });
        return;
      }

      const updated = updateCandidateStatus(db, id, statusVal);
      if (!updated) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Candidate with ID '${id}' was not found.`,
          },
        });
        return;
      }

      res.json({
        data: updated,
        message: `Candidate triage status successfully updated to '${statusVal}'.`,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
