import { describe, it } from 'node:test';
import assert from 'node:assert';
import path from 'path';
import { createDatabase } from '../src/db/index';
import { seedCandidates } from '../src/db/seed';
import {
  getCandidateById,
  listCandidates,
  updateCandidateStatus,
} from '../src/repositories/candidateRepo';

describe('Database & Schema Tests (Isolated in-memory)', () => {
  const jsonPath = path.resolve(__dirname, '../../data/candidates.json');

  it('initializes schema and tables in an in-memory database', () => {
    const db = createDatabase(':memory:');
    assert.strictEqual(db.open, true);

    // Verify tables exist
    const tables = db
      .prepare<[], { name: string }>(
        "SELECT name FROM sqlite_master WHERE type='table' AND name IN ('candidates', 'skills', 'candidate_skills')"
      )
      .all()
      .map((t) => t.name);

    assert.ok(tables.includes('candidates'), "Table 'candidates' should exist");
    assert.ok(tables.includes('skills'), "Table 'skills' should exist");
    assert.ok(tables.includes('candidate_skills'), "Table 'candidate_skills' should exist");

    // Verify foreign keys are enabled
    const fkPragma = db.prepare('PRAGMA foreign_keys').get() as { foreign_keys: number };
    assert.strictEqual(fkPragma.foreign_keys, 1, 'Foreign keys pragma must be active');

    db.close();
  });

  it('imports all 48 original candidate records and populates skills correctly', () => {
    const db = createDatabase(':memory:');
    const result = seedCandidates(db, jsonPath);

    assert.strictEqual(result.totalProcessed, 48, 'Should process 48 candidates');
    assert.strictEqual(result.totalCandidatesInDb, 48, 'Database should hold 48 candidates');
    assert.ok(result.totalSkillsInDb >= 30, 'Database should extract all unique skills');

    // Verify first candidate
    const firstCand = getCandidateById(db, 'cand_001');
    assert.ok(firstCand, 'cand_001 must exist');
    assert.strictEqual(firstCand?.name, 'Sameer Rao');
    assert.strictEqual(firstCand?.target_role, 'ML Engineer');
    assert.strictEqual(firstCand?.years_experience, 6);
    assert.strictEqual(firstCand?.status, 'untriaged');
    assert.ok(Array.isArray(firstCand?.skills));
    assert.ok(firstCand?.skills.includes('Spring Boot'));
    assert.ok(firstCand?.skills.includes('Java'));

    db.close();
  });

  it('is safe to run seed multiple times without duplicates or errors (idempotency)', () => {
    const db = createDatabase(':memory:');
    seedCandidates(db, jsonPath);
    const resultSecond = seedCandidates(db, jsonPath);

    assert.strictEqual(resultSecond.totalCandidatesInDb, 48, 'Record count must remain 48');

    const totalRows = (
      db.prepare('SELECT COUNT(*) AS count FROM candidates').get() as { count: number }
    ).count;
    assert.strictEqual(totalRows, 48, 'Candidates count must not double');

    db.close();
  });

  it('preserves existing triage status across repeated seeds', () => {
    const db = createDatabase(':memory:');
    seedCandidates(db, jsonPath);

    // Update status to shortlisted
    updateCandidateStatus(db, 'cand_001', 'shortlisted');
    const beforeSeed = getCandidateById(db, 'cand_001');
    assert.strictEqual(beforeSeed?.status, 'shortlisted');

    // Run seed again
    seedCandidates(db, jsonPath);
    const afterSeed = getCandidateById(db, 'cand_001');
    assert.strictEqual(
      afterSeed?.status,
      'shortlisted',
      'Candidate status must persist across reseeds'
    );

    db.close();
  });

  it('enforces unique constraint on candidate IDs', () => {
    const db = createDatabase(':memory:');
    seedCandidates(db, jsonPath);

    assert.throws(() => {
      db.prepare(`
        INSERT INTO candidates (id, name, target_role, years_experience, source, notes, applied_date, status)
        VALUES ('cand_001', 'Duplicate Test', 'Role', 3, 'Source', 'Notes', '2026-09-01', 'untriaged')
      `).run();
    }, /UNIQUE constraint failed/);

    db.close();
  });

  it('cascades deletion from candidates to candidate_skills', () => {
    const db = createDatabase(':memory:');
    seedCandidates(db, jsonPath);

    const skillsBefore = (
      db
        .prepare('SELECT COUNT(*) as count FROM candidate_skills WHERE candidate_id = ?')
        .get('cand_001') as { count: number }
    ).count;
    assert.ok(skillsBefore > 0, 'cand_001 should have associated skills');

    // Delete candidate
    db.prepare('DELETE FROM candidates WHERE id = ?').run('cand_001');

    const skillsAfter = (
      db
        .prepare('SELECT COUNT(*) as count FROM candidate_skills WHERE candidate_id = ?')
        .get('cand_001') as { count: number }
    ).count;
    assert.strictEqual(skillsAfter, 0, 'Candidate skills must cascade delete');

    db.close();
  });
});
