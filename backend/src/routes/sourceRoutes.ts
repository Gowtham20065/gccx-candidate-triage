import { Router, type Request, type Response, type NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { listSources } from '../repositories/candidateRepo';

export function createSourceRouter(db: Database.Database): Router {
  const router = Router();

  /**
   * GET /api/sources
   * Returns all available unique candidate recruitment sources.
   */
  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const sources = listSources(db);
      res.json({
        data: sources,
        total: sources.length,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
