import { AgentManifest, JobContract, JobSubmission } from '../types/index.js';

const SEED_AGENTS: AgentManifest[] = [
  {
    agent_id: 'did:web:claude-reviewer.ai',
    owner: { type: 'did', id: 'did:web:anthropic-partner.org' },
    name: 'Claude Code Auditor',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'code-review',
        name: 'Security & Code Review',
        description: 'Automated vulnerability scanning and SQL injection detection powered by Claude 3.5 Sonnet / Gemini Flash.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '25.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 15,
        verification_method: 'ci_pass',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://claude-reviewer.ai/webhook', health: 'https://claude-reviewer.ai/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.994, total_jobs_completed: 142, stake_usdc: '1000.00' },
  },
  {
    agent_id: 'did:web:alpha-quant.io',
    owner: { type: 'did', id: 'did:web:alphaquant.io' },
    name: 'Alpha Quant Analyst',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'market-analysis',
        name: 'Market & Portfolio Analysis',
        description: 'Real-time DeFi yield optimization, volatility modeling, and protocol risk analysis.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '45.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 30,
        verification_method: 'oracle_vote',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://alphaquant.io/webhook', health: 'https://alphaquant.io/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.988, total_jobs_completed: 89, stake_usdc: '2500.00' },
  },
  {
    agent_id: 'did:web:polyglot-translator.ai',
    owner: { type: 'did', id: 'did:web:polyglot.org' },
    name: 'Polyglot Translator',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'translation',
        name: 'Multilingual Technical Translation',
        description: 'Translates technical documentation, smart contract specs, and whitepapers into 40+ languages.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '12.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 8,
        verification_method: 'deterministic',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://polyglot.org/webhook', health: 'https://polyglot.org/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 1.0, total_jobs_completed: 215, stake_usdc: '500.00' },
  },
  {
    agent_id: 'did:web:bio-synth.org',
    owner: { type: 'did', id: 'did:web:biosynth.org' },
    name: 'Genomic Researcher AI',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'literature-search',
        name: 'PubMed & Structure Synthesis',
        description: 'Synthesizes biomedical literature, UniProt accessions, and clinical trial datasets.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '50.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 45,
        verification_method: 'human_review',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://biosynth.org/webhook', health: 'https://biosynth.org/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.975, total_jobs_completed: 64, stake_usdc: '1500.00' },
  },
  {
    agent_id: 'did:web:devops-sentinel.io',
    owner: { type: 'did', id: 'did:web:sentinel.io' },
    name: 'DevOps Sentinel',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'infra-deploy',
        name: 'Kubernetes & CI Pipeline Audit',
        description: 'Monitors cluster health, verifies Helm deployment specs, and audits Terraform files.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '30.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 20,
        verification_method: 'ci_pass',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://sentinel.io/webhook', health: 'https://sentinel.io/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.991, total_jobs_completed: 110, stake_usdc: '1200.00' },
  },
  {
    agent_id: 'did:web:solidity-fuzzer.io',
    owner: { type: 'did', id: 'did:web:fuzzer.io' },
    name: 'Solidity Contract Fuzzer',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'solidity-fuzz',
        name: 'Slither & Foundry Property Fuzzing',
        description: 'Runs automated Slither static analysis and Foundry property fuzz testing on Solidity contracts.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '40.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 25,
        verification_method: 'ci_pass',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://solidity-fuzzer.io/webhook', health: 'https://solidity-fuzzer.io/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.996, total_jobs_completed: 178, stake_usdc: '2000.00' },
  },
  {
    agent_id: 'did:web:sql-opt.ai',
    owner: { type: 'did', id: 'did:web:sqlopt.ai' },
    name: 'SQL Query Optimizer',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'sql-optimize',
        name: 'Postgres & MySQL Query Tuning',
        description: 'Analyzes EXPLAIN ANALYZE execution trees, recommends indexes, and rewrites slow JOIN queries.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '18.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 10,
        verification_method: 'deterministic',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://sql-opt.ai/webhook', health: 'https://sql-opt.ai/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.985, total_jobs_completed: 95, stake_usdc: '800.00' },
  },
  {
    agent_id: 'did:web:data-cleaner.io',
    owner: { type: 'did', id: 'did:web:dataclean.io' },
    name: 'Pandas Data Cleaner',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'data-cleaning',
        name: 'Polars & Pandas CSV Cleansing',
        description: 'Cleans null values, standardizes date formats, deduplicates rows, and validates schema constraints.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '15.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 12,
        verification_method: 'deterministic',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://data-cleaner.io/webhook', health: 'https://data-cleaner.io/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.998, total_jobs_completed: 310, stake_usdc: '600.00' },
  },
  {
    agent_id: 'did:web:tech-copy.ai',
    owner: { type: 'did', id: 'did:web:techcopy.ai' },
    name: 'Technical Copywriter',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'doc-copywriting',
        name: 'SEO & Technical Documentation',
        description: 'Generates API reference docs, integration guides, and developer release notes.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '20.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 18,
        verification_method: 'human_review',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://tech-copy.ai/webhook', health: 'https://tech-copy.ai/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.970, total_jobs_completed: 82, stake_usdc: '750.00' },
  },
  {
    agent_id: 'did:web:loadtest-agent.io',
    owner: { type: 'did', id: 'did:web:loadtest.io' },
    name: 'Distributed k6 Load Tester',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'api-loadtest',
        name: 'k6 / Locust Load Benchmark',
        description: 'Executes 10,000+ concurrent VU load benchmarks against HTTP & WebSocket APIs.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '35.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 40,
        verification_method: 'ci_pass',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://loadtest-agent.io/webhook', health: 'https://loadtest-agent.io/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.992, total_jobs_completed: 130, stake_usdc: '1400.00' },
  },
  {
    agent_id: 'did:web:patent-synth.org',
    owner: { type: 'did', id: 'did:web:patentsynth.org' },
    name: 'Patent Prior Art Agent',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'patent-search',
        name: 'Patent Claim & Prior Art Search',
        description: 'Searches USPTO, WIPO, and OpenAlex databases to identify prior art for patent claims.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '60.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 50,
        verification_method: 'human_review',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://patent-synth.org/webhook', health: 'https://patent-synth.org/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.981, total_jobs_completed: 55, stake_usdc: '1800.00' },
  },
  {
    agent_id: 'did:web:tokenomics-audit.io',
    owner: { type: 'did', id: 'did:web:tokenomics.io' },
    name: 'Tokenomics Auditor',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'tokenomics-audit',
        name: 'Vesting & Emission Modeling',
        description: 'Simulates 5-year token unlocks, inflationary sell pressure, and DEX liquidity depth.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '55.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 35,
        verification_method: 'oracle_vote',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://tokenomics-audit.io/webhook', health: 'https://tokenomics-audit.io/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.989, total_jobs_completed: 72, stake_usdc: '2200.00' },
  },
  {
    agent_id: 'did:web:a11y-sentinel.io',
    owner: { type: 'did', id: 'did:web:a11ysentinel.io' },
    name: 'WCAG Accessibility Auditor',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'a11y-audit',
        name: 'axe-core WCAG 2.1 Audit',
        description: 'Audits web pages for ARIA labels, contrast ratios, keyboard navigation, and screen reader flow.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '22.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 15,
        verification_method: 'ci_pass',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://a11y-sentinel.io/webhook', health: 'https://a11y-sentinel.io/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.995, total_jobs_completed: 160, stake_usdc: '900.00' },
  },
  {
    agent_id: 'did:web:svg-gen.ai',
    owner: { type: 'did', id: 'did:web:svggen.ai' },
    name: 'SVG Asset Generator',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'svg-asset-gen',
        name: 'Clean Vector SVG Asset Generation',
        description: 'Generates clean, scalable, optimized SVG icons, illustrations, and UI components.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '10.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 6,
        verification_method: 'deterministic',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://svg-gen.ai/webhook', health: 'https://svg-gen.ai/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.999, total_jobs_completed: 420, stake_usdc: '400.00' },
  },
  {
    agent_id: 'did:web:threat-intel.io',
    owner: { type: 'did', id: 'did:web:threatintel.io' },
    name: 'CVE Threat Monitor',
    version: '1.0.0',
    capabilities: [
      {
        skill_id: 'threat-intel',
        name: 'NVD & CVE Zero-Day Monitoring',
        description: 'Cross-references dependency manifests against the National Vulnerability Database for zero-day CVEs.',
        input_schema: 'ipfs://QmInputSchema',
        output_schema: 'ipfs://QmOutputSchema',
        pricing: { amount: '28.00', currency: 'USDC', chain: 'base-sepolia', model: 'fixed' },
        avg_latency_seconds: 14,
        verification_method: 'ci_pass',
        tee_required: false,
      },
    ],
    endpoints: { webhook: 'https://threat-intel.io/webhook', health: 'https://threat-intel.io/health' },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.993, total_jobs_completed: 195, stake_usdc: '1100.00' },
  },
];

class DataStore {
  private agents: Map<string, AgentManifest> = new Map();
  private jobs: Map<string, JobContract> = new Map();
  private submissions: Map<string, JobSubmission> = new Map();

  constructor() {
    SEED_AGENTS.forEach((agent) => this.agents.set(agent.agent_id, agent));
  }

  // Agent Registry Methods
  registerAgent(manifest: AgentManifest): { agent_id: string; registered_at: string; status: string } {
    this.agents.set(manifest.agent_id, manifest);
    return {
      agent_id: manifest.agent_id,
      registered_at: new Date().toISOString(),
      status: 'active',
    };
  }

  getAgent(agentId: string): AgentManifest | undefined {
    return this.agents.get(agentId);
  }

  searchAgents(params: { skill?: string; min_reputation?: number; max_price?: number }): { agents: AgentManifest[]; total: number } {
    let result = Array.from(this.agents.values());

    if (params.skill) {
      result = result.filter((agent) =>
        agent.capabilities.some((cap) => cap.skill_id.toLowerCase() === params.skill?.toLowerCase())
      );
    }

    if (params.min_reputation !== undefined) {
      result = result.filter((agent) => (agent.reputation.success_rate * 5.0) >= params.min_reputation!);
    }

    if (params.max_price !== undefined) {
      result = result.filter((agent) =>
        agent.capabilities.some((cap) => parseFloat(cap.pricing.amount) <= params.max_price!)
      );
    }

    return {
      agents: result,
      total: result.length,
    };
  }

  // Job Management Methods
  createJob(contract: JobContract): { job_id: string; escrow_address: string; status: string } {
    this.jobs.set(contract.contract_id, contract);
    return {
      job_id: contract.contract_id,
      escrow_address: contract.payment.escrow_address,
      status: 'active',
    };
  }

  getJob(jobId: string): JobContract | undefined {
    return this.jobs.get(jobId);
  }

  getAllJobs(): JobContract[] {
    return Array.from(this.jobs.values());
  }

  submitWork(jobId: string, outputCid: string, verificationProof: string): { status: string; submitted_at: string } {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    const submission: JobSubmission = {
      job_id: jobId,
      output_cid: outputCid,
      verification_proof: verificationProof,
      submitted_at: new Date().toISOString(),
      status: 'submitted',
    };

    this.submissions.set(jobId, submission);
    return {
      status: 'submitted',
      submitted_at: submission.submitted_at,
    };
  }

  getSubmission(jobId: string): JobSubmission | undefined {
    return this.submissions.get(jobId);
  }

  verifyJob(jobId: string, passed: boolean, qualityScore?: number): { status: string; verified_at: string } {
    const submission = this.submissions.get(jobId);
    if (!submission) {
      throw new Error(`Submission for job ${jobId} not found`);
    }

    submission.status = passed ? 'verified' : 'disputed';
    return {
      status: submission.status,
      verified_at: new Date().toISOString(),
    };
  }
}

export const store = new DataStore();
