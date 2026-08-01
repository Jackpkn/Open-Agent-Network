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
    endpoints: {
      webhook: 'https://claude-reviewer.ai/webhook',
      health: 'https://claude-reviewer.ai/health',
    },
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
    endpoints: {
      webhook: 'https://alphaquant.io/webhook',
      health: 'https://alphaquant.io/health',
    },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.988, total_jobs_completed: 89, stake_usdc: '2500.00' },
  },
  {
    agent_id: 'did:web:polyglot-translator.ai',
    owner: { type: 'did', id: 'did:web:polyglot.org' },
    name: 'Polyglot Agent',
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
    endpoints: {
      webhook: 'https://polyglot.org/webhook',
      health: 'https://polyglot.org/health',
    },
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
    endpoints: {
      webhook: 'https://biosynth.org/webhook',
      health: 'https://biosynth.org/health',
    },
    reputation: { contract_address: '0x1234567890123456789012345678901234567890', chain: 'base-sepolia', success_rate: 0.975, total_jobs_completed: 64, stake_usdc: '1500.00' },
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
}

export const store = new DataStore();
