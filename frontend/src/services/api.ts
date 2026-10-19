import type {
  Candidate,
  CandidateFilterState,
  HealthResponse,
  PaginatedCandidatesResponse,
  SkillItem,
  SkillsResponse,
  TriageStats,
  TriageStatus,
} from '../types/candidate';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Custom application API error preserving backend error code and details.
 */
export class ApiError extends Error {
  code: string;
  statusCode: number;

  constructor(message: string, code: string = 'API_ERROR', statusCode: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
  }
}

/**
 * Internal fetch wrapper with robust error parsing.
 */
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new ApiError(
      `Network connection error: Unable to reach ${url}. Please ensure the backend server is running.`,
      'NETWORK_ERROR',
      0
    );
  }

  let data: any;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error?.message || response.statusText || 'Unknown server error';
    const errorCode = data?.error?.code || `HTTP_${response.status}`;
    throw new ApiError(errorMsg, errorCode, response.status);
  }

  return data as T;
}

/**
 * Fetches candidates matching query and filter parameters.
 */
export async function fetchCandidates(
  filters: Partial<CandidateFilterState> = {}
): Promise<PaginatedCandidatesResponse> {
  const queryParams = new URLSearchParams();

  if (filters.page) queryParams.set('page', String(filters.page));
  if (filters.limit) queryParams.set('limit', String(filters.limit));
  if (filters.q && filters.q.trim()) queryParams.set('q', filters.q.trim());
  if (filters.status && filters.status !== 'all') queryParams.set('status', filters.status);
  if (filters.role && filters.role !== 'all') queryParams.set('role', filters.role);
  if (filters.source && filters.source !== 'all') queryParams.set('source', filters.source);
  if (filters.skill && filters.skill !== 'all') queryParams.set('skill', filters.skill);
  if (filters.min_experience !== undefined && filters.min_experience !== '') {
    queryParams.set('min_experience', String(filters.min_experience));
  }
  if (filters.max_experience !== undefined && filters.max_experience !== '') {
    queryParams.set('max_experience', String(filters.max_experience));
  }
  if (filters.sort_by) queryParams.set('sort_by', filters.sort_by);
  if (filters.sort_order) queryParams.set('sort_order', filters.sort_order);

  const qs = queryParams.toString();
  const endpoint = `/api/candidates${qs ? `?${qs}` : ''}`;
  return request<PaginatedCandidatesResponse>(endpoint);
}

/**
 * Retrieves a single candidate by ID.
 */
export async function fetchCandidateById(id: string): Promise<Candidate> {
  const res = await request<{ data: Candidate }>(`/api/candidates/${encodeURIComponent(id)}`);
  return res.data;
}

/**
 * Updates a candidate's triage status.
 */
export async function updateCandidateStatus(
  id: string,
  status: TriageStatus
): Promise<Candidate> {
  const res = await request<{ data: Candidate; message: string }>(
    `/api/candidates/${encodeURIComponent(id)}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  );
  return res.data;
}

/**
 * Fetches available skills with candidate counts.
 */
export async function fetchSkills(): Promise<SkillItem[]> {
  const res = await request<SkillsResponse>('/api/skills');
  return res.data;
}

/**
 * Fetches health status and total candidate count.
 */
export async function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>('/health');
}

/**
 * Fetches comprehensive triage stats (total, untriaged, shortlisted, rejected)
 * via parallel requests supported by the real API.
 */
export async function fetchTriageStats(): Promise<TriageStats> {
  const [totalRes, untriagedRes, shortlistedRes, rejectedRes] = await Promise.all([
    fetchCandidates({ limit: 1 }),
    fetchCandidates({ limit: 1, status: 'untriaged' }),
    fetchCandidates({ limit: 1, status: 'shortlisted' }),
    fetchCandidates({ limit: 1, status: 'rejected' }),
  ]);

  return {
    total: totalRes.pagination.total,
    untriaged: untriagedRes.pagination.total,
    shortlisted: shortlistedRes.pagination.total,
    rejected: rejectedRes.pagination.total,
  };
}
