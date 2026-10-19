export type TriageStatus = 'untriaged' | 'shortlisted' | 'rejected';

export const VALID_TRIAGE_STATUSES: readonly TriageStatus[] = ['untriaged', 'shortlisted', 'rejected'] as const;

export interface CandidateRecord {
  id: string;
  name: string;
  target_role: string;
  years_experience: number;
  source: string;
  notes: string;
  applied_date: string;
  status: TriageStatus;
  created_at: string;
  updated_at: string;
}

export interface CandidateWithSkills extends CandidateRecord {
  skills: string[];
}

export interface RawCandidateInput {
  id: string;
  name: string;
  target_role: string;
  years_experience: number;
  source: string;
  skills: string[];
  notes: string;
  applied_date: string;
}

export type SortColumn = 'applied_date' | 'years_experience' | 'name' | 'id';

export interface CandidateFilterParams {
  q?: string;
  role?: string;
  source?: string;
  status?: TriageStatus;
  min_experience?: number;
  max_experience?: number;
  skill?: string;
  page?: number;
  limit?: number;
  sort_by?: SortColumn;
  sort_order?: 'asc' | 'desc';
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface SkillCount {
  name: string;
  count: number;
}

export interface TriageStats {
  total: number;
  untriaged: number;
  shortlisted: number;
  rejected: number;
}
