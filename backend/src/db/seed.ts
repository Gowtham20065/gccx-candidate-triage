import fs from 'fs';
import type Database from 'better-sqlite3';
import { config } from '../config';
import { getDatabase } from './index';
import type { RawCandidateInput } from './types';

export interface SeedResult {
  totalProcessed: number;
  totalCandidatesInDb: number;
  totalSkillsInDb: number;
}

/**
 * Idempotently loads candidate records from JSON into SQLite.
 * Uses a transaction and preserves existing triage statuses across runs.
 */
export function seedCandidates(
  db: Database.Database,
  sourcePath: string = config.CANDIDATES_JSON_PATH
): SeedResult {
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Candidates JSON file not found at: ${sourcePath}`);
  }

  const rawData = fs.readFileSync(sourcePath, 'utf8');
  const candidates: RawCandidateInput[] = JSON.parse(rawData);

  const insertCandidate = db.prepare(`
    INSERT INTO candidates (id, name, target_role, years_experience, source, notes, applied_date, status)
    VALUES (@id, @name, @target_role, @years_experience, @source, @notes, @applied_date, 'untriaged')
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      target_role = excluded.target_role,
      years_experience = excluded.years_experience,
      source = excluded.source,
      notes = excluded.notes,
      applied_date = excluded.applied_date
      -- status is deliberately omitted to preserve recruiter triage state across reseeds
  `);

  const insertSkill = db.prepare(`
    INSERT OR IGNORE INTO skills (name) VALUES (?)
  `);

  const getSkillId = db.prepare<[string], { id: number }>(`
    SELECT id FROM skills WHERE name = ? COLLATE NOCASE
  `);

  const deleteCandidateSkills = db.prepare(`
    DELETE FROM candidate_skills WHERE candidate_id = ?
  `);

  const insertCandidateSkill = db.prepare(`
    INSERT OR IGNORE INTO candidate_skills (candidate_id, skill_id) VALUES (?, ?)
  `);

  const seedTransaction = db.transaction((records: RawCandidateInput[]) => {
    for (const record of records) {
      insertCandidate.run({
        id: record.id,
        name: record.name,
        target_role: record.target_role,
        years_experience: record.years_experience,
        source: record.source,
        notes: record.notes,
        applied_date: record.applied_date,
      });

      // Clear existing skill associations so re-seeding with modified skills removes stale links
      deleteCandidateSkills.run(record.id);

      if (Array.isArray(record.skills)) {
        for (const skillName of record.skills) {
          const trimmedSkill = skillName.trim();
          if (trimmedSkill) {
            insertSkill.run(trimmedSkill);
            const row = getSkillId.get(trimmedSkill);
            if (row) {
              insertCandidateSkill.run(record.id, row.id);
            }
          }
        }
      }
    }
  });

  seedTransaction(candidates);

  const candCount = (db.prepare('SELECT COUNT(*) AS count FROM candidates').get() as { count: number }).count;
  const skillCount = (db.prepare('SELECT COUNT(*) AS count FROM skills').get() as { count: number }).count;

  return {
    totalProcessed: candidates.length,
    totalCandidatesInDb: candCount,
    totalSkillsInDb: skillCount,
  };
}

// Standalone execution support
if (require.main === module) {
  try {
    const db = getDatabase();
    console.log('Seeding database from:', config.CANDIDATES_JSON_PATH);
    const result = seedCandidates(db);
    console.log(`Seeding successful: ${result.totalProcessed} processed. DB has ${result.totalCandidatesInDb} candidates, ${result.totalSkillsInDb} skills.`);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}
