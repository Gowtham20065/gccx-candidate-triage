# GCCX Candidate Triage Platform — Technical Presentation

**Candidate:** AI Full-Stack Engineer Intern Applicant
**Duration:** 10 Minutes | **Format:** 8 Slides with Architecture Diagrams & Speaker Notes

---

## Slide 1: The Problem, Brief & Key Assumptions
*Timing: 0:00 – 1:00 (1 Minute)*

### On-Slide Content
- **The Core Problem**: Recruiters manage hundreds of applicants across static spreadsheets with gut-feel evaluation, slow screening cycles, and zero audit trails.
- **The Mandate**: Deliver a Candidate Triage prototype tool:
  - Responsive recruiter dashboard with search, filtering, and triage status tracking.
  - Normalized SQLite persistence with non-destructive seeding.
  - Exactly **one** high-value AI-powered feature calling a live LLM model.
  - Algorithmic ranking capable of scaling to 100,000+ candidates.
- **Key Assumptions Made**:
  - *Status Model*: Defined standard triage lifecycle (`untriaged` $\rightarrow$ `shortlisted` or `rejected`).
  - *Data Integrity*: Biographical seed updates must never overwrite recruiter triage decisions.
  - *AI Scope*: Evidence-grounded candidate-fit evaluation against recruiter job descriptions delivers higher triage leverage than raw semantic vector search on 48 candidates.

### Suggested Visual
```text
[ Raw Spreadsheets / Gut Feel ] ───▶ [ GCCX Triage Platform ] ───▶ [ In-Memory Ranking ]
                                                               └───▶ [ Grounded Gemini Fit ]
                                                               └───▶ [ Persistent Triage Decisions ]
```

### Speaker Notes
> "Welcome everyone. The core scenario in this case study is recruitment triage at speed. Today, recruiters drown in spreadsheets, relying on gut feel to screen applicants. Our mission was to build a functional candidate triage prototype that combines deterministic ranking with grounded AI decision support.
> Ambiguity was intentional in the brief, so we made two foundational architectural calls upfront: first, recruit triage state must persist non-destructively across server reseeds; second, the single AI feature should directly solve the recruiter's hardest problem—evaluating applicant qualifications against a specific job description with verifiable evidence and explicit gap analysis."

---

## Slide 2: Full-Stack Architecture & Normalized Data Layer
*Timing: 1:00 – 2:30 (1.5 Minutes)*

### On-Slide Content
- **TypeScript Monorepo**: Structured via npm workspaces (`backend/` and `frontend/`).
- **Backend**: Express + Node.js 22 + `better-sqlite3` with strict request validation and error envelopes.
- **Frontend**: React 18 + Vite + accessibility-conscious design system with debounced filtering and slide-out details drawer.
- **Data Layer (3NF Normalized)**:
  - `candidates`: Core biographical records and triage status.
  - `skills`: Normalized skill dictionary (`NOCASE` unique constraint).
  - `candidate_skills`: Many-to-many junction table with cascade deletion.
  - Performance indexes on `status`, `target_role`, `source`, `years_experience`, and `applied_date`.

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
> "Let's examine the system architecture. Rather than treating SQLite as a flat JSON dump, we modeled a normalized Third Normal Form schema with a dedicated skills dictionary and foreign-key junction table. This gives us fast, B-tree indexed queries and prevents duplicate skill inflation.
> Our seed script is completely idempotent: it updates candidate records on conflict but deliberately omits the triage status column, preserving recruiter decisions across restarts.
> On the frontend, we built an accessible single-page dashboard featuring debounced multi-criteria search, KPI filter cards, quick status mutations, and a slide-out candidate details drawer."

---

## Slide 3: Task 2a — Candidate Ranking at Scale (100,000+ Records)
*Timing: 2:30 – 4:00 (1.5 Minutes)*

### On-Slide Content
- **Problem**: Rank candidates by distinct required skill matches for 100,000+ applicants under strict latency limits.
- **Algorithm Design**:
  - Distinct skill set overlap: Duplicates in candidate profile or query never inflate scores.
  - Case-insensitive trimming (`React` == ` react `).
  - Four-tier deterministic tie-breaking: `Score (desc)` $\rightarrow$ `Experience (desc)` $\rightarrow$ `Name (asc)` $\rightarrow$ `ID (asc)`.
- **Complexity & Optimization (Bucket Sort)**:
  - Partitioning across $R + 1$ buckets: Time $O(N \cdot S_c)$, Space $O(N)$ (where $S_c \ll N$ is candidate skill count).
  - Bucket Sorting: Visited buckets are sorted in full with the tie-breaker ($O(\sum_{s \in \text{visited}} B_s \log B_s)$); worst case remains $O(N \log N)$ if candidates cluster in the top score bucket.
  - Practical Benefit: Top-K early exit skips sorting and inspecting lower-scoring buckets once $K$ candidates are collected.
- **Newly Measured Synthetic Benchmark (100,000 Candidates, Node v22, Windows x64)**:
  - Baseline Full Array Sort: **272.73 ms** mean / **265.00 ms** median (~366,667 cand/sec).
  - Optimized Full Ranking: **279.97 ms** mean / **253.88 ms** median (~357,182 cand/sec, 1.04x median speedup).
  - **Optimized Top-100 Early Exit: 134.23 ms mean / 102.18 ms median (745,003 cand/sec) — 2.03x mean / 2.59x median speedup**.
  - *(Note: Synthetic in-memory benchmark measurements on generated objects, not production server response times).*

### Suggested Visual
```text
100,000 Candidates ──▶ [ Distinct Skill Match ] ──▶ [ Partition into Buckets 0..R ]
                                                              │
Top-100 Early Exit ◄── [ Quick Sort Top Buckets Only ] ◄──────┘ (Skips zero-match candidates)
```

### Speaker Notes
> "In Task 2a, we tackled ranking candidates at scale. The baseline sorts all 100,000 candidates with an O(N log N) comparator. Our Bucket Sort partitions candidates in linear time based on skill count. While each visited bucket is still sorted in full with the tie-breaker, early exit halts after gathering 100 candidates and skips sorting lower buckets. In our synthetic in-memory benchmark on 100,000 synthetic candidates, this reduced median latency to 102 ms, achieving a 2.03x mean and 2.59x median speedup over baseline sorting."

---

## Slide 4: Task 2b — AI Code Review, Bug Resolution & Reflection
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

## Slide 5: Task 1 AI Feature — Grounded Fit Summaries with Gemini
*Timing: 5:00 – 6:30 (1.5 Minutes)*

### On-Slide Content
- **Live Integration (`@google/genai` + `gemini-3.8-flash`)**:
  - Reuses canonical `LLM_PROVIDER`, `LLM_API_KEY`, and `LLM_MODEL` environment variables.
  - Verified against current Google Gemini documentation.
- **Grounded Fact Pipeline**:
  - Candidate details fetched directly from SQLite via `getCandidateById`. Client attributes are ignored.
  - Recruiter Job Description and candidate notes are XML-escaped and fenced (`<job_description>`, `<candidate_profile>`) to mitigate prompt injection risks.
- **Structured JSON Schema**:
  - Generates typed fields: `fit_level` (`strong`/`moderate`/`weak`/`unclear`), `one_line_summary`, `supported_skills`, `missing_or_unverified_skills`, `experience_fit`, `fit_rationale`, and `uncertainties_or_risks`.
- **Ethical Safeguards & Human Decision Support**:
  - System instructions strictly ban protected demographic evaluations.
  - Every output includes an explicit advisory disclaimer: AI supports human recruiters; it does not make automated hiring decisions.

### Suggested Visual
```text
Recruiter JD ──▶ [ XML Sanitizer ] ──┐
                                     ├──▶ [ gemini-3.8-flash ] ──▶ [ Structured Fit Result ]
SQLite Facts ──▶ [ Server Lookup ] ──┘    (Low Temp 0.2)           - Fit Level: Strong
                                                                   - Supported vs Missing
                                                                   - Interview Flags
```

### Speaker Notes
> "For Task 1's AI feature, we built an evidence-grounded candidate fit summary and gap analysis tool powered by Google Gemini 3.8 Flash.
> Crucially, this feature never trusts client-supplied candidate data: the backend fetches candidate facts strictly from SQLite. We sanitize both the job description and recruiter notes with XML delimiters to mitigate prompt injection risks.
> Using Gemini's native structured schema output, the model returns a concise one-line summary, an explicit list of supported skills, a breakdown of missing or unverified requirements, and interview probing flags based on recruiter notes.
> All responses carry an ethical safeguard: demographic attributes are strictly excluded, and output is explicitly framed as human decision support."

---

## Slide 6: Testing Rigor & The AI Collaboration Workflow
*Timing: 6:30 – 8:00 (1.5 Minutes)*

### On-Slide Content
- **Total Test Suite: 70 Tests Passing, 0 Failures**:
  - Backend (`node:test`): 60 tests (~25s total duration across 11 suites with in-memory SQLite instances).
  - Frontend (`vitest`): 10 tests (~2.7s duration covering dashboard UI, filtering, mutations, and AI drawer).
- **100% Deterministic Mocked Automated Tests**:
  - Zero external network dependencies, zero API key requirements, and zero token expense.
  - Simulates rate limits (`429`), auth errors (`503`), safety blocks (`422`), timeouts (`504`), and invalid JSON (`502`).
- **Distinction from Manual Live Verification**:
  - A manual live check was executed during development with a valid API key against real candidate `cand_001` (Sameer Rao) to confirm live model schema adherence.
  - No live credentials or smoke-test scripts are included in the repository; all repository test suites run 100% mocked.
- **Dataset Integrity**:
  - Official `data/candidates.json` verified byte-for-byte identical (`SHA-256: 2B68CD53...`).

### Suggested Visual
```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        70 Automated Tests Passing (0 Failures)                         │
├───────────────────────────────┬───────────────────────────────┬────────────────────────┤
│ Backend API & DB (29 tests)   │ Algorithmic Ranking (20 tests)│ AI & Frontend (21 tests)│
│ - REST Endpoints: 23 passed   │ - Bucket Sort: 11 passed      │ - AI Routes Mock: 11   │
│ - SQLite 3NF Schema: 6 passed │ - Bug Fix Review: 9 passed    │ - React Dashboard: 10  │
└───────────────────────────────┴───────────────────────────────┴────────────────────────┘
```

### Speaker Notes
> "Engineering quality requires verification. Across the entire monorepo, we authored 70 automated tests—60 on the backend and 10 on the frontend.
> Every single automated test runs with 100% determinism using mocked Gemini clients, with execution taking ~25 seconds on the backend (across 60 tests and 11 suites with isolated in-memory SQLite instances) and ~2.7 seconds on the frontend (10 Vitest tests). We exhaustively tested failure paths including rate limits, authentication errors, safety blocks, and network timeouts.
> Separately, a manual live check was run during development to confirm end-to-end integration with the real Gemini API. Finally, we verified that the original candidates.json dataset remains completely untouched with identical SHA-256 hashes."

---

## Slide 7: Task 4 — Scaling to 3,000 Candidates/Week
*Timing: 8:00 – 9:00 (1 Minute)*

### On-Slide Content
- **The Challenge**: Roll out to a client processing 3,000 candidates/week (~430/day) with 2 engineers in 2 weeks.
- **What We Build First (Week 1–2 Priority)**:
  - Asynchronous batch worker queue (BullMQ/Redis) for spike absorption (Proposed).
  - Two-tier screening pipeline (Proposed): Bucket Sort reduces 3,000 candidates to the top 10% (300) before calling the LLM, slashing API costs by ~90%.
  - Hashed caching (`SHA256(cand_id + jd_hash)`) to eliminate duplicate LLM inference (Proposed).
  - Recruiter bulk triage actions and immutable compliance audit logs (Proposed).
- **What We Explicitly Refuse to Build Yet**:
  - Fully automated rejection/hiring decisions (mitigating compliance risks under EEOC, Title VII, and NYC Local Law 144).
  - Custom resume PDF OCR parsing (require structured ATS webhooks instead).
  - Distributed vector database infrastructure (premature for 3,000 candidates/week).
- **#1 Management Risk**:
  - *Algorithmic Bias & Reliance Liability*: Recruiters treating AI as objective truth rather than decision support.

### Suggested Visual
```text
3,000 Applicants ──▶ [ Async Intake Queue ] ──▶ [ Bucket Sort (102ms) ] ──▶ Top 10% (300)
                                                                                  │
Client Launch ◄── [ Human Recruiter Sign-off ] ◄── [ Cached Gemini Fit (300) ] ◄──┘
```

### Speaker Notes
> "In Task 4, leadership asked how to scale this to 3,000 candidates a week with 2 engineers in 2 weeks. Our judgment centers on ruthless prioritization.
> What we build first: an asynchronous worker queue to absorb ingestion bursts, and a two-tier screening pipeline. We run our bucket sort algorithm across all 3,000 candidates to identify the top 10%, and only invoke Gemini on those 300 finalists. Combined with hashed caching, this cuts LLM latency and costs by 90%.
> What we explicitly refuse to build: automated rejections without human sign-off, which introduces severe legal liability under hiring regulations; and complex vector databases, which are completely unnecessary at 3,000 candidates a week.
> The number one risk we flag to management is recruiter over-reliance on AI summaries, which we mitigate with mandatory human sign-off."

---

## Slide 8: What We'd Build Next in a Real Sprint
*Timing: 9:00 – 10:00 (1 Minute)*

### On-Slide Content
- **Sprint Goal**: Production hardening for enterprise recruitment operations.
- **Deliverables for Next 2-Week Sprint**:
  1. *ATS Webhook Ingestion*: Two-way sync with Greenhouse and Lever for automatic candidate imports and triage status export.
  2. *Vector Search Module*: Local SQLite vector indexing (`sqlite-vss`) using `text-embedding-004` embeddings for semantic similarity search over recruiter notes.
  3. *Recruiter Collaboration*: Shared search collections, recruiter comments, and role-based permissions.
  4. *Observability & Telemetry*: OpenTelemetry tracing on Gemini latency, cache hit ratios, and recruiter agreement rates with AI recommendations.
- **Summary**: A disciplined, high-performance foundation built under tight time constraints, fully tested, and ready for progressive scaling.

### Suggested Visual
```text
[ Current Foundation: Fast Ranking + Grounded Fit ]
                       │
                       ├──▶ [ Two-Way ATS Sync (Greenhouse/Lever) ]
                       ├──▶ [ SQLite-VSS Embedding Search ]
                       └──▶ [ Recruiter Observability & Audit Dashboards ]
```

### Speaker Notes
> "To conclude, if given a full two-week sprint, we would transition this prototype into a multi-tenant enterprise service. We would introduce two-way ATS sync with Greenhouse and Lever, integrate local SQLite-VSS vector search over recruiter notes, add team collaboration tools, and deploy telemetry to monitor AI latency and recruiter agreement rates.
> We delivered a complete TypeScript monorepo, 70 passing tests, in-memory bucket sorting, an accessible React dashboard, and a grounded Gemini integration—achieved with disciplined scope and verified code.
> Thank you, and I look forward to your questions and walking through the codebase."
