import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '../App';
import * as api from '../services/api';
import type {
  Candidate,
  CandidateFitResult,
  HealthResponse,
  SkillItem,
  TriageStats,
} from '../types/candidate';

const mockCandidates: Candidate[] = [
  {
    id: 'cand_001',
    name: 'Sameer Rao',
    target_role: 'ML Engineer',
    years_experience: 6,
    source: 'Referral',
    skills: ['Python', 'FastAPI', 'Kubernetes'],
    notes: 'Sameer has 6 yrs in a large enterprise team — process-heavy environment. Strong ownership.',
    applied_date: '2026-09-10',
    status: 'untriaged',
    created_at: '2026-09-10T00:00:00Z',
    updated_at: '2026-09-10T00:00:00Z',
  },
  {
    id: 'cand_002',
    name: 'Priya Sharma',
    target_role: 'Frontend Engineer',
    years_experience: 4,
    source: 'AngelList',
    skills: ['React', 'TypeScript', 'Next.js'],
    notes: 'Great portfolio with clean accessibility patterns.',
    applied_date: '2026-09-12',
    status: 'shortlisted',
    created_at: '2026-09-12T00:00:00Z',
    updated_at: '2026-09-12T00:00:00Z',
  },
  {
    id: 'cand_003',
    name: 'Karan Verma',
    target_role: 'DevOps Engineer',
    years_experience: 2,
    source: 'Naukri',
    skills: ['Docker', 'AWS'],
    notes: 'Junior profile, lacks required cloud orchestration depth.',
    applied_date: '2026-09-15',
    status: 'rejected',
    created_at: '2026-09-15T00:00:00Z',
    updated_at: '2026-09-15T00:00:00Z',
  },
];

const mockStats: TriageStats = {
  total: 3,
  untriaged: 1,
  shortlisted: 1,
  rejected: 1,
};

const mockSkills: SkillItem[] = [
  { name: 'Python', count: 1 },
  { name: 'FastAPI', count: 1 },
  { name: 'React', count: 1 },
  { name: 'Docker', count: 1 },
];

const mockHealth: HealthResponse = {
  status: 'ok',
  service: 'gccx-candidate-triage-backend',
  timestamp: new Date().toISOString(),
  database: {
    connected: true,
    candidateCount: 3,
  },
};

describe('Candidate Triage Dashboard UI Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();

    vi.spyOn(api, 'fetchHealth').mockResolvedValue(mockHealth);
    vi.spyOn(api, 'fetchSkills').mockResolvedValue(mockSkills);
    vi.spyOn(api, 'fetchRoles').mockResolvedValue(['DevOps Engineer', 'Frontend Engineer', 'ML Engineer']);
    vi.spyOn(api, 'fetchSources').mockResolvedValue(['AngelList', 'Naukri', 'Referral']);
    vi.spyOn(api, 'fetchTriageStats').mockResolvedValue(mockStats);
    vi.spyOn(api, 'fetchCandidates').mockResolvedValue({
      data: mockCandidates,
      pagination: {
        page: 1,
        limit: 20,
        total: 3,
        totalPages: 1,
        hasNextPage: false,
        hasPrevPage: false,
      },
    });
  });

  it('renders header, branding, and active online API badge', async () => {
    render(<App />);

    expect(screen.getByText('Candidate Triage Operations')).toBeInTheDocument();
    expect(screen.getByText(/Global Engineering Search/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/API Online/i)).toBeInTheDocument();
    });
  });

  it('displays accurate overview KPI statistics cards', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Filter by Needs Review/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Filter by Shortlisted/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Filter by Archived/i })).toBeInTheDocument();
    });

    // Verify values rendered in KPI cards
    expect(screen.getByRole('button', { name: /Filter by Total Candidates: 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filter by Needs Review: 1/i })).toBeInTheDocument();
  });

  it('renders candidate rows with name, role, experience, skills, and status badges', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sameer Rao')).toBeInTheDocument();
      expect(screen.getByText('Priya Sharma')).toBeInTheDocument();
      expect(screen.getByText('Karan Verma')).toBeInTheDocument();
    });

    expect(screen.getAllByText('ML Engineer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Frontend Engineer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('DevOps Engineer').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('6 yrs')).toBeInTheDocument();
    expect(screen.getByText('4 yrs')).toBeInTheDocument();
  });

  it('clicking a candidate name opens the details modal drawer with recruiter notes', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sameer Rao')).toBeInTheDocument();
    });

    // Click candidate name
    fireEvent.click(screen.getByText('Sameer Rao'));

    // Verify modal elements
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText(/Qualitative Recruiter Notes/i)).toBeInTheDocument();
      expect(screen.getByText(/process-heavy environment/i)).toBeInTheDocument();
    });

    // Close modal via Escape
    fireEvent.keyDown(window, { key: 'Escape', code: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('clicking Shortlist invokes updateCandidateStatus and displays success toast', async () => {
    const updateSpy = vi.spyOn(api, 'updateCandidateStatus').mockResolvedValue({
      ...mockCandidates[0],
      status: 'shortlisted',
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sameer Rao')).toBeInTheDocument();
    });

    // Find shortlist button for Sameer Rao specifically
    const shortlistBtn = screen.getByRole('button', { name: 'Shortlist Sameer Rao' });
    fireEvent.click(shortlistBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('cand_001', 'shortlisted');
      expect(screen.getByText(/successfully updated to 'shortlisted'/i)).toBeInTheDocument();
    });
  });

  it('clicking Reject candidate invokes updateCandidateStatus', async () => {
    const updateSpy = vi.spyOn(api, 'updateCandidateStatus').mockResolvedValue({
      ...mockCandidates[0],
      status: 'rejected',
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sameer Rao')).toBeInTheDocument();
    });

    const rejectBtn = screen.getByRole('button', { name: 'Reject Sameer Rao' });
    fireEvent.click(rejectBtn);

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith('cand_001', 'rejected');
      expect(screen.getByText(/successfully updated to 'rejected'/i)).toBeInTheDocument();
    });
  });

  it('filters by status when clicking KPI cards', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Filter by Shortlisted/i })).toBeInTheDocument();
    });

    // Click on Shortlisted card
    const shortlistedCard = screen.getByRole('button', { name: /Filter by Shortlisted/i });
    fireEvent.click(shortlistedCard);

    await waitFor(() => {
      expect(api.fetchCandidates).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'shortlisted' })
      );
    });
  });

  it('renders recoverable error state with retry button on network failure', async () => {
    vi.spyOn(api, 'fetchCandidates').mockRejectedValueOnce(
      new Error('Failed to connect to backend server')
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to connect to backend server/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Retry/i })).toBeInTheDocument();
    });
  });

  it('triggers AI fit evaluation inside candidate details modal and displays structured result', async () => {
    const mockFitResult: CandidateFitResult = {
      candidateId: 'cand_001',
      candidateName: 'Sameer Rao',
      targetRole: 'ML Engineer',
      fitLevel: 'strong',
      oneLineSummary: 'Sameer has strong infrastructure capabilities in Python and Kubernetes suited for ML platforms.',
      supportedSkills: ['Python', 'Kubernetes'],
      missingOrUnverifiedSkills: ['PyTorch'],
      experienceFit: '6 years matches senior engineering scope.',
      fitRationale: 'Proven enterprise track record in scalable distributed infrastructure.',
      uncertaintiesOrRisks: 'Requires clarity on individual project ownership.',
      disclaimer: 'AI-generated candidate evaluation intended solely as decision support for human recruiters.',
      generatedAt: '2026-10-19T12:00:00Z',
      model: 'gemini-3.8-flash',
    };

    const evalSpy = vi.spyOn(api, 'evaluateCandidateFit').mockResolvedValueOnce(mockFitResult);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sameer Rao')).toBeInTheDocument();
    });

    // Open Sameer Rao details modal
    fireEvent.click(screen.getByText('Sameer Rao'));

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Evaluate Fit with Gemini/i })).toBeInTheDocument();
    });

    // Click Evaluate Fit with Gemini
    const evalBtn = screen.getByRole('button', { name: /Evaluate Fit with Gemini/i });
    fireEvent.click(evalBtn);

    await waitFor(() => {
      expect(evalSpy).toHaveBeenCalledWith('cand_001', expect.any(String));
      expect(screen.getByText(/Fit Level: strong/i)).toBeInTheDocument();
      expect(screen.getByText(/"Sameer has strong infrastructure capabilities in Python and Kubernetes suited for ML platforms."/i)).toBeInTheDocument();
      expect(screen.getByText(/✓ Python/i)).toBeInTheDocument();
      expect(screen.getByText(/\? PyTorch/i)).toBeInTheDocument();
    });
  });

  it('displays error banner and retry option when AI fit evaluation fails', async () => {
    vi.spyOn(api, 'evaluateCandidateFit').mockRejectedValueOnce(
      new Error('Gemini API rate limit exceeded. Please wait a moment before trying again.')
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Sameer Rao')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Sameer Rao'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Evaluate Fit with Gemini/i })).toBeInTheDocument();
    });

    const evalBtn = screen.getByRole('button', { name: /Evaluate Fit with Gemini/i });
    fireEvent.click(evalBtn);

    await waitFor(() => {
      expect(screen.getByText(/Evaluation Failed:/i)).toBeInTheDocument();
      expect(screen.getByText(/Gemini API rate limit exceeded/i)).toBeInTheDocument();
    });
  });
});
