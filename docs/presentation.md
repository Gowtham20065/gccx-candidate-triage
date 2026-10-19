# GCCX Candidate Triage Platform — Technical Presentation

**Candidate:** AI Full-Stack Engineer Intern Applicant
**Duration:** 10 Minutes | **Format:** 7 Slides (including Live Demo) with Architecture Diagrams & Speaker Notes

---

## Slide 1: The Problem, Context & Core Assumptions
*Timing: 0:00 – 1:00 (1 Minute)*

### On-Slide Content
- **The Core Problem**: Recruiters triage hundreds of candidates across static spreadsheets with gut feel, slow screening cycles, and no persistent decision tracking.
- **The Mandate**: Deliver a functional candidate triage prototype:
  - Responsive recruiter dashboard with search, filtering, and triage status tracking.
  - Normalized SQLite persistence with non-destructive seeding.
  - Exactly **one** high-value AI feature calling a live LLM model.
  - Algorithmic candidate ranking evaluated at scale.
- **Key Assumptions Made**:
  - *Triage Lifecycle*: Defined standard statuses (`untriaged` $\rightarrow$ `shortlisted` or `rejected`).
  - *Data Integrity*: Re-seeding database from JSON must never overwrite existing recruiter triage decisions.
  - *Targeted AI Value*: Evidence-grounded candidate-fit evaluation against recruiter job descriptions delivers higher triage value than generic semantic search over 48 mock candidates.

### Suggested Visual
```text
[ Spreadsheets & Gut Feel ] ──▶ [ GCCX Candidate Triage ] ──▶ [ Fast In-Memory Ranking ]
                                                          └──▶ [ Grounded Gemini Fit ]
                                                          └──▶ [ Persistent Triage Decisions ]
```

### Speaker Notes
> "Welcome everyone. Recruiters today triage hundreds of applicants using spreadsheets and gut feel. Our goal was to build a functional candidate triage prototype combining fast in-memory ranking with evidence-grounded AI decision support.
> We made two foundational architectural decisions upfront: first, recruiter triage decisions must persist non-destructively across server restarts; second, the single AI feature should directly solve the recruiter's hardest problem—evaluating applicant qualifications against a specific job description with verifiable evidence and explicit gap analysis."

---

## Slide 2: Full-Stack Architecture & Normalized Data Layer
*Timing: 1:00 – 2:30 (1.5 Minutes)*

### On-Slide Content
- **TypeScript Monorepo**: Structured via npm workspaces (`backend/` and `frontend/`).
- **Backend**: Express + Node.js 22 + `better-sqlite3` with strict request validation and consistent error envelopes.
- **Frontend**: React 18 + Vite + accessibility-conscious design system with debounced filtering and a slide-out details drawer.
- **Data Layer (3NF Normalized)**:
  - `candidates`: Core biographical records and persistent triage status.
  - `skills`: Normalized skill dictionary (`NOCASE` unique constraint).
  - `candidate_skills`: Many-to-many junction table with cascade deletion.
  - B-tree indexes on `status`, `target_role`, `source`, `years_experience`, and `applied_date`.

### Suggested Visual
```text
┌──────────────────────┐         ┌───────────────────────────┐         ┌──────────────────────────┐
│   React 18 + Vite    │ ◄─────► │    Express 4 + Node 22    │ ◄─────► │   SQLite 3 (WAL Mode)    │
│  - Debounced Search  │  REST   │  - Route Controllers      │ better- │  - 3NF Normalized Schema │
│  - Modal Drawer UI   │  JSON   │  - Gemini Service Layer   │ sqlite3 │  - Indexed Foreign Keys  │
│  - Status KPI Cards  │         │  - Bucket Sort Engine     │         │  - Non-destructive Seed  │
└──────────────────────┘         └───────────────────────────┘         └──────────────────────────┘
```

### Speaker Notes
> "Let's examine the system architecture. Rather than treating SQLite as a flat JSON store, we modeled a normalized Third Normal Form schema with a dedicated skills dictionary and foreign-key junction table. This gives us clean relational integrity, eliminates duplicate skills, and provides fast indexed lookups.
> Our seed script is idempotent: it updates biographical records on conflict but deliberately omits the triage status column, preserving recruiter decisions across restarts.
> On the frontend, we built an accessible single-page dashboard featuring debounced search, status KPI cards, quick triage mutations, and an evaluation drawer."

---

## Slide 3: Ranking at Scale: Bucket Sort vs. Inverted Index
*Timing: 2:30 – 4:00 (1.5 Minutes)*

### On-Slide Content
- **Problem**: Rank 100,000 candidates by distinct required skill overlap with deterministic tie-breaking.
- **Algorithm Design**:
  - Distinct skill set matching: Duplicate candidate or query skills never inflate scores.
  - 4-tier tie-breaking: `Score (desc)` $\rightarrow$ `Experience (desc)` $\rightarrow$ `Name (asc)` $\rightarrow$ `ID (asc)`.
- **Honest Benchmark Numbers (100,000 Synthetic Candidates, Node v22, Windows x64)**:
  - Baseline Full Array Sort: **265.00 ms** median (272.73 ms mean) — $O(N \cdot S_c + N \log N)$.
  - Bucket Sort Full Rank: **253.88 ms** median (279.97 ms mean) — **~1x** (no speedup over baseline sort because all non-empty buckets must still be sorted in full).
  - **Bucket Sort Top-100 Early Exit: 102.18 ms median (134.23 ms mean) — ~2x speedup (2.03x mean, 2.59x median)** because it stops once 100 candidates are found, skipping lower score buckets.
- **Architectural Next Step (Inverted Index)**:
  - For repeated queries over an existing corpus, an **Inverted Index** (`Map<skill, candidateId[]>`) is structurally superior: candidates with zero matching skills are never touched, dropping query time to $O(\sum |\text{Postings}(R_j)|)$.

### Suggested Visual
```text
100,000 Candidates ──▶ [ Score Partitioning 0..R ] ──▶ [ Gather Top Buckets Only ] ──▶ Top-100 Early Exit (102 ms)
                                                                                        (Skips zero-match candidates)
```

### Speaker Notes
> "In Task 2a, we tackled ranking candidates at scale. The naive baseline sorts all 100,000 candidates with an O(N log N) comparator. Our Bucket Sort partitions candidates by distinct skill matches in linear time.
> Here are the honest benchmark numbers: if you sort all 100,000 candidates, Bucket Sort gives about 1x—virtually no speedup over baseline sorting—because every non-empty bucket still has to be sorted with the tie-breaker. But for Top-K queries where a recruiter only needs the top 100 matches, early exit skips sorting lower buckets entirely, giving a real ~2x speedup.
> If we were building this for repeated production queries, we would implement an Inverted Index, which skips candidates with zero matches without even an O(N) scan."

---

## Slide 4: Task 2b — AI Code Review & Reflection
*Timing: 4:00 – 5:00 (1 Minute)*

### On-Slide Content
- **Flawed AI Snippet Analysis**:
  - `i = 0`: Undeclared loop variable leaked to global scope.
  - `i <= candidates.length`: Off-by-one array boundary causing a fatal `TypeError` crash on the last iteration.
  - `score = c.skills.filter(...)`: Assigned an array of strings to `score` instead of an integer count.
  - `matches.sort((a,b) => a.score - b.score)`: Array subtraction evaluates to `NaN` in JS, destroying sort ordering. Ascending sort orders worst matches first.
  - Ignored case sensitivity, allowed duplicate skills to inflate scores, and had no deterministic tie-breaking.
- **The Corrected Module (`matchCandidatesFixed.ts`)**:
  - Strict TypeScript types, case-normalization, distinct set intersection, and deterministic descending order.
- **AI Review Reflection**:
  > *"A developer who glanced at the AI output without reading line-by-line would see syntax that looked reasonable, but ship code that immediately crashed in production with an off-by-one exception, failed to compute numeric scores, and produced non-deterministic sorting due to NaN array arithmetic."*

### Suggested Visual
```text
[ AI Draft Code ] ──▶ [ Bug 1: i <= len Crash ]    ──▶ [ Corrected Implementation ]
                  ──▶ [ Bug 2: score = string[] ]   ──▶ [ Strict TypeScript Typing ]
                  ──▶ [ Bug 3: a.score - b.score=NaN] ──▶ [ Deterministic Descending Sort ]
```

### Speaker Notes
> "Task 2b was a realistic assessment of reviewing AI code. The snippet looked plausible at first glance, but contained two fatal bugs and several design smells: an undeclared loop variable, an off-by-one loop boundary that crashes with a TypeError on the last candidate, an array assigned to score, and array subtraction in the comparator that evaluates to NaN.
> Our takeaway is fundamental to AI-native engineering: AI is exceptional at accelerating boilerplate, but blind acceptance without rigorous line-by-line verification, typing, and automated testing introduces silent, catastrophic failures."

---

## Slide 5: Live Demo & Walkthrough (The Recruiter Dashboard)
*Timing: 5:00 – 7:00 (2 Minutes)*

### On-Slide Content
- **Live System Walkthrough Guide**:
  1. **Dashboard & KPIs**: Real-time status counts (`Untriaged`, `Shortlisted`, `Rejected`) and debounced search across candidates.
  2. **Candidate Drawer**: Inspect candidate experience, sourcing channel, qualitative notes, and normalized skill badges.
  3. **Immediate Triage Mutation**: Shortlist or reject a candidate — persists immediately via `PATCH /api/candidates/:id/status`.
  4. **Live Gemini Candidate-Fit Evaluation**:
     - Select a job description preset (e.g. Senior Backend / ML Engineer).
     - Trigger `POST /api/ai/candidate-fit` powered by `gemini-3.8-flash`.
     - Inspect structured output: fit level, supported skills, unverified requirements, and interview probing flags.
- **Defensive API Architecture**:
  - XML sanitization fencing (`<job_description>`, `<candidate_profile>`) mitigating prompt injection.
  - 100% mocked automated tests (65 backend in ~25s, 10 frontend in ~2.8s) covering 429, 503, 422, and 504 errors.

### Suggested Visual
```text
[ Recruiter Search & Filter ] ──▶ [ Candidate Drawer ] ──▶ [ Live Gemini Candidate-Fit ]
          │                                 │                               │
[ Status KPI Cards: 48 Total ]    [ PATCH /status ]            [ Structured JSON Fit Report ]
```

### Speaker Notes
> "Now let's switch to the running application for a quick live walkthrough.
> On the dashboard, we have our 48 candidate records with KPI metric cards, debounced search, and target-role filtering. When I open a candidate's details drawer, we see their normalized skills and notes. Clicking 'Shortlist' or 'Reject' persists their state immediately to SQLite.
> When we select a job description and click 'Evaluate Candidate Fit', the backend fetches the candidate's verified facts from SQLite, wraps the input in XML tags to mitigate prompt injection, and calls Gemini 3.8 Flash with a strict JSON schema. The result gives the recruiter an evidence-grounded summary, verified skills, and explicit missing gaps to probe during interviews."

---

## Slide 6: Scaling to 3,000 Candidates/Week (Judgment Note)
*Timing: 7:00 – 8:30 (1.5 Minutes)*

### On-Slide Content
- **The Challenge**: Scale to a client handling 3,000 candidates/week (~430/day) with 2 engineers in 2 weeks.
- **The #1 Defensible Risk**:
  - **Skill Tag Quality & Silent Exclusion**: Resumes have inconsistent terminology ("Postgres" vs "RDBMS", "Node" vs "backend"). A naive pre-filter that uses keyword tag overlap to drop 90% of applicants creates severe false negatives, silently eliminating strong non-traditional candidates.
  - Furthermore, applicants apply across distinct roles; filtering must be scoped **per job requisition on daily intake**, not as a single global pool.
- **What We Build First (Weeks 1–2 Priority)**:
  1. *Per-Requisition Async Ingestion Queue*: Buffer daily intake (~430/day) via BullMQ/Redis and deduplicate by email/phone.
  2. *Recruiter-Selected Triage*: Present ranked candidates per open role; allow recruiters to select candidate batches for LLM evaluation rather than an automated top-10% cutoff.
  3. *Evaluation Caching & Resilience*: Cache fit evaluations by `SHA256(candidate_id + jd_hash)` with provider rate-limit retries.
  4. *Bulk Actions & Audit Trail*: Multi-candidate status mutations and an append-only triage audit log.
- **What We Explicitly Defer**:
  - Fully automated rejection/hiring decisions (regulatory risk under EEOC, Title VII, NYC Local Law 144).
  - Custom resume PDF OCR and heavy vector database clusters.

### Suggested Visual
```text
3,000 Daily Applicants ──▶ [ Per-Requisition Queue ] ──▶ [ Recruiter Batch Select ] ──▶ [ Cached Gemini Fit ]
                                                                                               │
Client Launch ◄────────── [ Human Recruiter Sign-Off ] ◄───────────────────────────────────────┘
```

### Speaker Notes
> "In Task 4, leadership asked how to scale this to 3,000 candidates a week with 2 engineers in 2 weeks. Our judgment starts by identifying the fatal flaw of a naive approach:
> If you use a raw keyword tag pre-filter to drop 90% of applicants, you will silently reject qualified candidates because resumes have varied terminology like 'Postgres' versus 'RDBMS'. Furthermore, 3,000 applicants apply across dozens of different job orders, arriving continuously at 430 a day.
> So instead of an automated global top-10% cutoff, we build an asynchronous ingestion queue per requisition, and let recruiters manually select batches of candidates to evaluate with Gemini. Combined with hashed caching in Redis and bulk audit logs, this gives recruiters speed without biased auto-rejections."

---

## Slide 7: What We'd Build Next in a Real Sprint
*Timing: 8:30 – 10:00 (1.5 Minutes)*

### On-Slide Content
- **Production Hardening Roadmap (Next 2-Week Sprint)**:
  1. *Inverted Index & Vector Search*: Build an in-memory inverted skill index for repeated queries, and integrate local `sqlite-vss` embeddings over recruiter notes.
  2. *Two-Way ATS Sync*: Webhook integrations with Greenhouse and Lever for automated candidate imports and two-way status export.
  3. *Persistent Evaluation Store*: Create an `evaluations` table in SQLite to persist LLM fit summaries and track recruiter agreement rates over time.
  4. *Recruiter Collaboration*: Shared candidate shortlists, recruiter comments, and role-based permissions.
- **Summary**: A disciplined, high-performance foundation built under tight time constraints, fully tested (75 passing tests), and designed for progressive scaling.

### Suggested Visual
```text
[ Current Foundation: SQLite + Fast Ranking + Live Gemini ]
                       │
                       ├──▶ [ Inverted Index & SQLite-VSS Vector Search ]
                       ├──▶ [ Two-Way ATS Sync (Greenhouse/Lever) ]
                       ├──▶ [ Persistent Evaluations & Agreement Tracking ]
                       └──▶ [ Recruiter Collaboration & Audit Trails ]
```

### Speaker Notes
> "To conclude, if given a full two-week sprint, we would transition this prototype into a multi-tenant enterprise service. We would introduce an inverted index and local SQLite-VSS vector search, build two-way ATS sync with Greenhouse and Lever, persist LLM fit summaries in an evaluations table to track recruiter agreement rates, and add team collaboration tools.
> We delivered a complete TypeScript monorepo, 75 passing tests, honest benchmark data, an accessible React dashboard, and a grounded Gemini integration—achieved with disciplined scope and defensible code.
> Thank you, and I look forward to walking through the codebase and answering your questions."
