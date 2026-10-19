import express, { type Express, type Request, type Response } from 'express';
import cors from 'cors';
import type Database from 'better-sqlite3';
import { config } from './config';
import { createCandidateRouter } from './routes/candidateRoutes';
import { createSkillRouter } from './routes/skillRoutes';
import { createAiRouter } from './routes/aiRoutes';
import { GeminiService } from './services/geminiService';
import { errorHandler } from './middleware/errorHandler';

/**
 * Creates and configures the Express application with dependency-injected database and AI service.
 */
export function createApp(db: Database.Database, geminiService?: GeminiService): Express {
  const app = express();

  // Basic security and parsing middleware
  app.use(cors({
    origin: config.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }));
  app.use(express.json());

  // Health endpoint
  app.get('/health', (_req: Request, res: Response) => {
    try {
      const candidateCountRow = db.prepare('SELECT COUNT(*) AS count FROM candidates').get() as { count: number };
      res.json({
        status: 'ok',
        service: 'gccx-candidate-triage-backend',
        timestamp: new Date().toISOString(),
        database: {
          connected: db.open,
          candidateCount: candidateCountRow.count,
        },
      });
    } catch (err: any) {
      res.status(503).json({
        status: 'unhealthy',
        error: err.message,
      });
    }
  });

  // REST API Endpoints
  app.use('/api/candidates', createCandidateRouter(db));
  app.use('/api/skills', createSkillRouter(db));
  app.use('/api/ai', createAiRouter(db, geminiService));

  // Catch-all for undefined routes
  app.use('*', (req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Endpoint '${req.method} ${req.originalUrl}' does not exist.`,
      },
    });
  });

  // Global error handler (never leaks stack traces)
  app.use(errorHandler);

  return app;
}
