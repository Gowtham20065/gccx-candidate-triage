#!/usr/bin/env python3
"""
Generates the executive-grade PowerPoint presentation (.pptx) for the
GCCX Global AI Full-Stack Engineer Intern Round 1 Case Study.
Formatted with strict 16:9 widescreen layout, dark theme, Segoe UI typography,
embedded live screenshots, and synchronized speaker notes.
"""

import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.shapes import MSO_SHAPE
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

# Theme Palette (Modern High-Contrast Dark Slate)
COLOR_BG = RGBColor(11, 15, 25)           # #0B0F19 Deep Canvas
COLOR_CARD = RGBColor(22, 31, 48)         # #161F30 Container Surface
COLOR_CARD_BORDER = RGBColor(42, 59, 83)  # #2A3B53 Subtle Stroke
COLOR_FRAME_BG = RGBColor(15, 23, 42)     # #0F172A Frame Dark
COLOR_TEXT_WHITE = RGBColor(248, 250, 252)# #F8FAFC Heading / Primary
COLOR_TEXT_MUTED = RGBColor(148, 163, 184)# #94A3B8 Secondary Body
COLOR_CYAN = RGBColor(56, 189, 248)       # #38BDF8 Primary Brand
COLOR_PURPLE = RGBColor(129, 140, 248)    # #818CF8 AI / Models
COLOR_GREEN = RGBColor(52, 211, 153)      # #34D399 Success / Shortlist
COLOR_AMBER = RGBColor(251, 191, 36)      # #FBBF24 Performance / Warning
COLOR_RED = RGBColor(248, 113, 113)       # #F87171 Flaws / Rejected

FONT_FAMILY = "Segoe UI"

def set_slide_background(slide):
    bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, Inches(13.333), Inches(7.5))
    bg.fill.solid()
    bg.fill.fore_color.rgb = COLOR_BG
    bg.line.fill.background()
    return bg

def add_header(slide, tag_text, title_text, subtitle_text, slide_num):
    # Category Tag Pill
    tag = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.42), Inches(3.2), Inches(0.32))
    tag.fill.solid()
    tag.fill.fore_color.rgb = RGBColor(30, 41, 59)
    tag.line.color.rgb = COLOR_CARD_BORDER
    tag.line.width = Pt(1)
    tf_tag = tag.text_frame
    tf_tag.word_wrap = False
    tf_tag.margin_left = tf_tag.margin_top = tf_tag.margin_right = tf_tag.margin_bottom = 0
    p = tf_tag.paragraphs[0]
    p.text = tag_text.upper()
    p.font.name = FONT_FAMILY
    p.font.size = Pt(9.5)
    p.font.bold = True
    p.font.color.rgb = COLOR_CYAN
    p.alignment = PP_ALIGN.CENTER

    # Slide Counter (Right aligned)
    num_box = slide.shapes.add_textbox(Inches(10.5), Inches(0.42), Inches(2.033), Inches(0.32))
    tf_num = num_box.text_frame
    tf_num.margin_top = tf_num.margin_bottom = tf_num.margin_left = tf_num.margin_right = 0
    p_num = tf_num.paragraphs[0]
    p_num.text = f"SLIDE {slide_num:02d} / 08"
    p_num.font.name = FONT_FAMILY
    p_num.font.size = Pt(10)
    p_num.font.bold = True
    p_num.font.color.rgb = COLOR_TEXT_MUTED
    p_num.alignment = PP_ALIGN.RIGHT

    # Slide Title
    title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.80), Inches(11.733), Inches(0.50))
    tf_title = title_box.text_frame
    tf_title.word_wrap = True
    tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
    p_t = tf_title.paragraphs[0]
    p_t.text = title_text
    p_t.font.name = FONT_FAMILY
    p_t.font.size = Pt(21)
    p_t.font.bold = True
    p_t.font.color.rgb = COLOR_TEXT_WHITE

    # Subtitle
    if subtitle_text:
        sub_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.32), Inches(11.733), Inches(0.35))
        tf_sub = sub_box.text_frame
        tf_sub.word_wrap = True
        tf_sub.margin_left = tf_sub.margin_top = tf_sub.margin_right = tf_sub.margin_bottom = 0
        p_s = tf_sub.paragraphs[0]
        p_s.text = subtitle_text
        p_s.font.name = FONT_FAMILY
        p_s.font.size = Pt(11.5)
        p_s.font.color.rgb = COLOR_TEXT_MUTED

def add_card(slide, left, top, width, height, title="", title_color=COLOR_CYAN):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
    card.fill.solid()
    card.fill.fore_color.rgb = COLOR_CARD
    card.line.color.rgb = COLOR_CARD_BORDER
    card.line.width = Pt(1)
    
    tf = card.text_frame
    tf.word_wrap = True
    tf.margin_left = Inches(0.24)
    tf.margin_right = Inches(0.24)
    tf.margin_top = Inches(0.20)
    tf.margin_bottom = Inches(0.20)
    
    if title:
        p = tf.paragraphs[0]
        p.text = title
        p.font.name = FONT_FAMILY
        p.font.size = Pt(13.5)
        p.font.bold = True
        p.font.color.rgb = title_color
        p.space_after = Pt(8)
        
    return card, tf

def add_bullet(tf, bold_prefix, text, font_size=Pt(10.5), level=0, space_after=Pt(5.5)):
    p = tf.add_paragraph()
    p.level = level
    p.space_after = space_after
    
    if bold_prefix:
        r1 = p.add_run()
        r1.text = bold_prefix + ": "
        r1.font.name = FONT_FAMILY
        r1.font.bold = True
        r1.font.size = font_size
        r1.font.color.rgb = COLOR_TEXT_WHITE
        
    r2 = p.add_run()
    r2.text = text
    r2.font.name = FONT_FAMILY
    r2.font.size = font_size
    r2.font.color.rgb = COLOR_TEXT_MUTED

def add_image_with_frame(slide, img_path, left, top, width, height, caption=""):
    # Caption pill
    if caption:
        cap_box = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, Inches(0.28))
        cap_box.fill.solid()
        cap_box.fill.fore_color.rgb = RGBColor(30, 41, 59)
        cap_box.line.color.rgb = COLOR_CARD_BORDER
        cap_box.line.width = Pt(1)
        tf_c = cap_box.text_frame
        tf_c.margin_left = tf_c.margin_right = tf_c.margin_top = tf_c.margin_bottom = 0
        p = tf_c.paragraphs[0]
        p.text = caption
        p.font.name = FONT_FAMILY
        p.font.size = Pt(9)
        p.font.bold = True
        p.font.color.rgb = COLOR_CYAN
        p.alignment = PP_ALIGN.CENTER
        top_offset = Inches(0.32)
    else:
        top_offset = Inches(0)

    # Frame background
    frame = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top + top_offset, width, height)
    frame.fill.solid()
    frame.fill.fore_color.rgb = COLOR_FRAME_BG
    frame.line.color.rgb = COLOR_CARD_BORDER
    frame.line.width = Pt(1)

    # Image
    if os.path.exists(img_path):
        slide.shapes.add_picture(img_path, left, top + top_offset, width=width, height=height)

def set_speaker_notes(slide, notes_text):
    notes_slide = slide.notes_slide
    text_frame = notes_slide.notes_text_frame
    text_frame.text = notes_text

def build_presentation(output_path="docs/gccx-candidate-triage-presentation.pptx"):
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # =========================================================================
    # SLIDE 1: Executive Title Slide
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    set_slide_background(s1)

    # Tag Pill
    tag = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.1), Inches(4.8), Inches(0.38))
    tag.fill.solid()
    tag.fill.fore_color.rgb = RGBColor(30, 41, 59)
    tag.line.color.rgb = COLOR_CARD_BORDER
    tf_tag = tag.text_frame
    p_tag = tf_tag.paragraphs[0]
    p_tag.text = "GCCX GLOBAL AI FULL-STACK ENGINEER INTERN — ROUND 1"
    p_tag.font.name = FONT_FAMILY
    p_tag.font.size = Pt(10)
    p_tag.font.bold = True
    p_tag.font.color.rgb = COLOR_CYAN
    p_tag.alignment = PP_ALIGN.CENTER

    # Main Title
    t_box = s1.shapes.add_textbox(Inches(0.8), Inches(1.68), Inches(11.7), Inches(1.1))
    tf_t = t_box.text_frame
    p_t = tf_t.paragraphs[0]
    p_t.text = "Candidate Triage Operations Platform"
    p_t.font.name = FONT_FAMILY
    p_t.font.size = Pt(36)
    p_t.font.bold = True
    p_t.font.color.rgb = COLOR_TEXT_WHITE

    # Subtitle
    s_box = s1.shapes.add_textbox(Inches(0.8), Inches(2.82), Inches(11.7), Inches(0.55))
    tf_s = s_box.text_frame
    p_s = tf_s.paragraphs[0]
    p_s.text = "Fast Algorithmic Screening, 3NF SQLite Persistence & Grounded Gemini Decision Support"
    p_s.font.name = FONT_FAMILY
    p_s.font.size = Pt(15)
    p_s.font.color.rgb = COLOR_TEXT_MUTED

    # 4 Feature Metric Cards
    cards_data = [
        ("Fast Candidate Ranking", "100k synthetic dataset; 102 ms Top-100 early exit (~2x speedup / 2.59x median)", COLOR_CYAN),
        ("3NF Normalized Storage", "SQLite WAL mode, foreign keys, cascade delete, idempotent re-seeding", COLOR_PURPLE),
        ("Live Grounded Gemini AI", "gemini-3.8-flash structured fit report, XML fence tags, interview flags", COLOR_GREEN),
        ("Production Test Suite", "75 passing automated tests (65 backend in ~25s, 10 frontend in ~2.8s)", COLOR_AMBER),
    ]

    card_w = Inches(2.75)
    card_gap = Inches(0.24)
    start_x = Inches(0.8)

    for i, (head, desc, color) in enumerate(cards_data):
        x = start_x + i * (card_w + card_gap)
        _, tf_c = add_card(s1, x, Inches(3.85), card_w, Inches(2.4), head, color)
        p_desc = tf_c.add_paragraph()
        p_desc.text = desc
        p_desc.font.name = FONT_FAMILY
        p_desc.font.size = Pt(11)
        p_desc.font.color.rgb = COLOR_TEXT_MUTED

    # Meta footer
    meta_box = s1.shapes.add_textbox(Inches(0.8), Inches(6.55), Inches(11.7), Inches(0.35))
    tf_m = meta_box.text_frame
    p_m = tf_m.paragraphs[0]
    p_m.text = "Format: 8-Slide Executive Deck (10-Minute Technical Discussion) | TypeScript Monorepo (Node.js 22 + React 18 + SQLite 3)"
    p_m.font.name = FONT_FAMILY
    p_m.font.size = Pt(10)
    p_m.font.color.rgb = COLOR_TEXT_MUTED

    set_speaker_notes(s1,
        "Welcome everyone. Recruiters today triage hundreds of applicants using spreadsheets and gut feel. "
        "Our goal was to build a functional candidate triage prototype combining fast in-memory ranking with "
        "evidence-grounded AI decision support.\n"
        "We made two foundational architectural decisions upfront: first, recruiter triage decisions must persist "
        "non-destructively across server restarts; second, the single AI feature should directly solve the recruiter's "
        "hardest problem—evaluating applicant qualifications against a specific job description with verifiable evidence "
        "and explicit gap analysis."
    )

    # =========================================================================
    # SLIDE 2: Problem, Scope & Core Assumptions
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    set_slide_background(s2)
    add_header(s2, "Context & Requirements", "The Problem, Scope & Core Architectural Assumptions",
               "Transitioning recruiters from static spreadsheets to a reliable, persistent triage operations platform", 2)

    _, tf_p = add_card(s2, Inches(0.8), Inches(1.80), Inches(5.7), Inches(5.2), "The Core Problem & Mandate", COLOR_CYAN)
    add_bullet(tf_p, "The Problem", "Recruiters triage hundreds of candidates across static spreadsheets with subjective gut-feel, slow screening cycles, and no persistent decision tracking.")
    add_bullet(tf_p, "Full-Stack Dashboard", "Provide interactive multi-criteria filtering, debounced search, and immediate triage status mutations (Untriaged -> Shortlisted / Rejected).")
    add_bullet(tf_p, "Normalized Persistence", "Implement a relational SQLite backend that persists recruiter actions non-destructively across server restarts.")
    add_bullet(tf_p, "Targeted AI Feature", "Integrate exactly ONE high-value LLM capability rather than scattered gimmicks.")
    add_bullet(tf_p, "Scalable Ranking", "Implement and evaluate deterministic candidate ranking across a 100,000 synthetic candidate benchmark.")

    _, tf_a = add_card(s2, Inches(6.8), Inches(1.80), Inches(5.7), Inches(5.2), "Key Architectural Assumptions", COLOR_PURPLE)
    add_bullet(tf_a, "Non-Destructive Seeding", "Re-seeding SQLite from JSON must update biographical data on conflict but deliberately omit the status column, preserving recruiter decisions across restarts.")
    add_bullet(tf_a, "3NF Relational Modeling", "Normalize candidate skills into a dictionary and many-to-many junction table to guarantee relational integrity, eliminate duplicate tags, and support fast indexed queries.")
    add_bullet(tf_a, "High-Leverage AI Value", "Evidence-grounded candidate-fit evaluation against recruiter job descriptions delivers 10x higher triage value than generic semantic search over 48 mock candidates.")
    add_bullet(tf_a, "Zero External Test Calls", "Automated test suites must run 100% deterministically with mocked provider responses to avoid token costs and internet dependencies.")

    set_speaker_notes(s2,
        "Recruiters today triage hundreds of applicants using spreadsheets and gut feel. Our goal was to deliver a "
        "functional candidate triage prototype: responsive UI, normalized SQLite persistence, fast algorithmic ranking, "
        "and exactly one high-value live LLM feature.\n"
        "We established three core assumptions: first, database re-seeding must never overwrite recruiter status decisions; "
        "second, SQLite must be modeled in 3NF with indexed foreign keys rather than storing flat JSON; and third, "
        "the AI feature should focus squarely on qualification gap analysis against specific job descriptions rather than generic search."
    )

    # =========================================================================
    # SLIDE 3: Full-Stack Architecture & Normalized Data Layer
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    set_slide_background(s3)
    add_header(s3, "System Architecture", "Full-Stack Architecture & Normalized Data Layer",
               "Layered TypeScript monorepo with 3NF relational schema and strict validation", 3)

    _, tf_arch = add_card(s3, Inches(0.8), Inches(1.80), Inches(5.7), Inches(3.25), "Layered TypeScript Monorepo", COLOR_CYAN)
    add_bullet(tf_arch, "Frontend Workspace", "React 18 + Vite with accessibility-conscious styling, debounced filtering, KPI metrics, and slide-out candidate details drawer.")
    add_bullet(tf_arch, "Backend Workspace", "Express 4 + Node.js 22 with dependency-injected database and Gemini AI service layers.")
    add_bullet(tf_arch, "Defensive Validation", "Cross-parameter range checks (min_experience <= max_experience), pagination bounds, and consistent error envelopes ({ error: { code, message } }).")

    _, tf_db = add_card(s3, Inches(6.8), Inches(1.80), Inches(5.7), Inches(3.25), "3NF Relational Database Schema", COLOR_PURPLE)
    add_bullet(tf_db, "candidates Table", "Core biographical data, years experience, source, notes, applied date, and persistent triage status.")
    add_bullet(tf_db, "skills Table", "Global dictionary of unique technical skills with NOCASE unique constraints.")
    add_bullet(tf_db, "candidate_skills Table", "Many-to-many junction table with cascade deletion and foreign keys (cleaned on re-seed).")
    add_bullet(tf_db, "B-Tree Indexes", "Targeted indexes on status, target_role, source, years_experience, and applied_date.")

    _, tf_ep = add_card(s3, Inches(0.8), Inches(5.20), Inches(11.7), Inches(1.80), "High-Performance REST Endpoints (Single-Query Aggregations)", COLOR_GREEN)
    add_bullet(tf_ep, "GET /api/candidates", "Paginated search and filtering with SQL parameters and SQL-injection-safe queries.")
    add_bullet(tf_ep, "GET /api/stats", "Aggregate triage counts (Total, Untriaged, Shortlisted, Rejected) via a single GROUP BY query.")
    add_bullet(tf_ep, "GET /api/roles & /sources", "Distinct filter discovery endpoints eliminating full candidate sampling.")
    add_bullet(tf_ep, "PATCH /api/candidates/:id/status & POST /api/ai/candidate-fit", "Instant triage state updates and grounded Gemini fit evaluations.")

    set_speaker_notes(s3,
        "Let's examine the system architecture. Rather than treating SQLite as a flat JSON store, we modeled a normalized "
        "Third Normal Form schema with a dedicated skills dictionary and foreign-key junction table. This gives us clean "
        "relational integrity, eliminates duplicate skills, and provides fast indexed lookups.\n"
        "Our seed script is idempotent: it updates biographical records on conflict but deliberately omits the triage "
        "status column, preserving recruiter decisions across restarts. We also added dedicated single-query endpoints "
        "for triage stats, roles, and sources, eliminating client-side polling overhead."
    )

    # =========================================================================
    # SLIDE 4: Candidate Ranking at Scale (Task 2a)
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    set_slide_background(s4)
    add_header(s4, "High-Scale Algorithms", "Candidate Ranking at Scale: Bucket Sort vs. Inverted Index",
               "Evaluating 100,000 synthetic candidates with deterministic multi-tier tie-breaking", 4)

    _, tf_rk1 = add_card(s4, Inches(0.8), Inches(1.80), Inches(5.7), Inches(3.25), "Algorithm Design & Complexity", COLOR_CYAN)
    add_bullet(tf_rk1, "Problem Mandate", "Rank 100,000 candidates by distinct required skill overlap with deterministic tie-breaking.")
    add_bullet(tf_rk1, "Skill Intersection", "Distinct set matching: duplicate candidate or query skills never inflate match scores.")
    add_bullet(tf_rk1, "Bucket Partitioning", "Partitions candidates into R+1 score buckets in O(N * S_c) linear time.")
    add_bullet(tf_rk1, "Deterministic Tie-Breaker", "Score (desc) -> Experience (desc) -> Name (asc) -> ID (asc).")

    _, tf_rk2 = add_card(s4, Inches(6.8), Inches(1.80), Inches(5.7), Inches(3.25), "Honest Benchmark (100,000 Candidates, Node v22)", COLOR_GREEN)
    add_bullet(tf_rk2, "Baseline Full Array Sort", "265.00 ms median (272.73 ms mean) — O(N * S_c + N log N).")
    add_bullet(tf_rk2, "Bucket Sort Full Rank", "253.88 ms median (279.97 ms mean) — ~1x speedup (no significant gain because all non-empty buckets must still be sorted in full).")
    add_bullet(tf_rk2, "Bucket Sort Top-100 Early Exit", "102.18 ms median (134.23 ms mean) — ~2x speedup (2.03x mean, 2.59x median) because it skips lower score buckets.")

    _, tf_rk3 = add_card(s4, Inches(0.8), Inches(5.20), Inches(11.7), Inches(1.80), "Architectural Next Step: Inverted Skill Index", COLOR_AMBER)
    add_bullet(tf_rk3, "The Inverted Index Advantage", "For repeated queries over an existing corpus, an Inverted Index (Map<skill, candidateId[]>) is structurally superior: candidates with zero matching skills are never touched, dropping query time to O(sum |Postings(R_j)|).")
    add_bullet(tf_rk3, "Production Recommendation", "Use Bucket Sort for one-off dynamic batches; use an Inverted Index in memory for interactive recruiter search.")

    set_speaker_notes(s4,
        "In Task 2a, we tackled ranking candidates at scale. The naive baseline sorts all 100,000 candidates with an "
        "O(N log N) comparator. Our Bucket Sort partitions candidates by distinct skill matches in linear time.\n"
        "Here are the honest benchmark numbers: if you sort all 100,000 candidates, Bucket Sort gives about 1x—virtually "
        "no speedup over baseline sorting—because every non-empty bucket still has to be sorted with the tie-breaker. "
        "But for Top-K queries where a recruiter only needs the top 100 matches, early exit skips sorting lower buckets entirely, "
        "giving a real ~2x speedup (2.59x median).\n"
        "If we were building this for repeated production queries, we would implement an Inverted Index, which skips candidates "
        "with zero matches without even an O(N) scan."
    )

    # =========================================================================
    # SLIDE 5: AI Code Review & Reflection (Task 2b)
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    set_slide_background(s5)
    add_header(s5, "AI-Assisted Engineering", "Task 2b: AI Code Review & Senior Engineering Reflection",
               "Dissecting realistic AI code defects and establishing defensive engineering standards", 5)

    _, tf_bug = add_card(s5, Inches(0.8), Inches(1.80), Inches(5.7), Inches(5.2), "Defect Analysis in Flawed AI Code", COLOR_RED)
    add_bullet(tf_bug, "Fatal Boundary Crash", "i <= candidates.length off-by-one boundary caused a fatal TypeError crash on the last iteration.")
    add_bullet(tf_bug, "Global Scope Leak", "i = 0 undeclared loop counter leaked into the global namespace.")
    add_bullet(tf_bug, "Type Error on Score", "score = c.skills.filter(...) assigned an array of strings instead of a numeric count.")
    add_bullet(tf_bug, "Comparator NaN Invalidation", "matches.sort((a,b) => a.score - b.score) performed array subtraction, resulting in NaN and broken non-deterministic sorting.")
    add_bullet(tf_bug, "Missing Normalization", "Ignored skill casing, allowed duplicate candidate skills to inflate score, and had no deterministic tie-breaker.")

    _, tf_fix = add_card(s5, Inches(6.8), Inches(1.80), Inches(5.7), Inches(5.2), "Corrected Module & Key Takeaway", COLOR_PURPLE)
    add_bullet(tf_fix, "matchCandidatesFixed.ts", "Implemented strict TypeScript types, case-normalization, distinct set intersection, and deterministic 4-tier descending sort.")
    add_bullet(tf_fix, "Dual-Algorithm Parity Tests", "Wrote automated tests validating invariant parity and deterministic output between baseline and optimized modules.")
    add_bullet(tf_fix, "Senior Engineering Reflection",
               "\"A developer who glanced at the AI output without reading line-by-line would see syntax that looked reasonable, "
               "but ship code that immediately crashed in production with an off-by-one exception, failed to compute numeric scores, "
               "and produced non-deterministic sorting due to NaN array arithmetic.\"")
    add_bullet(tf_fix, "AI-Native Takeaway", "AI accelerates boilerplate in minutes, but human verification, strict typing, and automated testing are non-negotiable.")

    set_speaker_notes(s5,
        "Task 2b was a realistic assessment of reviewing AI code. The snippet looked plausible at first glance, but contained "
        "two fatal bugs and several design smells: an undeclared loop variable, an off-by-one loop boundary that crashes with "
        "a TypeError on the last candidate, an array assigned to score, and array subtraction in the comparator that evaluates to NaN.\n"
        "Our takeaway is fundamental to AI-native engineering: AI is exceptional at accelerating boilerplate, but blind acceptance "
        "without rigorous line-by-line verification, typing, and automated testing introduces silent, catastrophic failures."
    )

    # =========================================================================
    # SLIDE 6: Live Recruiter Dashboard Walkthrough (Properly Formatted)
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    set_slide_background(s6)
    add_header(s6, "Interactive Demo", "Live Walkthrough: Recruiter Operations Dashboard",
               "High-contrast dark-mode interface with instant status KPI tracking and optimistic triage mutations", 6)

    # Left Column: Capabilities Card (5.2" wide, 5.2" high)
    _, tf_dash = add_card(s6, Inches(0.8), Inches(1.80), Inches(5.2), Inches(5.2), "Recruiter Operational Capabilities", COLOR_CYAN)
    add_bullet(tf_dash, "Real-Time KPI Cards", "Live aggregate counters (48 Total, Needs Review, Shortlisted, Archived) with single-click status filtering.")
    add_bullet(tf_dash, "Multi-Criteria Filter Bar", "Debounced search across candidate names, notes, roles, and skills; range sliders for experience.")
    add_bullet(tf_dash, "One-Click Triage Actions", "Instant Shortlist, Reject, or Reset buttons mutating SQLite via PATCH /api/candidates/:id/status.")
    add_bullet(tf_dash, "Optimistic Feedback", "Immediate UI status badge update with animated toast notification and counter synchronization.")
    add_bullet(tf_dash, "Accessibility Conscious", "Full keyboard navigation, semantic table roles, ARIA labels, and high-contrast styling.")

    # Right Column: Cleanly Sized & Positioned Screenshots
    img1_path = "docs/screenshots/01-dashboard-overview.png" # 1024x485 (ratio 2.111)
    img4_path = "docs/screenshots/04-triage-action-toast.png" # 1024x370 (ratio 2.767)

    w_right = Inches(6.1)
    # Image 1: h = 6.1 / 2.111 = 2.89 in
    h_img1 = Inches(2.70)
    add_image_with_frame(s6, img1_path, Inches(6.4), Inches(1.80), w_right, h_img1, "Main Recruiter Dashboard (KPI Cards & Multi-Filter Bar)")

    # Image 2: top starts at 1.80 + 0.32 + 2.70 + 0.30 = 5.12 in
    h_img2 = Inches(1.68)
    add_image_with_frame(s6, img4_path, Inches(6.4), Inches(4.88), w_right, h_img2, "Instant Status Mutation with Animated Toast Confirmation")

    set_speaker_notes(s6,
        "Here is the live recruiter operations dashboard in action. "
        "At the top, we see real-time status KPI cards displaying 48 total candidates. As recruiters apply filters "
        "or search for specific skills, the candidate table updates instantly with debounced queries.\n"
        "When a recruiter clicks 'Shortlist' or 'Reject', the state persists immediately to SQLite via PATCH /api/candidates/:id/status. "
        "As seen in the bottom screenshot, a green toast confirms 'Candidate Kavya Kaur successfully updated to shortlisted', "
        "and the Shortlisted KPI counter increments to 1 without requiring a full page refresh."
    )

    # =========================================================================
    # SLIDE 7: Live Grounded Gemini AI Evaluation (Properly Formatted)
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    set_slide_background(s7)
    add_header(s7, "Generative AI Integration", "Live AI Evaluation: Evidence-Grounded Gemini Candidate Fit",
               "Targeted gap analysis and interview probing flags powered by gemini-3.8-flash", 7)

    img2_path = "docs/screenshots/02-candidate-drawer.png"       # 707x907 (ratio 0.7795)
    img3_path = "docs/screenshots/03-gemini-fit-evaluation.png"  # 662x860 (ratio 0.7698)

    h_tall = Inches(4.75)
    w_tall_1 = Inches(3.55)
    w_tall_2 = Inches(3.55)

    add_image_with_frame(s7, img2_path, Inches(0.8), Inches(1.80), w_tall_1, h_tall, "Candidate Drawer & Qualitative Notes")
    add_image_with_frame(s7, img3_path, Inches(4.6), Inches(1.80), w_tall_2, h_tall, "Structured Gemini 3.8 Flash Fit Report")

    # Right Column: Architecture Highlights Card (4.0" wide, 5.2" high)
    _, tf_ai = add_card(s7, Inches(8.4), Inches(1.80), Inches(4.1), Inches(5.2), "Evidence-Grounded AI Architecture", COLOR_PURPLE)
    add_bullet(tf_ai, "Zero-Hallucination Retrieval", "Candidate facts, experience, and notes are fetched strictly from SQLite on the server; client cannot spoof profile data.")
    add_bullet(tf_ai, "Prompt Injection Defense", "XML fencing (<job_description>, <candidate_profile>) mitigates prompt injection attacks.")
    add_bullet(tf_ai, "Structured Output", "Enforces strict JSON schema: Fit Level (Weak), Supported Skills, Missing Requirements, Experience Assessment, and Interview Probing Flags.")
    add_bullet(tf_ai, "Recruiter Decision Support", "Surfaces concrete evidence gaps for human probing, rather than automated black-box rejections.")
    add_bullet(tf_ai, "Provider Resilience", "100% mocked automated tests covering 429 rate limits, 503 auth failures, 422 safety blocks, and 502 malformed outputs.")

    set_speaker_notes(s7,
        "Here is our single implemented AI feature in the live application. When the recruiter opens a candidate drawer, "
        "they select a job description preset—like Frontend Engineer—and trigger 'Evaluate Fit with Gemini'.\n"
        "The backend retrieves verified profile facts directly from SQLite, wraps user inputs in XML fence tags to mitigate "
        "prompt injection, and calls gemini-3.8-flash with a structured JSON schema.\n"
        "As shown on screen for Kavya Kaur, Gemini correctly classifies the fit as WEAK. Notice why: although she has 1 year "
        "at a startup, her documented skills are backend technologies like Java, Python, and Redis, lacking verified React or TypeScript. "
        "Rather than a black-box score, it provides specific interview probing questions for the recruiter."
    )

    # =========================================================================
    # SLIDE 8: Scaling Judgment & Sprint Roadmap (Tasks 4 & 5)
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    set_slide_background(s8)
    add_header(s8, "Scale & Future Vision", "Scaling to 3,000 Candidates/Week & Production Roadmap",
               "Practical engineering judgment under 2-engineer/2-week constraints and sprint roadmap", 8)

    _, tf_sc = add_card(s8, Inches(0.8), Inches(1.80), Inches(5.7), Inches(5.2), "Scaling to 3,000/Wk (2 Devs, 2 Weeks)", COLOR_CYAN)
    add_bullet(tf_sc, "The #1 Defensible Risk", "Skill tag vocabulary variance ('Postgres' vs 'RDBMS'). A naive top-10% keyword pre-filter creates severe false negatives, silently rejecting non-traditional candidates.")
    add_bullet(tf_sc, "Per-Requisition Intake", "Candidates apply across distinct roles; ingest asynchronously via BullMQ/Redis buffer (~430 candidates/day).")
    add_bullet(tf_sc, "Recruiter-Selected Triage", "Present ranked candidates per open role; allow recruiters to select candidate batches for LLM evaluation rather than an automated top-10% cutoff.")
    add_bullet(tf_sc, "Hashed Evaluation Caching", "Cache fit evaluations by SHA256(candidateId + jdHash) in Redis to eliminate redundant token consumption.")
    add_bullet(tf_sc, "Audit Logging & Compliance", "Maintain append-only triage audit trail ensuring compliance with NYC Local Law 144 / EEOC guidelines.")

    _, tf_rd = add_card(s8, Inches(6.8), Inches(1.80), Inches(5.7), Inches(5.2), "Next 2-Week Production Sprint", COLOR_PURPLE)
    add_bullet(tf_rd, "Inverted Skill Index", "Build an in-memory inverted index for sub-10ms candidate search across high-volume corpora.")
    add_bullet(tf_rd, "Local Vector Search", "Integrate sqlite-vss embeddings over qualitative recruiter notes to surface soft-skill matches.")
    add_bullet(tf_rd, "Two-Way ATS Sync", "Webhook integrations with Greenhouse and Lever for automated candidate imports and two-way status export.")
    add_bullet(tf_rd, "Persistent Evaluation Store", "Create an evaluations table in SQLite to persist LLM fit summaries and track recruiter agreement rates over time.")
    add_bullet(tf_rd, "Foundation Delivered", "75 automated tests (65 backend in ~25s, 10 frontend in ~2.8s), zero failures, production build verified.")

    set_speaker_notes(s8,
        "In Task 4, leadership asked how to scale this to 3,000 candidates a week with 2 engineers in 2 weeks. "
        "Our judgment starts by identifying the fatal flaw of a naive approach: if you use a raw keyword tag pre-filter "
        "to drop 90% of applicants, you will silently reject qualified candidates because resumes have varied terminology like "
        "'Postgres' versus 'RDBMS'.\n"
        "So instead of an automated global top-10% cutoff, we build an asynchronous ingestion queue per requisition, and let recruiters "
        "manually select batches of candidates to evaluate with Gemini. Combined with hashed caching in Redis and bulk audit logs, "
        "this gives recruiters speed without biased auto-rejections.\n"
        "To conclude, we delivered a complete TypeScript monorepo, 75 passing tests, honest benchmark data, an accessible React dashboard, "
        "and a grounded Gemini integration—achieved with disciplined scope and defensible code. Thank you!"
    )

    # Save presentation
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    prs.save(output_path)
    print(f"Successfully generated PowerPoint presentation at: {output_path}")

if __name__ == "__main__":
    build_presentation()
