# Engineering Judgment Note: Scaling to 3,000 Candidates/Week

**Context:** Rollout to high-volume recruitment client | **Resources:** 2 engineers, 2 weeks  
**Current Baseline (Shipped):** Express + SQLite (WAL mode, indexed 3NF schema, 60 backend tests), React dashboard (10 frontend tests), Bucket Sort ranking engine (>740,000 cand/sec), and on-demand Gemini-based fit summaries with structured JSON output.

---

### 1. What We Build First (Weeks 1–2 Priority)

1. **Two-Tier Screening (Deterministic Ranking $\rightarrow$ Selective LLM)**:
   - Calling Gemini on all 3,000 weekly applicants would incur high latency and unnecessary API spend.
   - *Plan*: Run our $O(N \cdot S_c + K \log K)$ Bucket Sort to pre-filter applicants to the top 10% (300 candidates). Invoke Gemini candidate-fit summaries exclusively on this shortlisted pool.
2. **Asynchronous Ingestion & Idempotent Deduplication**:
   - Ingesting ~430 candidates/day creates write bursts. Introduce an asynchronous worker queue (BullMQ + Redis or dedicated SQLite WAL batch worker).
   - Enforce deduplication on `(normalized_email, phone)` and composite matching on `(normalized_name, applied_date)` to eliminate redundant records.
3. **LLM Response Caching & Rate-Limit Backoff**:
   - Cache fit evaluations by `SHA256(candidate_id + job_description_hash)` in Redis to avoid re-evaluating unchanged candidate-job pairs.
   - Add jittered exponential backoff and circuit breaking to absorb upstream Gemini 429 quota spikes.
4. **Recruiter Bulk Actions & Audit Logging**:
   - Add multi-candidate triage mutations (`shortlist_selected`, `reject_selected`) and an append-only `audit_log` table recording user ID, candidate ID, previous status, new status, and timestamp.

---

### 2. What We Explicitly Refuse to Build Yet

- **Autonomous Rejection / Auto-Hiring**: AI output must remain advisory decision support to mitigate compliance risks under evolving employment and algorithmic hiring standards (e.g. EEOC, Title VII, NYC Local Law 144).
- **Multimodal Raw Resume OCR (PDF/DOCX)**: Require structured ATS webhooks (Greenhouse/Lever) or JSON payloads; custom document parsing introduces high edge-case maintenance without matching triage value.
- **Complex Vector Search Infrastructure**: Managing Pinecone or pgvector clusters for 3,000 candidates/week is premature; our indexed SQL filters and deterministic skill overlap solve recruiter queries sub-millisecond.
- **Custom Model Fine-Tuning**: Zero-shot structured prompting on `gemini-3.8-flash` delivers high factual accuracy without dataset curation overhead.

---

### 3. The #1 Critical Risk Flagged to Management

> **Risk: Recruiter Over-Reliance & Disparate Impact Exposure.**  
> If hiring teams treat AI fit summaries as definitive screening verdicts rather than advisory notes, GCCX faces regulatory liability and risks filtering out non-traditional candidates whose resumes lack exact keyword matches.  
> **Mitigation**: Enforce mandatory human recruiter review before any status change, display verified `supported_skills` alongside unverified gaps, and exclude protected demographic attributes from ingestion.

---

### 4. Target SLOs & Rollout
- **SLOs**: Ingestion batch throughput $< 30$s for 500 records; Search P95 $< 100$ms; LLM fit P95 $< 2.5$s on-demand with $> 70\%$ cache hit rate.
- **Rollout**: Week 1: Ingestion worker + cached ranking. Week 2: Bulk UI actions + audit logging + shadow testing on 500 historical records prior to client go-live.
