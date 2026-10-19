import { performance } from 'perf_hooks';
import {
  rankCandidatesBaseline,
  rankCandidatesOptimized,
  type CandidateLike,
} from '../algorithms/ranking';

/**
 * Deterministic PRNG: Mulberry32
 * Ensures synthetic candidate generation is 100% reproducible across machines and runs.
 */
function createPrng(seed: number): () => number {
  let s = seed;
  return function (): number {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKILL_POOL = [
  'Python', 'FastAPI', 'Django', 'Flask', 'React', 'TypeScript', 'JavaScript',
  'Next.js', 'Node.js', 'Express', 'Java', 'Spring Boot', 'Kotlin', 'Go',
  'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'Elasticsearch', 'Cassandra',
  'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform', 'CI/CD',
  'Kafka', 'RabbitMQ', 'GraphQL', 'REST APIs', 'gRPC', 'Microservices',
  'System Design', 'LLM APIs', 'Vector DBs', 'LangChain', 'PyTorch',
  'TensorFlow', 'Scikit-Learn', 'Pandas', 'NumPy', 'Selenium', 'Cypress',
  'Jest', 'Linux', 'Git', 'Swift', 'Objective-C', 'iOS', 'Android',
  'Flutter', 'C++', 'Rust', 'Scala', 'Hadoop', 'Spark', 'Airflow', 'dbt', 'BigQuery'
];

const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan', 'Krishna', 'Ishaan',
  'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Pari', 'Anushka', 'Navya', 'Myra', 'Ira', 'Avani',
  'Rohan', 'Sameer', 'Pooja', 'Vikram', 'Neha', 'Kavita', 'Suresh', 'Manish', 'Rahul', 'Sneha'
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Patel', 'Reddy', 'Rao', 'Nair', 'Iyer', 'Gupta', 'Singh', 'Chauhan',
  'Deshmukh', 'Kulkarni', 'Joshi', 'Mehta', 'Bhat', 'Menon', 'Pillai', 'Kumar', 'Das', 'Sen'
];

/**
 * Generates N synthetic candidates deterministically.
 */
export function generateSyntheticCandidates(
  count: number,
  seed: number = 42
): CandidateLike[] {
  const prng = createPrng(seed);
  const candidates: CandidateLike[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const firstName = FIRST_NAMES[Math.floor(prng() * FIRST_NAMES.length)];
    const lastName = LAST_NAMES[Math.floor(prng() * LAST_NAMES.length)];
    const skillCount = Math.floor(prng() * 9) + 4; // 4 to 12 skills
    const skills: string[] = [];
    const usedIndices = new Set<number>();

    while (skills.length < skillCount) {
      const idx = Math.floor(prng() * SKILL_POOL.length);
      if (!usedIndices.has(idx)) {
        usedIndices.add(idx);
        skills.push(SKILL_POOL[idx]);
      }
    }

    // Occasionally add a duplicate or variations to test resilience
    if (prng() < 0.1) {
      skills.push(skills[0].toUpperCase());
    }

    candidates[i] = {
      id: `syn_${String(i + 1).padStart(6, '0')}`,
      name: `${firstName} ${lastName}`,
      years_experience: Math.floor(prng() * 10) + 1,
      skills,
    };
  }

  return candidates;
}

interface BenchmarkStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  durations: number[];
}

function calculateStats(durations: number[]): BenchmarkStats {
  const sorted = [...durations].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mean = sorted.reduce((sum, d) => sum + d, 0) / sorted.length;
  const median = sorted[Math.floor(sorted.length / 2)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  return { min, max, mean, median, p95, durations };
}

/**
 * Runs the comprehensive ranking benchmark.
 */
export function runRankingBenchmark(): void {
  const CANDIDATE_COUNT = 100_000;
  const SEED = 20261019;
  const WARMUP_RUNS = 2;
  const MEASURED_RUNS = 5;

  const REQUIRED_SKILLS = [
    'Python',
    'FastAPI',
    'Docker',
    'Kubernetes',
    'PostgreSQL',
    'TypeScript',
    'Redis',
    'LLM APIs',
  ];

  console.log('='.repeat(75));
  console.log('GCCX Case Study — Task 2a Ranking Benchmark at Scale');
  console.log('='.repeat(75));
  console.log(`Node.js Version : ${process.version}`);
  console.log(`Platform / Arch : ${process.platform} / ${process.arch}`);
  console.log(`Candidate Count : ${CANDIDATE_COUNT.toLocaleString()}`);
  console.log(`Skill Pool Size : ${SKILL_POOL.length} unique skills`);
  console.log(`Required Skills : ${REQUIRED_SKILLS.length} [${REQUIRED_SKILLS.join(', ')}]`);
  console.log(`Warmup Runs     : ${WARMUP_RUNS}`);
  console.log(`Measured Runs   : ${MEASURED_RUNS}`);
  console.log('='.repeat(75));

  process.stdout.write('Generating 100,000 deterministic synthetic candidates... ');
  const genStart = performance.now();
  const candidates = generateSyntheticCandidates(CANDIDATE_COUNT, SEED);
  const genElapsed = performance.now() - genStart;
  console.log(`Done (${genElapsed.toFixed(2)} ms)\n`);

  // --- Benchmark 1: Baseline Full Rank (All 100k sorted) ---
  console.log('1. Running Baseline Implementation (Full Array Sort: O(N log N))...');
  for (let i = 0; i < WARMUP_RUNS; i++) {
    rankCandidatesBaseline(candidates, REQUIRED_SKILLS);
  }
  const baselineDurations: number[] = [];
  for (let i = 0; i < MEASURED_RUNS; i++) {
    const t0 = performance.now();
    const res = rankCandidatesBaseline(candidates, REQUIRED_SKILLS);
    const t1 = performance.now();
    baselineDurations.push(t1 - t0);
    // Sanity check
    if (i === 0) {
      console.log(`   Sample top match: ${res[0].candidate.name} (Score: ${res[0].score}/${REQUIRED_SKILLS.length})`);
    }
  }
  const baselineStats = calculateStats(baselineDurations);
  console.log(`   Baseline Mean: ${baselineStats.mean.toFixed(2)} ms | Median: ${baselineStats.median.toFixed(2)} ms | Min: ${baselineStats.min.toFixed(2)} ms\n`);

  // --- Benchmark 2: Optimized Bucket-Sort Full Rank (All 100k partitioned into score buckets) ---
  console.log('2. Running Optimized Bucket-Sort Implementation (Full Rank: O(N + sum(B_i log B_i)))...');
  for (let i = 0; i < WARMUP_RUNS; i++) {
    rankCandidatesOptimized(candidates, REQUIRED_SKILLS);
  }
  const optDurations: number[] = [];
  for (let i = 0; i < MEASURED_RUNS; i++) {
    const t0 = performance.now();
    const res = rankCandidatesOptimized(candidates, REQUIRED_SKILLS);
    const t1 = performance.now();
    optDurations.push(t1 - t0);
    if (i === 0) {
      console.log(`   Sample top match: ${res[0].candidate.name} (Score: ${res[0].score}/${REQUIRED_SKILLS.length})`);
    }
  }
  const optStats = calculateStats(optDurations);
  console.log(`   Optimized Mean: ${optStats.mean.toFixed(2)} ms | Median: ${optStats.median.toFixed(2)} ms | Min: ${optStats.min.toFixed(2)} ms\n`);

  // --- Benchmark 3: Top-K Practical Search (e.g. Recruiter viewing top 100 out of 100,000) ---
  const TOP_K = 100;
  console.log(`3. Running Optimized Implementation with Top-K Early Exit (limit=${TOP_K})...`);
  for (let i = 0; i < WARMUP_RUNS; i++) {
    rankCandidatesOptimized(candidates, REQUIRED_SKILLS, { limit: TOP_K });
  }
  const topKDurations: number[] = [];
  for (let i = 0; i < MEASURED_RUNS; i++) {
    const t0 = performance.now();
    rankCandidatesOptimized(candidates, REQUIRED_SKILLS, { limit: TOP_K });
    const t1 = performance.now();
    topKDurations.push(t1 - t0);
  }
  const topKStats = calculateStats(topKDurations);
  console.log(`   Top-${TOP_K} Mean: ${topKStats.mean.toFixed(2)} ms | Median: ${topKStats.median.toFixed(2)} ms | Min: ${topKStats.min.toFixed(2)} ms\n`);

  // --- Summary Comparison ---
  console.log('='.repeat(75));
  console.log('BENCHMARK SUMMARY & PERFORMANCE RESULTS');
  console.log('='.repeat(75));
  console.table({
    'Baseline (Full Sort)': {
      'Mean (ms)': Number(baselineStats.mean.toFixed(2)),
      'Median (ms)': Number(baselineStats.median.toFixed(2)),
      'Throughput (cand/sec)': Math.round((CANDIDATE_COUNT / baselineStats.mean) * 1000),
      'Speedup vs Baseline': '1.0x (Ref)',
    },
    'Optimized Bucket Sort (Full)': {
      'Mean (ms)': Number(optStats.mean.toFixed(2)),
      'Median (ms)': Number(optStats.median.toFixed(2)),
      'Throughput (cand/sec)': Math.round((CANDIDATE_COUNT / optStats.mean) * 1000),
      'Speedup vs Baseline': `${(baselineStats.mean / optStats.mean).toFixed(2)}x`,
    },
    [`Optimized (Top-${TOP_K} Limit)`]: {
      'Mean (ms)': Number(topKStats.mean.toFixed(2)),
      'Median (ms)': Number(topKStats.median.toFixed(2)),
      'Throughput (cand/sec)': Math.round((CANDIDATE_COUNT / topKStats.mean) * 1000),
      'Speedup vs Baseline': `${(baselineStats.mean / topKStats.mean).toFixed(2)}x`,
    },
  });
  console.log('='.repeat(75));
}

if (require.main === module) {
  runRankingBenchmark();
}
