# Engineering Judgment Note: Scaling to 3,000 Candidates/Week

**Scenario:** Client rollout handling 3,000 candidates/week (~430/day) with 2 engineers over 2 weeks.
**Baseline:** SQLite prototype (indexed 3NF schema, WAL mode), React UI, bucket-sort ranking, on-demand Gemini fit summaries.

---

### Proposed Scaling Plan (Weeks 1–2 Priority)

1. **Two-Tier Screening (Proposed)**: Avoid calling Gemini on all 3,000 weekly applicants. Deterministically rank candidates with bucket sorting; early-exit skips sorting lower-scoring applicants. Invoke Gemini fit evaluations strictly on the top 10% (~300 candidates), cutting API spend by ~90%.
2. **Asynchronous Ingestion Worker (Proposed)**: Buffer traffic bursts and deduplicate incoming candidates idempotently via an asynchronous queue (BullMQ/Redis or batch worker).
3. **Response Caching & Resiliency (Proposed)**: Cache structured LLM evaluations by `SHA256(candidate_id + jd_hash)` with jittered backoff for rate limits.
4. **Recruiter Bulk Actions & Audit Trail (Proposed)**: Add bulk status updates and an append-only triage audit log.

### What We Explicitly Defer

- **Autonomous Decisions**: Automated rejections or hiring decisions are rejected to mitigate regulatory liability (EEOC, Title VII, NYC Local Law 144); AI remains advisory.
- **Heavy Infrastructure**: Defer vector databases and custom PDF OCR until ATS webhook integration is established.

### #1 Critical Risk Flagged to Management

**Recruiter Over-Reliance & Disparate Impact:** Recruiters may treat advisory summaries as definitive verdicts.
*Mitigation:* Mandatory recruiter sign-off, displaying verified versus unverified skill gaps, and excluding demographic data from prompts.

### Measurable Target SLOs

Batch ingestion $< 30$s per 500 records; search P95 $< 100$ms; LLM fit P95 $< 2.5$s with $> 70\%$ cache hit rate.
