/**
 * Candidate Ranking Algorithms (Task 2a)
 *
 * Provides robust, deterministic, and highly efficient candidate skill-overlap ranking
 * capable of scaling effortlessly to 100,000+ candidates.
 */

export interface CandidateLike {
  id?: string;
  name: string;
  skills?: readonly string[] | string[] | null;
  years_experience?: number;
  [key: string]: unknown;
}

export interface RankedCandidate<T extends CandidateLike = CandidateLike> {
  candidate: T;
  score: number;
  matchedSkills: string[];
  matchRatio: number;
}

export interface RankingOptions<T extends CandidateLike = CandidateLike> {
  /**
   * Minimum score required to be included in the results.
   * Default: 0 (all candidates included).
   */
  minScore?: number;

  /**
   * Maximum number of ranked results to return.
   * Default: undefined (returns all matching candidates).
   */
  limit?: number;

  /**
   * Custom tie-breaker when scores are identical.
   * Default: sorts by years_experience desc -> name asc -> id asc.
   */
  tieBreaker?: (a: RankedCandidate<T>, b: RankedCandidate<T>) => number;
}

/**
 * Normalizes a skill string: trims whitespace and converts to lower-case.
 */
export function normalizeSkill(skill: string): string {
  return skill ? skill.trim().toLowerCase() : '';
}

/**
 * Prepares a deduplicated Set of normalized skills.
 */
export function normalizeSkillSet(skills?: readonly string[] | string[] | null): Set<string> {
  const set = new Set<string>();
  if (!skills || !Array.isArray(skills)) {
    return set;
  }
  for (let i = 0; i < skills.length; i++) {
    const s = skills[i];
    if (typeof s === 'string') {
      const norm = normalizeSkill(s);
      if (norm.length > 0) {
        set.add(norm);
      }
    }
  }
  return set;
}

/**
 * Default deterministic tie-breaking comparator:
 * 1. Score descending (highest score first)
 * 2. Years of experience descending (more senior first, treating undefined as 0)
 * 3. Candidate name ascending (alphabetical, case-insensitive)
 * 4. Candidate ID ascending (strict unique tie-breaker if available)
 */
export function defaultTieBreaker<T extends CandidateLike>(
  a: RankedCandidate<T>,
  b: RankedCandidate<T>
): number {
  // 1. Primary: score descending
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  // 2. Secondary: years of experience descending
  const expA = a.candidate.years_experience ?? 0;
  const expB = b.candidate.years_experience ?? 0;
  if (expB !== expA) {
    return expB - expA;
  }

  // 3. Tertiary: candidate name alphabetical ascending (fast case-insensitive comparison)
  const nameA = a.candidate.name.toLowerCase();
  const nameB = b.candidate.name.toLowerCase();
  if (nameA < nameB) return -1;
  if (nameA > nameB) return 1;

  // 4. Quaternary: candidate ID ascending
  const idA = a.candidate.id ?? '';
  const idB = b.candidate.id ?? '';
  if (idA < idB) return -1;
  if (idA > idB) return 1;
  return 0;
}

/**
 * Helper to construct a unified comparator ensuring score ordering is strictly maintained
 * even when a caller provides a custom tie-breaker for identical scores.
 */
function resolveComparator<T extends CandidateLike>(
  customTieBreaker?: (a: RankedCandidate<T>, b: RankedCandidate<T>) => number
): (a: RankedCandidate<T>, b: RankedCandidate<T>) => number {
  if (!customTieBreaker) {
    return defaultTieBreaker;
  }
  return (a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    const cmp = customTieBreaker(a, b);
    if (cmp !== 0) {
      return cmp;
    }
    return defaultTieBreaker(a, b);
  };
}

/**
 * Baseline Candidate Ranking Implementation
 *
 * Complexity:
 * - Time: O(N * S_c + N log N), where N is candidate count, S_c is average candidate skills.
 * - Space: O(N) auxiliary memory for ranked results.
 */
export function rankCandidatesBaseline<T extends CandidateLike>(
  candidates: readonly T[],
  requiredSkills: readonly string[],
  options: RankingOptions<T> = {}
): RankedCandidate<T>[] {
  const minScore = options.minScore ?? 0;
  const requiredSet = normalizeSkillSet(requiredSkills);
  const totalRequired = requiredSet.size;

  const results: RankedCandidate<T>[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const candSkillSet = normalizeSkillSet(candidate.skills);
    const matchedSkills: string[] = [];

    // Find distinct matches
    for (const req of requiredSet) {
      if (candSkillSet.has(req)) {
        matchedSkills.push(req);
      }
    }

    matchedSkills.sort(); // Canonical ordering

    const score = matchedSkills.length;
    if (score >= minScore) {
      results.push({
        candidate,
        score,
        matchedSkills,
        matchRatio: totalRequired > 0 ? score / totalRequired : 0,
      });
    }
  }

  const comparator = resolveComparator(options.tieBreaker);
  results.sort(comparator);

  if (options.limit !== undefined && options.limit > 0) {
    return results.slice(0, options.limit);
  }

  return results;
}

/**
 * Optimized Candidate Ranking Implementation for 100,000+ candidates
 *
 * Optimization Strategy:
 * 1. Normalized Required Skills Set: O(R) setup.
 * 2. Distinct Candidate Match Scoring: O(S_c) per candidate.
 * 3. Bucket Sort Partitioning:
 *    Because the maximum possible score is bounded by the number of distinct required skills (R),
 *    which in recruitment searches is small (typically R <= 30), we partition candidates into R + 1
 *    buckets (from score R down to 0).
 * 4. Localized Sorting / Early Exit:
 *    Only non-empty buckets are sorted with the tie-breaker. When a top-K limit is specified,
 *    we stop processing lower buckets once K elements have been gathered, eliminating unnecessary sorting!
 *
 * Complexity & Trade-Offs:
 * - Time:
 *   - Setup & Partitioning: O(N * S_c) where S_c is the number of skills per candidate and R is the required skill count.
 *   - Bucket Sorting: Because each visited bucket is sorted in full with the tie-breaker comparator,
 *     sorting takes O(sum_{s in visited} B_s log B_s) where B_s is the size of bucket s.
 *     In the worst case (e.g. if all candidates cluster into the highest bucket, B_top ~ N),
 *     this remains O(N log N) rather than O(N * S_c + K log K).
 *   - Practical Benefit: In typical recruitment datasets, high-match buckets are sparse. Top-K early exit
 *     gathers K candidates and completely skips sorting and inspecting all lower-scoring buckets,
 *     bypassing the vast majority of zero- and low-match applicants.
 * - Space: O(N) to hold candidate references in score buckets without duplicating underlying data.
 */
export function rankCandidatesOptimized<T extends CandidateLike>(
  candidates: readonly T[],
  requiredSkills: readonly string[],
  options: RankingOptions<T> = {}
): RankedCandidate<T>[] {
  const minScore = Math.max(0, options.minScore ?? 0);
  const requiredSet = normalizeSkillSet(requiredSkills);
  const totalRequired = requiredSet.size;

  // Edge case: if no required skills are specified
  if (totalRequired === 0) {
    if (minScore > 0) {
      return [];
    }
    const zeroResults: RankedCandidate<T>[] = new Array(candidates.length);
    for (let i = 0; i < candidates.length; i++) {
      zeroResults[i] = {
        candidate: candidates[i],
        score: 0,
        matchedSkills: [],
        matchRatio: 0,
      };
    }
    const comparator = resolveComparator(options.tieBreaker);
    zeroResults.sort(comparator);
    return options.limit !== undefined && options.limit > 0
      ? zeroResults.slice(0, options.limit)
      : zeroResults;
  }

  // Create R + 1 buckets for scores 0..totalRequired
  const buckets: RankedCandidate<T>[][] = Array.from({ length: totalRequired + 1 }, () => []);

  // Single-pass scoring over all candidates
  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    const skills = candidate.skills;

    let score = 0;
    const matchedSkills: string[] = [];

    if (skills && Array.isArray(skills) && skills.length > 0) {
      // Use a fast local visited set to prevent duplicate skills on candidate from inflating score
      const seen = new Set<string>();
      for (let j = 0; j < skills.length; j++) {
        const rawSkill = skills[j];
        if (typeof rawSkill === 'string') {
          const norm = normalizeSkill(rawSkill);
          if (norm.length > 0 && !seen.has(norm)) {
            seen.add(norm);
            if (requiredSet.has(norm)) {
              score++;
              matchedSkills.push(norm);
            }
          }
        }
      }
    }

    matchedSkills.sort(); // Canonical ordering

    if (score >= minScore) {
      buckets[score].push({
        candidate,
        score,
        matchedSkills,
        matchRatio: score / totalRequired,
      });
    }
  }

  const comparator = resolveComparator(options.tieBreaker);
  const results: RankedCandidate<T>[] = [];
  const limit = options.limit;

  // Gather from highest score down to minScore
  for (let s = totalRequired; s >= minScore; s--) {
    const bucket = buckets[s];
    if (bucket.length === 0) {
      continue;
    }

    // Sort within bucket using tie-breaker
    bucket.sort(comparator);

    if (limit !== undefined && limit > 0) {
      const remaining = limit - results.length;
      if (bucket.length <= remaining) {
        for (let j = 0; j < bucket.length; j++) {
          results.push(bucket[j]);
        }
      } else {
        for (let j = 0; j < remaining; j++) {
          results.push(bucket[j]);
        }
        break;
      }
    } else {
      for (let j = 0; j < bucket.length; j++) {
        results.push(bucket[j]);
      }
    }
  }

  return results;
}
