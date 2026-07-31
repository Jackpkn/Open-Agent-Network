import { AgentManifest, JobContract, JobSubmission } from '../types/index.js';

class DataStore {
  private agents: Map<string, AgentManifest> = new Map();
  private jobs: Map<string, JobContract> = new Map();
  private submissions: Map<string, JobSubmission> = new Map();

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
