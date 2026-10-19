# Engineering Judgment Note: Scaling to 3,000 Candidates/Week

**Context:** Rollout for 3,000 candidates/week (~430/day) across multiple client requisitions | 2 engineers, 2 weeks.

---

### #1 Critical Risk: Skill Tag Quality & Silent Exclusion

Resumes use inconsistent terminology ("Postgres" vs "RDBMS", "Node" vs "backend"). A naive pre-filter that uses keyword tag overlap to drop 90% of applicants creates severe false negatives, silently eliminating strong non-traditional candidates before anyone sees them. Furthermore, applicants apply across distinct roles; filtering must be scoped per requisition on daily intake, not as a single global pool.

---

### What We Build First (Weeks 1–2 Priority)

1. **Per-Requisition Ingestion Worker**: Buffer daily intake via an asynchronous queue (BullMQ/Redis) and deduplicate candidates by email/phone.
2. **Recruiter-Selected Triage**: Present ranked candidates per open role; allow recruiters to manually select applicant batches for Gemini fit evaluation instead of applying an arbitrary global top-10% cutoff.
3. **Evaluation Caching & Resilience**: Cache fit evaluations by `SHA256(candidate_id + jd_hash)` with rate-limit retries.
4. **Bulk Actions & Audit Log**: Multi-candidate triage mutations with an append-only audit log.

---

### What We Explicitly Defer

- **Autonomous Auto-Rejection**: High regulatory liability (EEOC, Title VII, NYC Local Law 144); AI must remain advisory decision support.
- **Custom Resume OCR & Heavy Vector DBs**: Premature before structured ATS webhooks (Greenhouse/Lever) are integrated.

---

### Target SLOs

Batch intake $< 30$s per 500 records; search P95 $< 100$ms; LLM fit P95 $< 2.5$s with $> 70\%$ cache hits.
