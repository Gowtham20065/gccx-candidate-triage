import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { initSchema } from './schema';

/**
 * Creates and configures a better-sqlite3 database instance.
 * Supports in-memory database (e.g., ':memory:') for isolated tests.
 */
export function createDatabase(dbPath: string = config.DATABASE_PATH): Database.Database {
  if (dbPath !== ':memory:') {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(dbPath);

  // Connection pragmas
  db.pragma('foreign_keys = ON');
  if (dbPath !== ':memory:') {
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
  }

  // Initialize schema
  initSchema(db);

  return db;
}

let defaultDbInstance: Database.Database | null = null;

/**
 * Singleton getter for application database instance.
 */
export function getDatabase(): Database.Database {
  if (!defaultDbInstance) {
    defaultDbInstance = createDatabase(config.DATABASE_PATH);
  }
  return defaultDbInstance;
}

/**
 * Closes the default database instance if open.
 */
export function closeDatabase(): void {
  if (defaultDbInstance && defaultDbInstance.open) {
    defaultDbInstance.close();
    defaultDbInstance = null;
  }
}
