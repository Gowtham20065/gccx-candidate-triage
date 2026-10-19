# AI Collaboration Log

This log documents how I used AI tools while building the GCCX Candidate Triage tool, following the four required points in the case-study brief.

---

### 1. AI Tools Used & What For

- **Google Antigravity / Cursor-style Agent**: Used for initial monorepo workspace scaffolding, boilerplate TypeScript configurations, drafting the SQLite schema migration scripts, and generating the Mulberry32 synthetic data generator for benchmarking.
- **Google Gemini API (`gemini-3.8-flash`)**: Used for the runtime candidate-fit evaluation feature in Task 1, producing structured JSON summaries and skill gap analyses against recruiter job descriptions.

---

### 2. Real Prompts Used (Raw)

Here are three real prompts used during the build, including the initial messy instruction:

#### Prompt 1 (Messy / Iterative — Database Seeding)
> *"hey i need to seed the sqlite db from candidates.json but make sure if i restart the server it doesnt wipe out the shortlisted or rejected status a recruiter already picked. how do i do that in better-sqlite3 with an on conflict clause?"*

#### Prompt 2 (Algorithmic Ranking & Tie-Breaking)
> *"Write a ranking function in TypeScript that takes candidates and requiredSkills. Candidates have a skills array. Rank them by how many distinct skills match. Duplicate skills shouldn't count twice, casing and whitespace shouldn't matter, and if there's a tie break by experience desc, then name asc, then id asc. I need an approach that won't choke on 100k records."*

#### Prompt 3 (Gemini Integration & Error Envelope)
> *"Implement POST /api/ai/candidate-fit using @google/genai and gemini-3.8-flash. Fetch candidate facts from SQLite by id so the client can't tamper with them. Wrap the JD and recruiter notes in XML tags to mitigate prompt injection. Return strict JSON matching our schema (fit_level, oneLineSummary, supportedSkills, missingOrUnverifiedSkills, fitRationale). Handle 429 rate limits, 503 missing keys, and 504 timeouts cleanly without crashing the server."*

---

### 3. One Moment Where I Overrode / Reworked the AI

**V8 String Collation in the Ranking Comparator**

- **What the AI did**: For the alphabetical tie-breaker in Task 2a, the AI generated a standard comparator using `a.candidate.name.localeCompare(b.candidate.name)`.
- **The problem**: When I ran the 100,000-candidate benchmark, sorting took over **6,100 ms**. Profiling revealed that `String.prototype.localeCompare` performs full Unicode locale-aware collation. When invoked millions of times in a hot sort loop across 100k items, V8's internal collation stack causes massive overhead.
- **My override**: I replaced `localeCompare` with direct case-insensitive lexicographical comparisons:
  ```typescript
  const nameA = a.candidate.name.toLowerCase();
  const nameB = b.candidate.name.toLowerCase();
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;
  ```
- **The result**: Baseline sorting time immediately dropped from ~6,100 ms to **~265 ms**—a ~23x reduction in comparator execution time.

---

### 4. One Place Where AI Genuinely Made Me Faster & How I Verified It

**Synthetic Benchmark Harness & Dual-Algorithm Invariant Testing**

- **Where it helped**: Writing a deterministic pseudo-random generator (Mulberry32 with seed `20261019`) to generate 100,000 realistic candidate objects with varying skill counts (4–12 skills from a 60-skill pool) would have taken an hour of tedious boilerplate. The AI drafted the generator and the warm-up measurement harness in minutes.
- **How I knew it was correct**:
  1. I wrote an automated parity test comparing `rankCandidatesBaseline` against `rankCandidatesOptimized`.
  2. **The Set-order bug caught during testing**: The initial parity test failed on `assert.deepStrictEqual`! The AI's baseline collected `matchedSkills` by filtering the candidate's raw array, while the bucket sort collected matches during a deduplication pass. Candidates who listed duplicate skills or different casing (e.g. `['React', 'react']`) had different array lengths or different skill orderings between the two algorithms.
  3. **The fix**: I forced both implementations to canonicalize matched skills with `matchedSkills.sort()`. Once both algorithms produced identical rank orders, scores, and sorted skill arrays across all test cases, I knew the optimized implementation was safe to keep.
