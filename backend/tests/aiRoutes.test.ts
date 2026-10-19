import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import path from 'path';
import type Database from 'better-sqlite3';
import { createApp } from '../src/app';
import { createDatabase } from '../src/db/index';
import { seedCandidates } from '../src/db/seed';
import { GeminiService, type IGeminiClient } from '../src/services/geminiService';

describe('AI Routes: POST /api/ai/candidate-fit', () => {
  let db: Database.Database;

  beforeEach(() => {
    db = createDatabase(':memory:');
    const jsonPath = path.resolve(__dirname, '../../data/candidates.json');
    seedCandidates(db, jsonPath);
  });

  it('successfully generates an evidence-grounded candidate fit summary using real candidate record with mocked Gemini', async () => {
    let capturedPrompt = '';

    const mockClient: IGeminiClient = {
      models: {
        async generateContent(params: any) {
          capturedPrompt = params.contents;
          return {
            text: JSON.stringify({
              fit_level: 'strong',
              one_line_summary: 'Sameer brings strong backend engineering expertise with Spring Boot and Kubernetes, aligning well with infrastructure needs.',
              supported_skills: ['Spring Boot', 'Java', 'Kubernetes'],
              missing_or_unverified_skills: ['PyTorch', 'TensorFlow'],
              experience_fit: '6 years of experience aligns well with the required 5+ years.',
              fit_rationale: 'Solid experience across enterprise Java and container orchestration, though ML pipeline tooling is unverified.',
              uncertainties_or_risks: 'Notes highlight enterprise background with heavy process; evaluate degree of individual ownership.',
            }),
          };
        },
      },
    };

    const mockAiService = new GeminiService(mockClient);
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_001',
        jobDescription: 'Seeking an ML Platform Engineer with 5+ years experience in Java, Kubernetes, and distributed systems.',
      });

    assert.equal(res.status, 200);
    assert.ok(res.body.data);
    assert.equal(res.body.data.candidateId, 'cand_001');
    assert.equal(res.body.data.candidateName, 'Sameer Rao');
    assert.equal(res.body.data.targetRole, 'ML Engineer');
    assert.equal(res.body.data.fitLevel, 'strong');
    assert.equal(res.body.data.supportedSkills.length, 3);
    assert.deepEqual(res.body.data.missingOrUnverifiedSkills, ['PyTorch', 'TensorFlow']);
    assert.ok(res.body.data.disclaimer.includes('decision support'));
    assert.ok(res.body.data.generatedAt);

    // Verify real candidate data from SQLite was included in the model prompt
    assert.ok(capturedPrompt.includes('Sameer Rao'));
    assert.ok(capturedPrompt.includes('ML Engineer'));
    assert.ok(capturedPrompt.includes('Spring Boot'));
    assert.ok(capturedPrompt.includes('process-heavy environment'));
  });

  it('rejects missing or empty candidateId with 400', async () => {
    const mockAiService = new GeminiService({
      models: { async generateContent() { return { text: '{}' }; } },
    });
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: '   ',
        jobDescription: 'Senior TypeScript and React engineer needed.',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('candidateId'));
  });

  it('rejects missing jobDescription with 400', async () => {
    const mockAiService = new GeminiService({
      models: { async generateContent() { return { text: '{}' }; } },
    });
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_001',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('jobDescription'));
  });

  it('rejects jobDescription shorter than 10 characters with 400', async () => {
    const mockAiService = new GeminiService({
      models: { async generateContent() { return { text: '{}' }; } },
    });
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_001',
        jobDescription: 'React dev',
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('too short'));
  });

  it('rejects jobDescription exceeding 3,000 characters with 400', async () => {
    const mockAiService = new GeminiService({
      models: { async generateContent() { return { text: '{}' }; } },
    });
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_001',
        jobDescription: 'A'.repeat(3001),
      });

    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.message.includes('maximum allowed length'));
  });

  it('returns 404 when candidateId does not exist in database', async () => {
    const mockAiService = new GeminiService({
      models: { async generateContent() { return { text: '{}' }; } },
    });
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_999999_nonexistent',
        jobDescription: 'Valid job description looking for full stack engineers.',
      });

    assert.equal(res.status, 404);
    assert.equal(res.body.error.code, 'NOT_FOUND');
    assert.ok(res.body.error.message.includes('cand_999999_nonexistent'));
  });

  it('handles provider rate limits (429) gracefully with safe error response', async () => {
    const mockClient: IGeminiClient = {
      models: {
        async generateContent() {
          const err: any = new Error('Resource exhausted: quota exceeded');
          err.status = 429;
          throw err;
        },
      },
    };

    const mockAiService = new GeminiService(mockClient);
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_001',
        jobDescription: 'Senior engineer with Docker and PostgreSQL expertise.',
      });

    assert.equal(res.status, 429);
    assert.equal(res.body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(res.body.error.message.includes('rate limit exceeded'));
  });

  it('handles provider authentication failure (503) without leaking keys or stack trace', async () => {
    const mockClient: IGeminiClient = {
      models: {
        async generateContent() {
          const err: any = new Error('API_KEY_INVALID: provided key AQ.secret_key_12345 is invalid');
          err.status = 400;
          throw err;
        },
      },
    };

    const mockAiService = new GeminiService(mockClient);
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_001',
        jobDescription: 'Senior engineer with Docker and PostgreSQL expertise.',
      });

    assert.equal(res.status, 503);
    assert.equal(res.body.error.code, 'AUTHENTICATION_ERROR');
    // Verify secret is NOT leaked
    assert.ok(!JSON.stringify(res.body).includes('secret_key_12345'));
    assert.ok(!JSON.stringify(res.body).includes('AQ.'));
  });

  it('handles safety block (422) properly', async () => {
    const mockClient: IGeminiClient = {
      models: {
        async generateContent() {
          throw new Error('Content blocked by SAFETY policy filter.');
        },
      },
    };

    const mockAiService = new GeminiService(mockClient);
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_001',
        jobDescription: 'Senior engineer with Docker and PostgreSQL expertise.',
      });

    assert.equal(res.status, 422);
    assert.equal(res.body.error.code, 'SAFETY_BLOCKED');
  });

  it('handles empty response from model with 502', async () => {
    const mockClient: IGeminiClient = {
      models: {
        async generateContent() {
          return { text: null };
        },
      },
    };

    const mockAiService = new GeminiService(mockClient);
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_001',
        jobDescription: 'Senior engineer with Docker and PostgreSQL expertise.',
      });

    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, 'EMPTY_MODEL_RESPONSE');
  });

  it('handles malformed JSON from model with 502', async () => {
    const mockClient: IGeminiClient = {
      models: {
        async generateContent() {
          return { text: 'Not valid JSON' };
        },
      },
    };

    const mockAiService = new GeminiService(mockClient);
    const app = createApp(db, mockAiService);

    const res = await request(app)
      .post('/api/ai/candidate-fit')
      .send({
        candidateId: 'cand_001',
        jobDescription: 'Senior engineer with Docker and PostgreSQL expertise.',
      });

    assert.equal(res.status, 502);
    assert.equal(res.body.error.code, 'INVALID_JSON_RESPONSE');
  });
});
