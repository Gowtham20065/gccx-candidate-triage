# GCCX Candidate Triage Tool

This repository contains the candidate triage platform and technical challenge deliverables for the **GCCX Global AI Full-Stack Engineer Intern Round 1 Case Study**.

## Architecture Overview

The application is structured as an npm workspaces monorepo:

- **Frontend (`/frontend`)**:
  - React (v18) + TypeScript
  - Bundled with Vite
  - Fast, responsive recruiter UI for searching, filtering, tagging, and shortlisting applicants.
- **Backend (`/backend`)**:
  - Node.js (v22) + Express + TypeScript (`tsx`)
  - REST API exposing search, filter, candidate triage, tagging/shortlisting mutations, and live LLM integration endpoints.
  - Layered architecture: Routes $\rightarrow$ Repositories $\rightarrow$ Database Driver (`better-sqlite3`).
- **Data Layer (`/data`)**:
  - SQLite database (`better-sqlite3`) seeded from `candidates.json` (48 mock records).
  - Normalized 3NF relational schema with foreign key constraints, indexes, and transactions.
  - Local persistence for triage statuses, recruiter tags, and LLM generated fit notes.
- **Documentation & Deliverables (`/docs`)**:
  - `ai-collaboration-log.md` (Task 3: AI workflow log)
  - `judgment-note.md` (Task 4: Half-page scaling note)
  - `presentation.md` (Task 5: Slide deck / presentation doc)
- **Tests (`backend/tests`)**:
  - Node.js native test runner (`node:test`) + `supertest` executing in isolated in-memory SQLite instances.

---

## Database Schema

SQLite schema initialized via `better-sqlite3` with `PRAGMA foreign_keys = ON`:

### Tables

1. **`candidates`**:
   - `id TEXT PRIMARY KEY`: Unique candidate identifier (e.g., `cand_001`).
   - `name TEXT NOT NULL`: Full candidate name.
   - `target_role TEXT NOT NULL`: Target job role.
   - `years_experience INTEGER NOT NULL`: Total years of experience.
   - `source TEXT NOT NULL`: Talent sourcing channel (e.g. `AngelList`, `Referral`, `Naukri`).
   - `notes TEXT NOT NULL`: Recruiter notes and qualitative context.
   - `applied_date TEXT NOT NULL`: ISO application date (`YYYY-MM-DD`).
   - `status TEXT NOT NULL DEFAULT 'untriaged' CHECK (status IN ('untriaged', 'shortlisted', 'rejected'))`: Recruiter triage decision.
   - `created_at TEXT NOT NULL DEFAULT (datetime('now'))`
   - `updated_at TEXT NOT NULL DEFAULT (datetime('now'))`

2. **`skills`**:
   - `id INTEGER PRIMARY KEY AUTOINCREMENT`
   - `name TEXT NOT NULL UNIQUE COLLATE NOCASE`: Normalized skill name (e.g. `FastAPI`, `React`).

3. **`candidate_skills`**:
   - `candidate_id TEXT NOT NULL REFERENCES candidates(id) ON DELETE CASCADE`
   - `skill_id INTEGER NOT NULL REFERENCES skills(id) ON DELETE CASCADE`
   - `PRIMARY KEY (candidate_id, skill_id)`

### Indexes
- `idx_candidates_status` on `candidates(status)`
- `idx_candidates_target_role` on `candidates(target_role)`
- `idx_candidates_source` on `candidates(source)`
- `idx_candidates_years_experience` on `candidates(years_experience)`
- `idx_candidates_applied_date` on `candidates(applied_date)`
- `idx_skills_name` on `skills(name)`
- `idx_candidate_skills_candidate_id` on `candidate_skills(candidate_id)`
- `idx_candidate_skills_skill_id` on `candidate_skills(skill_id)`

---

## API Contract

All endpoints return JSON and use standard HTTP status codes. Errors follow a consistent structure without leaking internal stack traces:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable explanation"
  }
}
```

### Endpoints

#### 1. `GET /health`
- **Description**: Service health check and database connectivity metrics.
- **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "service": "gccx-candidate-triage-backend",
    "timestamp": "2026-10-19T14:48:00.000Z",
    "database": {
      "connected": true,
      "candidateCount": 48
    }
  }
  ```

#### 2. `GET /api/candidates`
- **Description**: List candidates with pagination, text search, and multi-criteria filtering.
- **Query Parameters**:
  - `page` *(optional, integer $\ge 1$, default: `1`)*: Page number.
  - `limit` *(optional, integer $1..100$, default: `20`)*: Records per page.
  - `q` *(optional, string)*: Free-text search covering candidate name, target role, source, notes, and skills (parameterized safe SQL query).
  - `role` *(optional, string)*: Filter by target role (case-insensitive exact match).
  - `source` *(optional, string)*: Filter by sourcing channel.
  - `status` *(optional, enum: `'untriaged' | 'shortlisted' | 'rejected'`)*: Filter by triage status.
  - `min_experience` *(optional, number $\ge 0$)*: Minimum years of experience.
  - `max_experience` *(optional, number $\ge 0$)*: Maximum years of experience.
  - `skill` *(optional, string)*: Filter candidates possessing a specific skill tag.
  - `sort_by` *(optional, enum: `'applied_date' | 'years_experience' | 'name' | 'id'`, default: `'applied_date'`)*
  - `sort_order` *(optional, enum: `'asc' | 'desc'`, default: `'desc'`)*
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": "cand_001",
        "name": "Sameer Rao",
        "target_role": "ML Engineer",
        "years_experience": 6,
        "source": "Referral",
        "skills": ["Spring Boot", "Java", "Kotlin", "Kubernetes", "Next.js"],
        "notes": "Sameer has 6 yrs...",
        "applied_date": "2026-09-10",
        "status": "untriaged",
        "created_at": "2026-10-19 14:48:00",
        "updated_at": "2026-10-19 14:48:00"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 48,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: If invalid or out-of-bounds parameters are supplied.

#### 3. `GET /api/candidates/:id`
- **Description**: Retrieve detailed candidate record by unique identifier.
- **Response `200 OK`**: Candidate object with `skills` array.
- **Response `404 Not Found`**:
  ```json
  {
    "error": {
      "code": "NOT_FOUND",
      "message": "Candidate with ID 'cand_999' was not found."
    }
  }
  ```

#### 4. `PATCH /api/candidates/:id/status`
- **Description**: Update candidate triage status.
- **Request Body**:
  ```json
  {
    "status": "shortlisted"
  }
  ```
- **Allowed Statuses**: `'untriaged'`, `'shortlisted'`, `'rejected'`
- **Response `200 OK`**:
  ```json
  {
    "data": { ...candidate },
    "message": "Candidate triage status successfully updated to 'shortlisted'."
  }
  ```
- **Response `400 Bad Request`**: For missing/invalid status values.
- **Response `404 Not Found`**: If candidate ID does not exist.

#### 5. `GET /api/skills`
- **Description**: Returns all distinct skill tags extracted across candidates with candidate counts.
- **Response `200 OK`**:
  ```json
  {
    "data": [
      { "name": "Python", "count": 18 },
      { "name": "React", "count": 15 }
    ],
    "total": 30
  }
  ```

#### 6. `POST /api/ai/candidate-fit`
- **Description**: Generates an evidence-grounded candidate fit summary and gap analysis against a recruiter job description using Google Gemini (`gemini-3.8-flash`). Fetches candidate facts strictly from SQLite rather than client input.
- **Request Body**:
  ```json
  {
    "candidateId": "cand_001",
    "jobDescription": "Seeking an ML Platform Engineer with 4+ years experience in Java, Spring Boot, and Kubernetes for scalable cloud infrastructure."
  }
  ```
- **Validation Rules**:
  - `candidateId`: Required non-empty string referencing a real candidate in SQLite.
  - `jobDescription`: Required string between 10 and 3,000 characters.
- **Response `200 OK`**:
  ```json
  {
    "data": {
      "candidateId": "cand_001",
      "candidateName": "Sameer Rao",
      "targetRole": "ML Engineer",
      "fitLevel": "moderate",
      "oneLineSummary": "Sameer possesses the core technical stack of Java, Spring Boot, and Kubernetes with 6 years of experience, but specific ML platform and cloud infrastructure depth remain unverified.",
      "supportedSkills": ["Java", "Spring Boot", "Kubernetes"],
      "missingOrUnverifiedSkills": ["PyTorch", "TensorFlow", "MLOps"],
      "experienceFit": "6 years documented vs 4+ years required (meets requirement).",
      "fitRationale": "Strong backend foundation in enterprise Java services and container orchestration.",
      "uncertaintiesOrRisks": "Notes highlight enterprise background with heavy process; evaluate degree of individual ownership.",
      "disclaimer": "AI-generated candidate evaluation intended solely as decision support for human recruiters. Does not constitute an automated hiring or rejection decision.",
      "generatedAt": "2026-10-19T12:00:00.000Z",
      "model": "gemini-3.8-flash"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid or missing `candidateId` or `jobDescription` (< 10 or > 3,000 chars).
  - `404 Not Found`: If `candidateId` does not exist in SQLite.
  - `422 Unprocessable Entity`: If flagged by Gemini safety filters.
  - `429 Too Many Requests`: Upstream Gemini rate limit or quota exceeded.
  - `502 Bad Gateway`: Empty or malformed upstream model response.
  - `503 Service Unavailable`: If `LLM_API_KEY` is not configured or upstream authentication fails.
  - `504 Gateway Timeout`: If upstream request exceeds the 25-second timeout window.

---

## Architectural Assumptions & Decisions

1. **Triage Status Vocabulary**:
   - Defined as `'untriaged'` (default for newly ingested candidates), `'shortlisted'` (flagged for progression by recruiter), and `'rejected'` (declined).
2. **Idempotent, Non-Destructive Seeding**:
   - `seedCandidates` utilizes `INSERT INTO candidates ... ON CONFLICT(id) DO UPDATE SET ...` while **deliberately omitting** the `status` column from update mutations. This ensures that rerun seeds update master candidate biographical fields without resetting or destroying recruiter triage decisions.
3. **Normalized Skill Storage**:
   - Rather than storing skills only as unstructured JSON strings, a 3NF relation (`skills` and `candidate_skills`) is maintained. This allows fast, B-tree indexed skill filtering and relational aggregation via foreign-key indexes.
4. **Isolated Test Execution**:
   - Automated tests instantiate fresh, isolated in-memory SQLite instances (`:memory:`), preventing race conditions and leaving the local development database (`data/candidates.db`) clean.
5. **AI Integration Architecture & Security Boundaries**:
   - The AI Candidate-Fit feature utilizes `@google/genai` targeting `gemini-3.8-flash` (or configurable via `LLM_MODEL`).
   - **Zero Key Leakage**: `LLM_API_KEY` (and compatibility fallback `GEMINI_API_KEY`) is stored strictly in server-side `.env` and is never exposed to Vite frontend bundles, client payloads, or error logs.
   - **Grounded Verification**: The backend retrieves candidate profiles directly from SQLite via `getCandidateById`. Client-supplied candidate claims are ignored.
   - **Prompt Injection Mitigation**: Untrusted user inputs (`jobDescription` and candidate `notes`) are XML-escaped and fenced within isolated XML tags `<job_description>` and `<candidate_profile>` to mitigate prompt injection risks.
   - **Ethical Guardrails**: System instructions strictly prohibit inferring or evaluating protected demographic characteristics (race, gender, age, disability, nationality, etc.).
   - **Structured JSON Output**: Enforces a strict response schema (`responseMimeType: 'application/json'`, `responseSchema`) to validate typed output fields.
   - **Decision Support**: Every AI response includes an explicit disclaimer that evaluations are advisory decision support for human recruiters and do not constitute automated hiring decisions.
6. **Semantic Search Scope & Roadmap Decision**:
   - The case-study brief requires *one* AI-powered feature. We prioritized the **Candidate-Fit Summary and Gap Analysis** because recruiters triaging active job orders gain immediate value from seeing verified versus unverified requirements.
   - Building a full-scale vector search engine requires an embedding pipeline (e.g. `text-embedding-004`), persistent vector indexing (`sqlite-vss` / HNSW), embedding cache invalidation, and cosine similarity ranking. For a 48-candidate dataset under the time budget, an in-memory embedding loop would introduce unnecessary API latency and rate-limit overhead without adding higher triage utility than targeted fit evaluation. The modular architecture is designed for a vector search extension in a follow-up sprint.

---

---

## Task 2 — Code Problems & Algorithms

### Task 2a: Ranking at Scale (100,000+ Candidates)

Located in `backend/src/algorithms/ranking.ts`:

- **Distinct Skill Overlap**: Computes the exact number of distinct required skills possessed by each candidate. Duplicate skills in either the candidate's profile or the query list never inflate scores.
- **Strict Normalization**: Skills are trimmed and compared case-insensitively (`s.trim().toLowerCase()`).
- **Deterministic Tie-Breaking**:
  1. **Score** (descending) — most skill matches first.
  2. **Years of Experience** (descending) — more seasoned candidates prioritized on equal match count.
  3. **Candidate Name** (ascending) — alphabetical order for stable presentation.
  4. **Candidate ID** (ascending) — absolute unique tie-breaker.
- **Input Immutability**: All operations preserve original candidate objects and skill arrays without mutation.
- **Two Implementations**:
  1. `rankCandidatesBaseline`: Direct mapping and full array sort $O(N \cdot S_c + N \log N)$.
  2. `rankCandidatesOptimized`: Partitioning into $R + 1$ score buckets (Bucket Sort) where $R$ is the number of distinct required skills ($R \le 30$). Enables linear $O(N \cdot S_c)$ distribution and top-K early exit that halts processing once $K$ candidates are accumulated.

#### Complexity Analysis & Trade-Offs

| Implementation | Time Complexity (Full) | Time Complexity (Top-K Early Exit) | Space Complexity | Practical Behavior & Trade-Offs |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline** | $O(N \cdot S_c + N \log N)$ | $O(N \cdot S_c + N \log N)$ | $O(N)$ | Sorts the entire candidate array with the multi-attribute comparator, spending CPU time ordering thousands of low- or zero-match applicants. |
| **Optimized Bucket Sort** | $O(N \cdot S_c + \sum_{s \in \text{all}} B_s \log B_s)$ | $O(N \cdot S_c + \sum_{s \in \text{visited}} B_s \log B_s)$ | $O(N)$ | Partitions candidates in $O(N \cdot S_c)$ time. Because each visited bucket is sorted in full with the tie-breaker comparator, worst-case time remains $O(N \log N)$ if candidates cluster in the top bucket. In practice, top score buckets are sparse; early exit gathers $K$ candidates and skips sorting and inspecting all lower-scoring buckets entirely. |

---

### Task 2b: AI Code Review & Bug Fix

Located in `backend/src/algorithms/matchCandidatesFixed.ts`:

#### Bugs & Design Smells in Original AI Snippet

```typescript
// Original buggy snippet from prompt
function matchCandidates(candidates, requiredSkills) {
  let matches = [];
  for (i = 0; i <= candidates.length; i++) {
    const c = candidates[i];
    const score = c.skills.filter(s => requiredSkills.includes(s));
    if (score.length > 0) {
      matches.push({ name: c.name, score: score });
    }
  }
  return matches.sort((a, b) => a.score - b.score);
}
```

1. **Undeclared Loop Variable (`i`)**: Missing `let`/`const`, leaking `i` to global scope (or throwing `ReferenceError` in strict mode).
2. **Off-by-One Array Boundary (`i <= candidates.length`)**: Causes `candidates[candidates.length]` to evaluate to `undefined`, immediately crashing on the final iteration with `TypeError: Cannot read properties of undefined (reading 'skills')`.
3. **Array Stored as Score**: `c.skills.filter(...)` returns `string[]`. The object pushes `{ name, score: [...] }`, so `score` is an array of strings rather than a number.
4. **Invalid Sort Comparator (`a.score - b.score`)**: Array subtraction `[...array] - [...array]` evaluates to `NaN` in JavaScript, producing broken and non-deterministic ordering. Furthermore, numeric `a - b` sorts ascending (worst matches first), whereas recruiters require descending order (best matches first).
5. **Duplicate Skill Inflation**: If a candidate lists `['React', 'React']`, both match, inflating the match count.
6. **Case Sensitivity & Whitespace**: `requiredSkills.includes(s)` fails to match `'react'` with `'React'`.
7. **Missing Null/Undefined Checks**: Crashes if `c.skills`, `candidates`, or `requiredSkills` is null or undefined.
8. **No Deterministic Tie-Breaking**: Candidates with identical scores had arbitrary ordering.

#### 3–4 Sentence Review Reflection
> "The original function suffered from critical runtime errors: an undeclared loop variable `i` polluted the global scope, while the off-by-one condition `i <= candidates.length` caused a fatal `TypeError` crash on the final iteration. Functionally, assigning the filtered skill array to `score` caused array subtraction in the comparator to evaluate to `NaN`, corrupting the sort order while ignoring case normalization and duplicate skill inflation. The corrected implementation enforces strict TypeScript typing, normalizes skills case-insensitively, computes a distinct numeric match count, and guarantees deterministic descending ranking with alphabetical tie-breaking."

---

### Realistic 100,000 Candidate Benchmark

To evaluate scaling behavior empirically, a reproducible synthetic benchmark was executed using the **Mulberry32 PRNG** (fixed seed `20261019`):

- **Benchmark Configuration**:
  - Candidate Count: 100,000 synthetic candidates.
  - Skill Pools: 60 unique skills in pool; 8 required skills; 4–12 skills per candidate.
  - Environment: Node.js `v22.22.2`, Windows x64 (`win32 / x64`).
  - Iterations: High-resolution `performance.now()`, 2 warm-up runs, 5 measured runs.
  - Throughput Formula: $\text{Throughput} = \frac{\text{Candidate Count}}{\text{Latency in seconds}} = \frac{100,000}{\text{latency\_ms} / 1000}$.

#### Newly Measured Results

| Algorithm Variant | Mean Latency | Median Latency | Min Latency | Throughput (Mean) | Throughput (Median) | Speedup vs Baseline (Mean / Median) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline (Full Array Sort)** | 272.73 ms | 265.00 ms | 263.73 ms | 366,667 cand/sec | 377,358 cand/sec | 1.00x (Ref) |
| **Optimized Bucket Sort (Full Rank)** | 279.97 ms | 253.88 ms | 241.63 ms | 357,182 cand/sec | 393,887 cand/sec | 0.97x (mean) / 1.04x (median) |
| **Optimized (Top-100 Early Exit)** | 134.23 ms | 102.18 ms | 99.28 ms | 745,003 cand/sec | 978,665 cand/sec | 2.03x (mean) / 2.59x (median) |

#### Methodology & Interpretation

1. **Synthetic vs. Production Performance**: These figures measure raw in-memory algorithmic processing of generated JavaScript candidate objects. They do not represent end-to-end production server response times, which are bounded by network I/O, SQLite disk operations, and HTTP serialization.
2. **Full Ranking Comparison**: When sorting all 100,000 candidates completely, Bucket Sort performs comparably to the baseline sort (0.97x mean, 1.04x median) because every non-empty score bucket must still be visited and sorted in full with the 4-tier tie-breaking comparator.
3. **Top-K Early Exit Advantage**: In practical recruiter workflows (such as retrieving the top 100 matches), Bucket Sort halts as soon as 100 candidates are collected from the highest score buckets. It completely skips sorting and traversing the lower-scoring buckets, yielding a measured 2.03x mean (2.59x median) speedup over baseline sorting.

Run the benchmark locally:
```bash
npm run benchmark
```

---

## Prerequisites & Setup

- **Node.js**: `v22.x` or higher (verified on `v22.22.2`)
- **npm**: `v10.x` or `v12.x` (verified on `12.0.2`)
- **Git**: `v2.x` or higher

### Getting Started

1. **Environment Setup**:
   ```bash
   cp .env.example .env
   ```
   Configure the following in `.env`:
   ```ini
   PORT=4000
   NODE_ENV=development
   DATABASE_PATH=./data/candidates.db
   CORS_ORIGIN=http://localhost:5173

   # AI / LLM Configuration (Google Gemini)
   LLM_PROVIDER=gemini
   LLM_API_KEY=your_gemini_api_key_here
   LLM_MODEL=gemini-3.8-flash
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Database Seeding** (safe and idempotent):
   ```bash
   npm run db:seed
   ```

4. **Run Automated Test Suite** (70 tests, zero external API calls):
   ```bash
   npm test
   ```
   *Note: All 70 automated tests use mocked provider responses and execute with 100% determinism without consuming Gemini API tokens or requiring an internet connection. Measured execution times: Backend (~25s across 60 tests and 11 test suites with isolated in-memory SQLite instances) and Frontend (~2.7s across 10 Vitest tests).*

5. **Run Performance Benchmark** (100,000 synthetic candidates):
   ```bash
   npm run benchmark
   ```

6. **Run Full Monorepo Typecheck & Production Build**:
   ```bash
   npm run typecheck
   npm run build
   ```

7. **Start Full-Stack Development Servers**:
   - Backend API (`http://localhost:4000`):
     ```bash
     npm run dev:backend
     ```
   - Frontend Dashboard (`http://localhost:5173`):
     ```bash
     npm run dev:frontend
     ```
   - Or start both simultaneously:
     ```bash
     npm run dev
     ```

8. **Optional Live Gemini Manual Verification Command** (requires valid `LLM_API_KEY` in `.env`):
   *Note: The repository's automated test suites are 100% mocked and require no external keys. The inline Node command below is an optional developer check to manually verify live Gemini API connectivity with your own configured key:*
   ```bash
   node -e "
   require('dotenv').config({ path: './.env' });
   const request = require('supertest');
   const { createApp } = require('./backend/dist/app');
   const { createDatabase } = require('./backend/dist/db/index');
   const { seedCandidates } = require('./backend/dist/db/seed');
   const db = createDatabase(':memory:');
   seedCandidates(db, './data/candidates.json');
   const app = createApp(db);
   request(app)
     .post('/api/ai/candidate-fit')
     .send({ candidateId: 'cand_001', jobDescription: 'ML Engineer with Java and Kubernetes experience.' })
     .then(res => console.log('Live Gemini Smoke Test:', res.status === 200 ? 'SUCCESS' : res.status, res.body));
   "
   ```
