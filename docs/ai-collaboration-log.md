# GCCX Global — Task 3: AI Collaboration Log

This document records the AI-assisted engineering workflow, reconstructed from verified project commits, terminal execution transcripts, test logs, and design decisions across the implementation of the **GCCX Candidate Triage Tool**.

---

## 1. AI Tools & Allocation of Assistance

| AI Tool & Model | Primary Engineering Use Cases | Human Verification Method |
|---|---|---|
| **Google Antigravity Agentic Assistant** | Monorepo scaffolding, npm workspaces configuration, SQLite 3NF relational schema design, benchmark authoring, React component architecture, and integration test authoring. | Full code review, static type checking (`tsc --noEmit`), automated test execution (`node:test`, `vitest`), and empirical profiling (`performance.now()`). |
| **Google Gemini API (`gemini-3.8-flash`)** | Runtime candidate evaluation against recruiter job descriptions, generating structured fit summaries and gap analyses. | Strict JSON schema enforcement (`responseSchema`), unit tests with mocked client responses, and real API smoke test against SQLite candidate data. |

---

## 2. Reconstructed Prompts (High-Level Summaries)

The prompts below are high-level reconstructed summaries representing the technical instructions and constraints provided during each development phase, rather than raw verbatim terminal transcripts:

### Prompt 1: Project Scaffolding & Database Normalization (Stage 2 & 3)
```text
Implement SQLite database and backend REST API for gccx-candidate-triage:
- Use SQLite with better-sqlite3 driver in Node.js 22 + TypeScript monorepo.
- Store candidate ID, name, target role, years of experience, source, notes, applied date, and triage status.
- Store candidate skills in a normalized related table rather than relying only on JSON text.
- Add performance indexes for common filters and skill lookups.
- Make initialization and importing the supplied candidates.json dataset reproducible, idempotent, and non-destructive across restarts.
- Implement REST API: GET /health, GET /api/candidates (pagination, filters, search), GET /api/candidates/:id, PATCH /api/candidates/:id/status, and GET /api/skills.
- Write automated tests covering database operations and API contracts.
```

### Prompt 2: Candidate Ranking Algorithm at Scale (Stage 4, Task 2a & 2b)
```text
Task 2a & 2b — Candidate Ranking and AI Code Review:
- Rank candidates according to distinct required skill matches.
- Normalize skill names (casing, whitespace) and prevent duplicate skills on candidate or query from inflating scores.
- Define deterministic tie-breaking (score -> experience -> name -> id).
- Input immutability must be preserved.
- Provide a baseline implementation and an optimized approach (e.g. Bucket Sort) suitable for 100,000+ candidates.
- Create a reproducible benchmark using Mulberry32 PRNG with fixed seed, measuring warm-up and timed iterations.
- Review and fix the provided buggy AI function matchCandidates (fix off-by-one, undeclared loop variable, array score, and sorting).
- Write automated tests covering all edge cases.
```

### Prompt 3: Gemini Candidate-Fit Integration (Stage 6)
```text
Implement Stage 6 Gemini AI Integration:
- Reuse existing LLM_PROVIDER, LLM_API_KEY, and LLM_MODEL environment variables with safe fallbacks.
- Verify supported Gemini model using official Google documentation (gemini-3.8-flash).
- Implement POST /api/ai/candidate-fit: fetch candidate facts strictly from SQLite (do not trust client attributes).
- Return structured fit summary with fit_level, oneLineSummary, supportedSkills, missingOrUnverifiedSkills, experienceFit, fitRationale, and uncertaintiesOrRisks.
- Never expose API keys to frontend, logs, or error responses.
- Implement mocked tests covering validation, 404, rate limits (429), auth failures (503), safety blocks (422), and timeouts (504).
- Integrate an interactive evaluation card into the candidate details modal with job description presets and loading/error states.
```

---

## 3. Critical Rework: Where AI Output Was Rejected & Corrected

### 1. V8 String Collation Bottleneck in Ranking at Scale (~24x Speedup)
- **Initial AI Output**: In Task 2a, the initial generated comparator used `a.name.localeCompare(b.name)` as the alphabetical tie-breaker.
- **Problem Identified**: When running the 100,000-candidate benchmark, sorting overhead skyrocketed to over **6,100 ms**. Profiling revealed that `String.prototype.localeCompare` creates significant V8 runtime overhead when invoked millions of times inside hot sorting loops.
- **Rework Applied**: Replaced `localeCompare` with direct case-insensitive lexicographical operators:
  ```typescript
  const nameA = a.candidate.name.toLowerCase();
  const nameB = b.candidate.name.toLowerCase();
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  ```
- **Outcome**: Benchmark execution dropped from ~6,100 ms to **279.97 ms** mean (**253.88 ms** median) for full ranking and **134.23 ms** mean (**102.18 ms** median) for top-100 early exit. Throughput reached 745,003 cand/sec by mean (978,665 cand/sec by median) for top-100 early exit, achieving a 2.03x mean (2.59x median) speedup over the 272.73 ms baseline. *(Note: These reflect synthetic in-memory benchmark measurements on generated candidate data, not production server performance).*

### 2. Deterministic Skill Ordering Across Dual Algorithms
- **Initial AI Output**: The baseline and bucket sort functions collected matching skills into native `Set` objects and converted them back to arrays via `Array.from(set)`.
- **Problem Identified**: In unit tests comparing baseline vs. optimized algorithms, `assert.deepStrictEqual` occasionally failed because skill array insertion order depended on internal iteration differences.
- **Rework Applied**: Enforced canonical alphabetical sorting on `matchedSkills` (`Array.from(matches).sort()`) in both functions.
- **Outcome**: 100% deterministic parity across baseline, bucket sort, and top-K slices.

### 3. Non-Destructive Database Seeding Strategy
- **Initial AI Output**: Initial database setup script proposed dropping and recreating tables or issuing `DELETE FROM candidates` before importing `candidates.json`.
- **Problem Identified**: Destructive seeding would wipe recruiter triage statuses (`shortlisted`, `rejected`) on every application restart.
- **Rework Applied**: Restructured seeding with SQLite `INSERT ... ON CONFLICT(id) DO UPDATE SET ...` while **deliberately omitting** the `status` column from updates:
  ```sql
  INSERT INTO candidates (id, name, target_role, years_experience, source, notes, applied_date, status)
  VALUES (@id, @name, @target_role, @years_experience, @source, @notes, @applied_date, 'untriaged')
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    target_role = excluded.target_role,
    years_experience = excluded.years_experience,
    source = excluded.source,
    notes = excluded.notes,
    applied_date = excluded.applied_date
    -- status is intentionally preserved
  ```
- **Outcome**: Safe, repeatable restarts without data loss.

---

## 4. Where AI Genuinely Accelerated Development & Verification

### 1. High-Fidelity Synthetic Benchmark Harness (Task 2a)
- **Acceleration**: Writing a deterministic Mulberry32 PRNG generator with fixed seed `20261019` to construct 100,000 realistic candidate objects with controlled skill pools and distributions would have taken hours manually.
- **Verification**: Verified correctness by:
  1. Testing that baseline and optimized bucket sort produce identical ranked slices for the same candidate inputs.
  2. Running warm-up iterations to stabilize JIT optimization before taking 5 high-resolution `performance.now()` measurements.
  3. Verifying that the official `data/candidates.json` dataset (48 records) remained untouched with identical SHA-256 hash `2B68CD53...`.

### 2. Comprehensive Test Suite Generation (70 Passing Tests)
- **Acceleration**: Rapidly scaffolding test suites covering HTTP error envelopes, SQL query filters, edge-case candidate rankings, and mock Gemini failures.
- **Verification & Execution Duration**: Executed across workspaces:
  - **Backend**: 60 passed (~25s total duration across 11 test suites with isolated in-memory SQLite instances).
  - **Frontend**: 10 passed (~2.7s duration in Vitest for rendering, filtering, status mutations, and modal drawer).
  - **Total**: **70 tests passing, 0 failures, 0 skipped**.

---

## 5. Mocked Tests vs. Manual Live Verification

To ensure reliability, reproducibility, and zero test execution costs:

1. **Automated Test Suite (100% Mocked)**:
   - All 11 tests in `backend/tests/aiRoutes.test.ts` and all 10 tests in `frontend/src/test/Dashboard.test.tsx` use an injected `IGeminiClient` mock.
   - Tests execute with zero network dependency, zero API key requirement, and zero token expense.
   - Covers rate limits (`429`), authentication errors (`503`), safety filters (`422`), timeouts (`504`), and invalid model JSON (`502`).

2. **Manual Live Verification (Development Check)**:
   - A manual check was run during development with a valid API key against the live Google Gemini API using `gemini-3.8-flash` on real candidate `cand_001` (Sameer Rao) to confirm end-to-end schema adherence.
   - **Verified Live Response**:
     - Status: `200 OK`
     - Candidate: `Sameer Rao`
     - Fit Level: `moderate`
     - One-Line Summary: *"Sameer possesses the core technical stack of Java, Spring Boot, and Kubernetes with 6 years of experience, but specific ML platform and cloud infrastructure depth remain unverified."*
     - Supported Skills: `['Java', 'Spring Boot', 'Kubernetes']`
     - Model: `gemini-3.8-flash`
   - *Note: No live smoke-test script or API credentials are included in the repository; all repository test suites run 100% mocked.*

---

## 6. Known Limitations & Human-in-the-Loop Safeguards

1. **Advisory Decision Support Only**:
   - Every AI response embeds an unalterable disclaimer: *"AI-generated candidate evaluation intended solely as decision support for human recruiters. Does not constitute an automated hiring or rejection decision."*
2. **Strict Grounding Boundary**:
   - The prompt instructs Gemini to evaluate *only* explicit facts present in the database profile.
   - If a requirement is not explicitly listed, it is assigned to `missingOrUnverifiedSkills` rather than inferred.
3. **Prompt Injection Mitigation & Input Fencing**:
   - Recruiter job descriptions and candidate notes are XML-escaped and fenced inside distinct XML tags (`<job_description>` and `<candidate_profile>`), providing input fencing to mitigate prompt injection risks.
4. **Demographic Bias Mitigation Guardrails**:
   - System instructions strictly prohibit evaluating or inferring protected demographic characteristics (race, gender, age, disability, nationality).
   - This provides essential risk mitigation and behavioral guardrails; however, it does not guarantee absolute zero bias, which is why human recruiter sign-off remains mandatory on all triage decisions.
