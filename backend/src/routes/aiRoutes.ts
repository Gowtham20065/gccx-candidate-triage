import { Router, type Request, type Response, type NextFunction } from 'express';
import type Database from 'better-sqlite3';
import { getCandidateById } from '../repositories/candidateRepo';
import { GeminiService, GeminiServiceError } from '../services/geminiService';

export function createAiRouter(db: Database.Database, customService?: GeminiService): Router {
  const router = Router();
  const geminiService = customService || new GeminiService();

  /**
   * POST /api/ai/candidate-fit
   * Evaluates a candidate profile from the database against a recruiter job description.
   */
  router.post('/candidate-fit', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { candidateId, jobDescription } = req.body || {};

      // Validate candidateId
      if (!candidateId || typeof candidateId !== 'string' || candidateId.trim().length === 0) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: "Field 'candidateId' is required and must be a non-empty string.",
          },
        });
        return;
      }

      // Validate jobDescription
      if (!jobDescription || typeof jobDescription !== 'string') {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: "Field 'jobDescription' is required and must be a string.",
          },
        });
        return;
      }

      const trimmedJd = jobDescription.trim();
      if (trimmedJd.length < 10) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: "Job description is too short. Please provide at least 10 characters.",
          },
        });
        return;
      }

      if (trimmedJd.length > 3000) {
        res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: "Job description exceeds maximum allowed length of 3,000 characters.",
          },
        });
        return;
      }

      // Fetch candidate facts strictly from server database (never trust client attributes)
      const candidate = getCandidateById(db, candidateId.trim());
      if (!candidate) {
        res.status(404).json({
          error: {
            code: 'NOT_FOUND',
            message: `Candidate with ID '${candidateId}' was not found in the database.`,
          },
        });
        return;
      }

      // Call Gemini Service
      const result = await geminiService.evaluateCandidateFit({
        candidate,
        jobDescription: trimmedJd,
      });

      res.json({ data: result });
    } catch (err: any) {
      if (err instanceof GeminiServiceError) {
        res.status(err.statusCode).json({
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }
      next(err);
    }
  });

  return router;
}
