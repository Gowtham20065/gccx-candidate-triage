import { Router, type Request, type Response, type NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { listSkills } from '../repositories/candidateRepo';

export function createSkillRouter(db: Database.Database): Router {
  const router = Router();

  /**
   * GET /api/skills
   * Returns all available unique skills and candidate association counts.
   */
  router.get('/', (_req: Request, res: Response, next: NextFunction) => {
    try {
      const skills = listSkills(db);
      res.json({
        data: skills,
        total: skills.length,
      });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
