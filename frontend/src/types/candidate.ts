export type TriageStatus = 'untriaged' | 'shortlisted' | 'rejected';

export interface Candidate {
  id: string;
  name: string;
  target_role: string;
  years_experience: number;
  source: string;
  skills: string[];
  notes: string;
  applied_date: string;
  status: TriageStatus;
  created_at: string;
  updated_at: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedCandidatesResponse {
  data: Candidate[];
  pagination: PaginationMeta;
}

export interface CandidateFilterState {
  q: string;
  status: string; // 'all' | TriageStatus
  role: string;
  source: string;
  skill: string;
  min_experience: string;
  max_experience: string;
  sort_by: 'applied_date' | 'years_experience' | 'name' | 'id';
  sort_order: 'asc' | 'desc';
  page: number;
  limit: number;
}

export interface SkillItem {
  name: string;
  count: number;
}

export interface SkillsResponse {
  data: SkillItem[];
  total: number;
}

export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  database: {
    connected: boolean;
    candidateCount: number;
  };
}

export interface TriageStats {
  total: number;
  untriaged: number;
  shortlisted: number;
  rejected: number;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export type FitLevel = 'strong' | 'moderate' | 'weak' | 'unclear';

export interface CandidateFitResult {
  candidateId: string;
  candidateName: string;
  targetRole: string;
  fitLevel: FitLevel;
  oneLineSummary: string;
  supportedSkills: string[];
  missingOrUnverifiedSkills: string[];
  experienceFit: string;
  fitRationale: string;
  uncertaintiesOrRisks: string;
  disclaimer: string;
  generatedAt: string;
  model: string;
}

export interface CandidateFitResponse {
  data: CandidateFitResult;
}
