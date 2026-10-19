import type Database from 'better-sqlite3';
import { config } from '../config';
import type {
  CandidateFilterParams,
  CandidateRecord,
  CandidateWithSkills,
  PaginatedResult,
  SkillCount,
  TriageStats,
  TriageStatus,
} from '../db/types';

interface CandidateRow extends CandidateRecord {
  skills_str: string | null;
}

function mapRowToCandidate(row: CandidateRow): CandidateWithSkills {
  const { skills_str, ...rest } = row;
  return {
    ...rest,
    skills: skills_str ? skills_str.split('|||') : [],
  };
}

/**
 * Retrieves a candidate by unique ID, including aggregated skill tags.
 */
export function getCandidateById(db: Database.Database, id: string): CandidateWithSkills | null {
  const stmt = db.prepare<[string], CandidateRow>(`
    SELECT 
      c.*,
      (
        SELECT GROUP_CONCAT(s.name, '|||')
        FROM candidate_skills cs
        JOIN skills s ON cs.skill_id = s.id
        WHERE cs.candidate_id = c.id
        ORDER BY s.name ASC
      ) AS skills_str
    FROM candidates c
    WHERE c.id = ?
  `);

  const row = stmt.get(id);
  if (!row) {
    return null;
  }
  return mapRowToCandidate(row);
}

/**
 * Lists candidates matching search and filter parameters with pagination.
 */
export function listCandidates(
  db: Database.Database,
  filters: CandidateFilterParams
): PaginatedResult<CandidateWithSkills> {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(
    config.MAX_PAGE_SIZE,
    Math.max(1, Number(filters.limit) || config.DEFAULT_PAGE_SIZE)
  );
  const offset = (page - 1) * limit;

  const whereClauses: string[] = ['1=1'];
  const params: (string | number)[] = [];

  // Filter: Status
  if (filters.status) {
    whereClauses.push('c.status = ?');
    params.push(filters.status);
  }

  // Filter: Role
  if (filters.role && filters.role.trim()) {
    whereClauses.push('LOWER(c.target_role) = LOWER(?)');
    params.push(filters.role.trim());
  }

  // Filter: Source
  if (filters.source && filters.source.trim()) {
    whereClauses.push('LOWER(c.source) = LOWER(?)');
    params.push(filters.source.trim());
  }

  // Filter: Minimum Experience
  if (filters.min_experience !== undefined && !isNaN(Number(filters.min_experience))) {
    whereClauses.push('c.years_experience >= ?');
    params.push(Number(filters.min_experience));
  }

  // Filter: Maximum Experience
  if (filters.max_experience !== undefined && !isNaN(Number(filters.max_experience))) {
    whereClauses.push('c.years_experience <= ?');
    params.push(Number(filters.max_experience));
  }

  // Filter: Skill tag
  if (filters.skill && filters.skill.trim()) {
    whereClauses.push(`
      c.id IN (
        SELECT cs.candidate_id 
        FROM candidate_skills cs 
        JOIN skills s ON cs.skill_id = s.id 
        WHERE LOWER(s.name) = LOWER(?)
      )
    `);
    params.push(filters.skill.trim());
  }

  // Search across name, target_role, notes, source, and skills
  if (filters.q && filters.q.trim()) {
    const term = `%${filters.q.trim()}%`;
    whereClauses.push(`(
      c.name LIKE ? 
      OR c.target_role LIKE ? 
      OR c.notes LIKE ? 
      OR c.source LIKE ?
      OR c.id IN (
        SELECT cs.candidate_id 
        FROM candidate_skills cs 
        JOIN skills s ON cs.skill_id = s.id 
        WHERE s.name LIKE ?
      )
    )`);
    params.push(term, term, term, term, term);
  }

  const whereSql = whereClauses.join(' AND ');

  // Total count query
  const countStmt = db.prepare(`SELECT COUNT(*) AS total FROM candidates c WHERE ${whereSql}`);
  const { total } = countStmt.get(...params) as { total: number };

  // Sorting whitelist
  const allowedSortCols: Record<string, string> = {
    applied_date: 'c.applied_date',
    years_experience: 'c.years_experience',
    name: 'c.name',
    id: 'c.id',
  };
  const sortCol = allowedSortCols[filters.sort_by || 'applied_date'] || 'c.applied_date';
  const sortDir = filters.sort_order === 'asc' ? 'ASC' : 'DESC';

  // Data query
  const dataStmt = db.prepare<any[], CandidateRow>(`
    SELECT 
      c.*,
      (
        SELECT GROUP_CONCAT(s.name, '|||')
        FROM candidate_skills cs
        JOIN skills s ON cs.skill_id = s.id
        WHERE cs.candidate_id = c.id
        ORDER BY s.name ASC
      ) AS skills_str
    FROM candidates c
    WHERE ${whereSql}
    ORDER BY ${sortCol} ${sortDir}, c.id ASC
    LIMIT ? OFFSET ?
  `);

  const rows = dataStmt.all(...params, limit, offset);
  const data = rows.map(mapRowToCandidate);

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}

/**
 * Updates a candidate's triage status.
 */
export function updateCandidateStatus(
  db: Database.Database,
  id: string,
  status: TriageStatus
): CandidateWithSkills | null {
  const stmt = db.prepare(`
    UPDATE candidates 
    SET status = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

  const info = stmt.run(status, id);
  if (info.changes === 0) {
    return null;
  }

  return getCandidateById(db, id);
}

/**
 * Lists all unique skills along with their candidate counts.
 */
export function listSkills(db: Database.Database): SkillCount[] {
  const stmt = db.prepare<[], SkillCount>(`
    SELECT s.name, COUNT(cs.candidate_id) AS count
    FROM skills s
    LEFT JOIN candidate_skills cs ON s.id = cs.skill_id
    GROUP BY s.id, s.name
    ORDER BY count DESC, s.name ASC
  `);

  return stmt.all();
}

/**
 * Returns aggregate candidate counts by triage status via a single GROUP BY query.
 */
export function getTriageStats(db: Database.Database): TriageStats {
  const rows = db.prepare(`
    SELECT status, COUNT(*) AS count
    FROM candidates
    GROUP BY status
  `).all() as { status: string; count: number }[];

  const stats: TriageStats = {
    total: 0,
    untriaged: 0,
    shortlisted: 0,
    rejected: 0,
  };

  for (const row of rows) {
    stats.total += row.count;
    if (row.status === 'untriaged') stats.untriaged = row.count;
    else if (row.status === 'shortlisted') stats.shortlisted = row.count;
    else if (row.status === 'rejected') stats.rejected = row.count;
  }

  return stats;
}

/**
 * Lists all distinct candidate target roles in alphabetical order.
 */
export function listRoles(db: Database.Database): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT target_role
    FROM candidates
    WHERE target_role IS NOT NULL AND TRIM(target_role) != ''
    ORDER BY target_role ASC
  `).all() as { target_role: string }[];

  return rows.map((r) => r.target_role);
}

/**
 * Lists all distinct candidate recruitment sources in alphabetical order.
 */
export function listSources(db: Database.Database): string[] {
  const rows = db.prepare(`
    SELECT DISTINCT source
    FROM candidates
    WHERE source IS NOT NULL AND TRIM(source) != ''
    ORDER BY source ASC
  `).all() as { source: string }[];

  return rows.map((r) => r.source);
}
