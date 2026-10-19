import type Database from 'better-sqlite3';

export const SCHEMA_SQL = `
-- Enforce foreign key constraints
PRAGMA foreign_keys = ON;

-- Candidates core table
CREATE TABLE IF NOT EXISTS candidates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  target_role TEXT NOT NULL,
  years_experience INTEGER NOT NULL,
  source TEXT NOT NULL,
  notes TEXT NOT NULL,
  applied_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'untriaged' CHECK (status IN ('untriaged', 'shortlisted', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Normalized skills table
CREATE TABLE IF NOT EXISTS skills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

-- Many-to-many junction table linking candidates and skills
CREATE TABLE IF NOT EXISTS candidate_skills (
  candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE,
  PRIMARY KEY (candidate_id, skill_id)
);

-- Performance indexes for frequent search, filter, and join queries
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_target_role ON candidates(target_role);
CREATE INDEX IF NOT EXISTS idx_candidates_source ON candidates(source);
CREATE INDEX IF NOT EXISTS idx_candidates_years_experience ON candidates(years_experience);
CREATE INDEX IF NOT EXISTS idx_candidates_applied_date ON candidates(applied_date);
CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(name);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_candidate_id ON candidate_skills(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_skills_skill_id ON candidate_skills(skill_id);
`;

/**
 * Initializes the SQLite database schema idempotently.
 */
export function initSchema(db: Database.Database): void {
  // Ensure foreign keys are enabled for this connection
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA_SQL);
}
