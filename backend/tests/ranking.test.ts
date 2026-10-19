import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  rankCandidatesBaseline,
  rankCandidatesOptimized,
  normalizeSkill,
  normalizeSkillSet,
  defaultTieBreaker,
  type CandidateLike,
} from '../src/algorithms/ranking';
import {
  matchCandidatesFixed,
  AI_CODE_REVIEW_REFLECTION,
  type InputCandidate,
} from '../src/algorithms/matchCandidatesFixed';

describe('Task 2a: Candidate Ranking at Scale', () => {
  const sampleCandidates: CandidateLike[] = [
    {
      id: 'cand_1',
      name: 'Alice Smith',
      years_experience: 5,
      skills: ['Python', 'FastAPI', 'Docker'],
    },
    {
      id: 'cand_2',
      name: 'Bob Jones',
      years_experience: 7,
      skills: ['python', 'kubernetes', 'FASTAPI', 'docker'],
    },
    {
      id: 'cand_3',
      name: 'Charlie Brown',
      years_experience: 2,
      skills: ['React', 'CSS'],
    },
    {
      id: 'cand_4',
      name: 'Diana Prince',
      years_experience: 5,
      skills: ['Python', 'PostgreSQL'],
    },
  ];

  it('correctly ranks candidates by number of distinct required skill matches', () => {
    const required = ['Python', 'FastAPI', 'Docker'];
    const ranked = rankCandidatesOptimized(sampleCandidates, required);

    // Bob has 3 matching skills (Python, FastAPI, Docker)
    // Alice has 3 matching skills (Python, FastAPI, Docker)
    // Diana has 1 matching skill (Python)
    // Charlie has 0 matching skills
    assert.strictEqual(ranked.length, 4);
    assert.strictEqual(ranked[0].score, 3);
    assert.strictEqual(ranked[1].score, 3);
    assert.strictEqual(ranked[2].score, 1);
    assert.strictEqual(ranked[3].score, 0);

    // Tie-break: Bob has 7 yrs exp, Alice has 5 yrs exp -> Bob must rank ahead of Alice
    assert.strictEqual(ranked[0].candidate.name, 'Bob Jones');
    assert.strictEqual(ranked[1].candidate.name, 'Alice Smith');
  });

  it('normalizes skill names case-insensitively and trims whitespace', () => {
    const candidates: CandidateLike[] = [
      { id: 'c1', name: 'Dev A', skills: ['  react  ', 'NODE.JS', 'TypeScript'] },
    ];
    const required = ['React', 'node.js  ', '  typescript '];

    const ranked = rankCandidatesOptimized(candidates, required);
    assert.strictEqual(ranked[0].score, 3);
    assert.strictEqual(ranked[0].matchedSkills.length, 3);
    assert.ok(ranked[0].matchedSkills.includes('react'));
    assert.ok(ranked[0].matchedSkills.includes('node.js'));
    assert.ok(ranked[0].matchedSkills.includes('typescript'));
  });

  it('does not inflate scores when candidate skills contain duplicates', () => {
    const candidates: CandidateLike[] = [
      { id: 'c1', name: 'Dupe Candidate', skills: ['Python', 'python', 'PYTHON', '  python  '] },
    ];
    const required = ['Python'];

    const ranked = rankCandidatesOptimized(candidates, required);
    assert.strictEqual(ranked[0].score, 1, 'Duplicate skills must only count once');
  });

  it('does not inflate scores when required skills list contains duplicates', () => {
    const candidates: CandidateLike[] = [
      { id: 'c1', name: 'Dev', skills: ['Python', 'Docker'] },
    ];
    const required = ['Python', 'python', 'PYTHON', 'Docker'];

    const ranked = rankCandidatesOptimized(candidates, required);
    assert.strictEqual(ranked[0].score, 2, 'Candidate with Python and Docker should have score 2');
    assert.strictEqual(ranked[0].matchRatio, 1.0, '2 out of 2 distinct required skills');
  });

  it('handles empty required skills list cleanly', () => {
    const candidates: CandidateLike[] = [
      { id: 'c1', name: 'Dev A', years_experience: 4, skills: ['Python'] },
      { id: 'c2', name: 'Dev B', years_experience: 8, skills: ['Go'] },
    ];

    const ranked = rankCandidatesOptimized(candidates, []);
    assert.strictEqual(ranked.length, 2);
    assert.strictEqual(ranked[0].score, 0);
    assert.strictEqual(ranked[1].score, 0);
    // Tie-break by experience descending
    assert.strictEqual(ranked[0].candidate.name, 'Dev B');
  });

  it('handles candidates with missing or null skill arrays without crashing', () => {
    const candidates: CandidateLike[] = [
      { id: 'c1', name: 'No Skills Array', skills: null },
      { id: 'c2', name: 'Undefined Skills Array' },
      { id: 'c3', name: 'Empty Skills Array', skills: [] },
      { id: 'c4', name: 'Valid Skills', skills: ['Python'] },
    ];
    const required = ['Python'];

    const ranked = rankCandidatesOptimized(candidates, required);
    assert.strictEqual(ranked.length, 4);
    assert.strictEqual(ranked[0].candidate.id, 'c4');
    assert.strictEqual(ranked[0].score, 1);
    assert.strictEqual(ranked[1].score, 0);
    assert.strictEqual(ranked[2].score, 0);
    assert.strictEqual(ranked[3].score, 0);
  });

  it('handles empty candidates input list', () => {
    const ranked = rankCandidatesOptimized([], ['Python']);
    assert.deepStrictEqual(ranked, []);
  });

  it('enforces deterministic tie-breaking across score, experience, name, and ID', () => {
    const candidates: CandidateLike[] = [
      { id: 'id_3', name: 'Carol', years_experience: 4, skills: ['Java'] },
      { id: 'id_1', name: 'Alice', years_experience: 4, skills: ['Java'] },
      { id: 'id_2', name: 'Bob', years_experience: 6, skills: ['Java'] },
      { id: 'id_4', name: 'Alice', years_experience: 4, skills: ['Java'] }, // Duplicate name, different ID
    ];
    const required = ['Java'];

    const ranked = rankCandidatesOptimized(candidates, required);

    // All have score 1
    // 1. Bob has 6 yrs exp -> rank 1
    assert.strictEqual(ranked[0].candidate.id, 'id_2');
    // 2. Alice (id_1) has 4 yrs exp, name 'Alice' < 'Carol' -> rank 2
    assert.strictEqual(ranked[1].candidate.id, 'id_1');
    // 3. Alice (id_4) has 4 yrs exp, name 'Alice', id 'id_4' > 'id_1' -> rank 3
    assert.strictEqual(ranked[2].candidate.id, 'id_4');
    // 4. Carol (id_3) -> rank 4
    assert.strictEqual(ranked[3].candidate.id, 'id_3');
  });

  it('preserves input candidate immutability', () => {
    const originalSkills = ['Python', 'Docker'];
    const candidates: CandidateLike[] = [
      { id: 'c1', name: 'Test Cand', skills: [...originalSkills], years_experience: 3 },
    ];
    const originalCandidateSnapshot = JSON.stringify(candidates);

    rankCandidatesOptimized(candidates, ['Python']);
    rankCandidatesBaseline(candidates, ['Python']);

    assert.strictEqual(
      JSON.stringify(candidates),
      originalCandidateSnapshot,
      'Input candidates must not be modified'
    );
  });

  it('produces identical ranking output between baseline and optimized algorithms across all options', () => {
    const candidates: CandidateLike[] = [
      { id: 'c1', name: 'Zack', years_experience: 3, skills: ['Go', 'Docker', 'go'] },
      { id: 'c2', name: 'Amy', years_experience: 5, skills: ['Python', 'FastAPI', 'Go'] },
      { id: 'c3', name: 'Ben', years_experience: 5, skills: ['python', 'Go'] },
      { id: 'c4', name: 'Chloe', years_experience: 2, skills: ['React'] },
      { id: 'c5', name: 'Dave', years_experience: 8, skills: null },
      { id: 'c6', name: 'Evan', years_experience: 1, skills: ['Docker', 'AWS'] },
    ];
    const required = ['Python', 'Go', 'Docker'];

    // 1. Full rank deep equality
    const baseFull = rankCandidatesBaseline(candidates, required);
    const optFull = rankCandidatesOptimized(candidates, required);
    assert.deepStrictEqual(baseFull, optFull, 'Full ranking output must be deeply strictly equal');

    // 2. Top-K limit deep equality
    const baseTopK = rankCandidatesBaseline(candidates, required, { limit: 3 });
    const optTopK = rankCandidatesOptimized(candidates, required, { limit: 3 });
    assert.deepStrictEqual(baseTopK, optTopK, 'Top-K ranking output must be deeply strictly equal');

    // 3. Min score filter deep equality
    const baseMin = rankCandidatesBaseline(candidates, required, { minScore: 2 });
    const optMin = rankCandidatesOptimized(candidates, required, { minScore: 2 });
    assert.deepStrictEqual(baseMin, optMin, 'minScore filtered output must be deeply strictly equal');

    // 4. Custom tie-breaker deep equality
    const customTieBreaker = (a: any, b: any) => (a.candidate.years_experience ?? 0) - (b.candidate.years_experience ?? 0);
    const baseCustom = rankCandidatesBaseline(candidates, required, { tieBreaker: customTieBreaker });
    const optCustom = rankCandidatesOptimized(candidates, required, { tieBreaker: customTieBreaker });
    assert.deepStrictEqual(baseCustom, optCustom, 'Custom tie-breaker output must be deeply strictly equal');

    // 5. Empty required skills deep equality
    const baseEmptyReq = rankCandidatesBaseline(candidates, []);
    const optEmptyReq = rankCandidatesOptimized(candidates, []);
    assert.deepStrictEqual(baseEmptyReq, optEmptyReq, 'Empty required skills output must be deeply strictly equal');
  });

  it('respects minScore and limit options', () => {
    const candidates: CandidateLike[] = [
      { id: 'c1', name: 'Dev 1', skills: ['Python', 'Docker'] },
      { id: 'c2', name: 'Dev 2', skills: ['Python'] },
      { id: 'c3', name: 'Dev 3', skills: ['React'] },
    ];
    const required = ['Python', 'Docker'];

    const filtered = rankCandidatesOptimized(candidates, required, { minScore: 1, limit: 1 });
    assert.strictEqual(filtered.length, 1);
    assert.strictEqual(filtered[0].candidate.id, 'c1');
    assert.strictEqual(filtered[0].score, 2);
  });
});

describe('Task 2b: AI Code Review & Bug Fix (matchCandidatesFixed)', () => {
  it('includes a meaningful 3-4 sentence reflection string', () => {
    assert.ok(typeof AI_CODE_REVIEW_REFLECTION === 'string');
    const sentences = AI_CODE_REVIEW_REFLECTION.split('.').filter((s) => s.trim().length > 0);
    assert.ok(
      sentences.length >= 3 && sentences.length <= 4,
      `Expected 3 to 4 sentences, got ${sentences.length}`
    );
  });

  it('fixes the off-by-one boundary error and undeclared loop variable without crashing', () => {
    const candidates: InputCandidate[] = [
      { name: 'John Doe', skills: ['Java', 'Spring Boot'] },
      { name: 'Jane Smith', skills: ['Python'] },
    ];
    // In original code, loop i <= candidates.length accessed candidates[2] which was undefined, throwing TypeError
    const result = matchCandidatesFixed(candidates, ['Java']);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'John Doe');
    assert.strictEqual(result[0].score, 1);
  });

  it('returns a numeric score instead of an array of strings', () => {
    const candidates: InputCandidate[] = [
      { name: 'Sameer', skills: ['Python', 'FastAPI', 'Docker'] },
    ];
    const result = matchCandidatesFixed(candidates, ['Python', 'FastAPI']);

    assert.strictEqual(typeof result[0].score, 'number', 'Score must be a number');
    assert.strictEqual(result[0].score, 2);
    assert.ok(Array.isArray(result[0].matchedSkills), 'Matched skills should be preserved');
  });

  it('sorts candidates in descending order with deterministic alphabetical tie-breaking', () => {
    const candidates: InputCandidate[] = [
      { name: 'Charlie', skills: ['Python'] },
      { name: 'Bob', skills: ['Python', 'Django', 'FastAPI'] },
      { name: 'Alice', skills: ['Python', 'Django', 'FastAPI'] },
      { name: 'David', skills: ['Python', 'Django'] },
    ];
    const result = matchCandidatesFixed(candidates, ['Python', 'Django', 'FastAPI']);

    assert.strictEqual(result.length, 4);
    // Top score 3: Alice and Bob -> Alice alphabetically before Bob
    assert.strictEqual(result[0].name, 'Alice');
    assert.strictEqual(result[0].score, 3);
    assert.strictEqual(result[1].name, 'Bob');
    assert.strictEqual(result[1].score, 3);
    // Score 2: David
    assert.strictEqual(result[2].name, 'David');
    assert.strictEqual(result[2].score, 2);
    // Score 1: Charlie
    assert.strictEqual(result[3].name, 'Charlie');
    assert.strictEqual(result[3].score, 1);
  });

  it('normalizes skill casing and trims whitespace', () => {
    const candidates: InputCandidate[] = [
      { name: 'Dev', skills: ['  python  ', 'REACT', 'Node.js'] },
    ];
    const result = matchCandidatesFixed(candidates, ['Python', 'react  ']);
    assert.strictEqual(result[0].score, 2);
  });

  it('prevents duplicate skills on candidate from inflating score', () => {
    const candidates: InputCandidate[] = [
      { name: 'Dupe Dev', skills: ['Java', 'java', 'JAVA'] },
    ];
    const result = matchCandidatesFixed(candidates, ['Java']);
    assert.strictEqual(result[0].score, 1, 'Duplicate skill tags must count only once');
  });

  it('safely handles missing, null, or empty candidate skills', () => {
    const candidates: InputCandidate[] = [
      { name: 'Null Skills', skills: null },
      { name: 'Undefined Skills' },
      { name: 'Empty Skills', skills: [] },
      { name: 'Valid Skills', skills: ['Docker'] },
    ];
    const result = matchCandidatesFixed(candidates, ['Docker']);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'Valid Skills');
  });

  it('safely handles null or undefined candidate list', () => {
    const result = matchCandidatesFixed(null, ['Java']);
    assert.deepStrictEqual(result, []);
  });

  it('safely handles null or empty required skills list', () => {
    const candidates: InputCandidate[] = [{ name: 'Dev', skills: ['Java'] }];
    const result = matchCandidatesFixed(candidates, null);
    assert.deepStrictEqual(result, []);
  });
});
