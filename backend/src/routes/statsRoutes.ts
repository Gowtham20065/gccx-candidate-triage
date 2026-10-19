import { Router, type Request, type Response, type NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { getTriageStats } from '../repositories/candidateRepo';

export function createStatsRouter(db: Database.Database): Router {
  const router = Router();

  /**
   * GET /api/stats
   * Returns aggregate candidate triage counts via a single GROUP BY query.
   */
  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const stats = getTriageStats(db);
      res.json(stats);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
