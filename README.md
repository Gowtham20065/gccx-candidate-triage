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

---

## Architectural Assumptions & Decisions

1. **Triage Status Vocabulary**:
   - Defined as `'untriaged'` (default for newly ingested candidates), `'shortlisted'` (flagged for progression by recruiter), and `'rejected'` (declined).
2. **Idempotent, Non-Destructive Seeding**:
   - `seedCandidates` utilizes `INSERT INTO candidates ... ON CONFLICT(id) DO UPDATE SET ...` while **deliberately omitting** the `status` column from update mutations. This ensures that rerun seeds update master candidate biographical fields without resetting or destroying recruiter triage decisions.
3. **Normalized Skill Storage**:
   - Rather than storing skills only as unstructured JSON strings, a 3NF relation (`skills` and `candidate_skills`) is maintained. This allows $O(1)$ indexed skill filtering and aggregation for the client search requirements in Task 2.
4. **Isolated Test Execution**:
   - Automated tests instantiate fresh, isolated in-memory SQLite instances (`:memory:`), preventing race conditions and leaving the local development database (`data/candidates.db`) clean.

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
  1. `rankCandidatesBaseline`: Direct mapping and full array sort $O(N \log N)$.
  2. `rankCandidatesOptimized`: Partitioning into $R + 1$ score buckets (Bucket Sort) where $R$ is the number of distinct required skills ($R \le 30$). Enables $O(N)$ distribution and early-exit top-K pruning ($O(N + K \log K)$) when only top candidates are needed.

#### Complexity Analysis & Trade-Offs

| Implementation | Time Complexity (Full) | Time Complexity (Top-K) | Space Complexity | Practical Trade-Off |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline** | $O(N \cdot S_c + N \log N)$ | $O(N \cdot S_c + N \log N)$ | $O(N)$ | Simpler to read, but wastes CPU cycles sorting tens of thousands of zero-match candidates. |
| **Optimized Bucket Sort** | $O(N \cdot S_c + \sum B_i \log B_i)$ | $O(N \cdot S_c + K \log K)$ | $O(N)$ | Highly efficient for real-world recruiting where $R \ll N$. Employs early exit to only sort the highest scoring buckets. |

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

To verify scale requirements empirically, a reproducible benchmark generates 100,000 synthetic candidates using the **Mulberry32 PRNG** (fixed seed `20261019`):

- **Dataset**: 100,000 candidates, 60 unique skills in pool, 8 required skills, 4–12 skills per candidate.
- **Environment**: Node.js `v22.22.2`, Windows x64.
- **Timing**: High-resolution `performance.now()`, 2 warm-up runs, 5 measured iterations.

#### Measured Results (Actual Run)

| Algorithm Variant | Mean Latency | Median Latency | Throughput | Speedup vs Baseline |
| :--- | :--- | :--- | :--- | :--- |
| **Baseline (Full Array Sort)** | **266.69 ms** | 260.75 ms | 374,963 cand/sec | 1.00x (Ref) |
| **Optimized Bucket Sort (Full Rank)** | **252.35 ms** | 237.90 ms | 396,276 cand/sec | 1.06x |
| **Optimized (Top-100 Early Exit)** | **126.75 ms** | **94.03 ms** | **788,973 cand/sec** | **2.10x – 2.8x** |

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
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Seed Database** (optional; the server auto-seeds if empty on first launch):
   ```bash
   npm run db:seed
   ```
4. **Run Tests**:
   ```bash
   npm run test
   ```
5. **Run Benchmark**:
   ```bash
   npm run benchmark
   ```
6. **Run Typecheck**:
   ```bash
   npm run typecheck
   ```
7. **Start Development Server**:
   ```bash
   npm run dev:backend
   ```
