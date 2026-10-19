import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import request from 'supertest';
import path from 'path';
import type Database from 'better-sqlite3';
import { createDatabase } from '../src/db/index';
import { seedCandidates } from '../src/db/seed';
import { createApp } from '../src/app';

describe('Candidate Triage REST API Tests', () => {
  let db: Database.Database;
  let app: any;

  before(() => {
    // Isolated in-memory database for testing
    db = createDatabase(':memory:');
    const jsonPath = path.resolve(__dirname, '../../data/candidates.json');
    seedCandidates(db, jsonPath);
    app = createApp(db);
  });

  after(() => {
    if (db && db.open) {
      db.close();
    }
  });

  describe('GET /health', () => {
    it('returns healthy status and accurate database metrics', async () => {
      const res = await request(app).get('/health');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.status, 'ok');
      assert.strictEqual(res.body.database.connected, true);
      assert.strictEqual(res.body.database.candidateCount, 48);
    });
  });

  describe('GET /api/candidates', () => {
    it('returns paginated candidates with default limit of 20', async () => {
      const res = await request(app).get('/api/candidates');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 20);
      assert.strictEqual(res.body.pagination.total, 48);
      assert.strictEqual(res.body.pagination.page, 1);
      assert.strictEqual(res.body.pagination.limit, 20);
      assert.strictEqual(res.body.pagination.totalPages, 3);
      assert.strictEqual(res.body.pagination.hasNextPage, true);
      assert.strictEqual(res.body.pagination.hasPrevPage, false);
      assert.ok(Array.isArray(res.body.data[0].skills));
    });

    it('respects page and limit parameters', async () => {
      const res = await request(app).get('/api/candidates?page=2&limit=10');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 10);
      assert.strictEqual(res.body.pagination.page, 2);
      assert.strictEqual(res.body.pagination.limit, 10);
      assert.strictEqual(res.body.pagination.totalPages, 5);
      assert.strictEqual(res.body.pagination.hasNextPage, true);
      assert.strictEqual(res.body.pagination.hasPrevPage, true);
    });

    it('filters candidates by target role', async () => {
      const res = await request(app).get('/api/candidates?role=ML Engineer');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.pagination.total, 8);
      for (const cand of res.body.data) {
        assert.strictEqual(cand.target_role, 'ML Engineer');
      }
    });

    it('filters candidates by source', async () => {
      const res = await request(app).get('/api/candidates?source=Referral');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.pagination.total, 4);
      for (const cand of res.body.data) {
        assert.strictEqual(cand.source, 'Referral');
      }
    });

    it('filters candidates by experience range', async () => {
      const res = await request(app).get('/api/candidates?min_experience=5&max_experience=6');
      assert.strictEqual(res.status, 200);
      for (const cand of res.body.data) {
        assert.ok(cand.years_experience >= 5 && cand.years_experience <= 6);
      }
    });

    it('filters candidates by skill tag', async () => {
      const res = await request(app).get('/api/candidates?skill=FastAPI');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length > 0);
      for (const cand of res.body.data) {
        const hasSkill = cand.skills.some((s: string) => s.toLowerCase() === 'fastapi');
        assert.ok(hasSkill, `Candidate ${cand.id} must have skill FastAPI`);
      }
    });

    it('searches candidates by name', async () => {
      const res = await request(app).get('/api/candidates?q=Sameer');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 1);
      assert.strictEqual(res.body.data[0].name, 'Sameer Rao');
    });

    it('searches candidate free-text notes', async () => {
      const res = await request(app).get('/api/candidates?q=process-heavy');
      assert.strictEqual(res.status, 200);
      assert.ok(res.body.data.length >= 1);
      assert.ok(res.body.data[0].notes.includes('process-heavy'));
    });

    it('safely handles SQL injection attempts in search queries', async () => {
      const sqlInjection = "'; DROP TABLE candidates; --";
      const res = await request(app).get(`/api/candidates?q=${encodeURIComponent(sqlInjection)}`);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 0);

      // Verify candidates table was NOT dropped
      const checkTable = db.prepare('SELECT COUNT(*) as count FROM candidates').get() as { count: number };
      assert.strictEqual(checkTable.count, 48, 'Database table must remain intact');
    });

    it('returns empty array when no candidates match query', async () => {
      const res = await request(app).get('/api/candidates?q=nonexistent_candidate_xyz');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.length, 0);
      assert.strictEqual(res.body.pagination.total, 0);
    });

    it('returns 400 for invalid page parameter', async () => {
      const res = await request(app).get('/api/candidates?page=-1');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_QUERY_PARAMETER');
    });

    it('returns 400 for limit greater than maximum allowed (100)', async () => {
      const res = await request(app).get('/api/candidates?limit=101');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_QUERY_PARAMETER');
    });

    it('returns 400 for invalid triage status filter', async () => {
      const res = await request(app).get('/api/candidates?status=invalid_status');
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'INVALID_QUERY_PARAMETER');
    });
  });

  describe('GET /api/candidates/:id', () => {
    it('returns candidate by ID', async () => {
      const res = await request(app).get('/api/candidates/cand_001');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.id, 'cand_001');
      assert.strictEqual(res.body.data.name, 'Sameer Rao');
      assert.ok(Array.isArray(res.body.data.skills));
    });

    it('returns 404 for nonexistent candidate ID', async () => {
      const res = await request(app).get('/api/candidates/cand_999');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    });
  });

  describe('PATCH /api/candidates/:id/status', () => {
    it('updates candidate triage status to shortlisted and persists change', async () => {
      const patchRes = await request(app)
        .patch('/api/candidates/cand_001/status')
        .send({ status: 'shortlisted' });

      assert.strictEqual(patchRes.status, 200);
      assert.strictEqual(patchRes.body.data.status, 'shortlisted');

      // Verify persistence via GET
      const getRes = await request(app).get('/api/candidates/cand_001');
      assert.strictEqual(getRes.status, 200);
      assert.strictEqual(getRes.body.data.status, 'shortlisted');
    });

    it('updates candidate triage status to rejected and back to untriaged', async () => {
      const rejectRes = await request(app)
        .patch('/api/candidates/cand_001/status')
        .send({ status: 'rejected' });
      assert.strictEqual(rejectRes.status, 200);
      assert.strictEqual(rejectRes.body.data.status, 'rejected');

      const untriageRes = await request(app)
        .patch('/api/candidates/cand_001/status')
        .send({ status: 'untriaged' });
      assert.strictEqual(untriageRes.status, 200);
      assert.strictEqual(untriageRes.body.data.status, 'untriaged');
    });

    it('returns 400 for invalid status value', async () => {
      const res = await request(app)
        .patch('/api/candidates/cand_001/status')
        .send({ status: 'interviewed' });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('returns 400 for missing status field in body', async () => {
      const res = await request(app)
        .patch('/api/candidates/cand_001/status')
        .send({});

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    });

    it('returns 404 when updating status of nonexistent candidate', async () => {
      const res = await request(app)
        .patch('/api/candidates/cand_999/status')
        .send({ status: 'shortlisted' });

      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    });
  });

  describe('GET /api/skills', () => {
    it('returns all unique skills and their candidate counts', async () => {
      const res = await request(app).get('/api/skills');
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.total, 30);
      assert.strictEqual(res.body.data.length, 30);
      assert.ok(res.body.data[0].name);
      assert.ok(typeof res.body.data[0].count === 'number');
    });
  });

  describe('404 Handling', () => {
    it('returns formatted 404 JSON for nonexistent endpoints', async () => {
      const res = await request(app).get('/api/nonexistent-route');
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.body.error.code, 'NOT_FOUND');
    });
  });
});
