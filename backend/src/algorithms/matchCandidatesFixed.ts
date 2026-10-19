/**
 * Task 2b: Corrected matchCandidates Implementation & Code Review
 * 
 * Original Buggy Function Analysis:
 * 1. Undeclared loop variable `i`: Pollutes the global namespace or throws ReferenceError in strict mode.
 * 2. Off-by-one condition `i <= candidates.length`: Attempts to access index out of bounds, causing
 *    `TypeError: Cannot read properties of undefined (reading 'skills')` on the final iteration.
 * 3. `score` is an array of strings, not a number: `c.skills.filter(...)` returns `string[]`.
 *    The push `{ name: c.name, score: score }` stores an array instead of a numeric count.
 * 4. Invalid sort comparator: `a.score - b.score` performs JavaScript array subtraction (`[...array] - [...array]`),
 *    which evaluates to `NaN` and produces broken/unstable ordering. Furthermore, even if numeric,
 *    `a.score - b.score` sorts ascending (worst matches first), whereas recruitment ranking requires descending.
 * 5. Case-sensitive and whitespace-sensitive: `requiredSkills.includes(s)` fails on case differences (e.g., 'python' vs 'Python')
 *    or leading/trailing whitespace.
 * 6. Duplicate inflation: If a candidate has duplicate skill tags, both are counted, unfairly inflating their score.
 * 7. Missing null/undefined guards: Will crash if `c.skills` or `candidates` or `requiredSkills` is null or undefined.
 * 8. Lack of deterministic tie-breaking: Candidates with identical scores had non-deterministic ordering.
 */

export interface InputCandidate {
  name: string;
  skills?: readonly string[] | string[] | null;
  [key: string]: unknown;
}

export interface MatchedCandidateResult {
  name: string;
  score: number;
  matchedSkills: string[];
}

/**
 * Concise reflection on the original bugs, their behavioral impact,
 * and the reliability of the corrected implementation.
 */
export const AI_CODE_REVIEW_REFLECTION = 
  "The original function suffered from critical runtime errors: an undeclared loop variable 'i' polluted the global scope, " +
  "while the off-by-one condition 'i <= candidates.length' caused a fatal TypeError crash on the final iteration. " +
  "Functionally, assigning the filtered skill array to 'score' caused array subtraction in the comparator to evaluate to NaN, " +
  "corrupting the sort order while ignoring case normalization and duplicate skill inflation. " +
  "The corrected implementation enforces strict TypeScript typing, normalizes skills case-insensitively, computes a distinct " +
  "numeric match count, and guarantees deterministic descending ranking with alphabetical tie-breaking.";

/**
 * Corrected drop-in replacement for matchCandidates.
 * 
 * Guarantees:
 * - Proper loop scoping with no global pollution.
 * - Exact bounds checking (0 to length - 1).
 * - Normalized, deduplicated skill matching.
 * - Numeric score with preserved matched skills list.
 * - Deterministic descending sort with secondary tie-breaking by candidate name.
 * - Safe handling of empty/undefined skills and candidates.
 */
export function matchCandidatesFixed(
  candidates?: readonly InputCandidate[] | null,
  requiredSkills?: readonly string[] | null
): MatchedCandidateResult[] {
  if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
    return [];
  }

  // Normalize required skills into a deduplicated Set for O(1) lookups
  const requiredSet = new Set<string>();
  if (requiredSkills && Array.isArray(requiredSkills)) {
    for (let i = 0; i < requiredSkills.length; i++) {
      const s = requiredSkills[i];
      if (typeof s === 'string') {
        const trimmed = s.trim().toLowerCase();
        if (trimmed.length > 0) {
          requiredSet.add(trimmed);
        }
      }
    }
  }

  const matches: MatchedCandidateResult[] = [];

  // Correct loop bounds: i < candidates.length, properly scoped with let
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if (!c || typeof c.name !== 'string') {
      continue;
    }

    const candidateSkills = c.skills;
    const matchedSkillsSet = new Set<string>();

    if (candidateSkills && Array.isArray(candidateSkills)) {
      for (let j = 0; j < candidateSkills.length; j++) {
        const skill = candidateSkills[j];
        if (typeof skill === 'string') {
          const normalized = skill.trim().toLowerCase();
          if (requiredSet.has(normalized)) {
            matchedSkillsSet.add(normalized);
          }
        }
      }
    }

    const score = matchedSkillsSet.size;

    // Only include candidates with at least one matching skill
    if (score > 0) {
      matches.push({
        name: c.name,
        score, // Strictly numeric score
        matchedSkills: Array.from(matchedSkillsSet).sort(),
      });
    }
  }

  // Proper descending numeric sort with deterministic tie-breaking by candidate name
  return matches.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score; // Descending: highest score first
    }
    const nameA = a.name.toLowerCase();
    const nameB = b.name.toLowerCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
  });
}
