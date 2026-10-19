import { Router, type Request, type Response, type NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { listRoles } from '../repositories/candidateRepo';

export function createRoleRouter(db: Database.Database): Router {
  const router = Router();

  /**
   * GET /api/roles
   * Returns all available unique candidate target roles.
   */
  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const roles = listRoles(db);
      res.json({
        data: roles,
        total: roles.length,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
