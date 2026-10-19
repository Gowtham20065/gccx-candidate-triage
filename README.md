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
5. **Run Typecheck**:
   ```bash
   npm run typecheck
   ```
6. **Start Development Server**:
   ```bash
   npm run dev:backend
   ```
