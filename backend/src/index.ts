import { createApp } from './app';
import { config } from './config';
import { getDatabase, closeDatabase } from './db';
import { seedCandidates } from './db/seed';

function startServer(): void {
  try {
    const db = getDatabase();

    // Auto-seed on first startup if candidates table is empty
    const countRow = db.prepare('SELECT COUNT(*) AS count FROM candidates').get() as { count: number };
    if (countRow.count === 0) {
      console.log('Database empty on startup. Performing initial dataset import...');
      const result = seedCandidates(db);
      console.log(`Initial import complete: loaded ${result.totalCandidatesInDb} candidates across ${result.totalSkillsInDb} skills.`);
    } else {
      console.log(`Database ready with ${countRow.count} candidates.`);
    }

    const app = createApp(db);

    const server = app.listen(config.PORT, () => {
      console.log(`GCCX Candidate Triage Backend running at http://localhost:${config.PORT}`);
      console.log(`Environment: ${config.NODE_ENV}`);
      console.log(`Database file: ${config.DATABASE_PATH}`);
    });

    const gracefulShutdown = () => {
      console.log('Shutting down server...');
      server.close(() => {
        closeDatabase();
        console.log('Database closed. Process exiting.');
        process.exit(0);
      });
    };

    process.on('SIGINT', gracefulShutdown);
    process.on('SIGTERM', gracefulShutdown);
  } catch (err) {
    console.error('Fatal error during backend server startup:', err);
    process.exit(1);
  }
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { createApp, getDatabase };
