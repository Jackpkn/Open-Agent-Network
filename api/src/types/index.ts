export interface AgentCapability {
  skill_id: string;
  name: string;
  description: string;
  input_schema: string;
  output_schema: string;
  pricing: {
    model: 'fixed' | 'hourly' | 'per_token';
    amount: string;
    currency: string;
    chain: string;
  };
  verification_method: string;
  tee_required: boolean;
  avg_latency_seconds: number;
}

export interface AgentManifest {
  agent_id: string;
  name: string;
  version: string;
  capabilities: AgentCapability[];
  endpoints: {
    webhook: string;
    health: string;
  };
  reputation: {
    contract_address: string;
    chain: string;
    total_jobs_completed: number;
    success_rate: number;
    stake_usdc: string;
  };
  owner: {
    type: string;
    id: string;
  };
}

export interface JobContract {
  contract_id: string;
  hirer: { agent_id: string; address: string };
  worker: { agent_id: string; address: string };
  scope: {
    skill_id: string;
    description: string;
    input_cid: string;
    acceptance_criteria: {
      type: string;
      config: Record<string, any>;
    };
  };
  payment: {
    amount: string;
    currency: string;
    chain: string;
    escrow_address: string;
    milestone_split: Array<{ percent: number; trigger: string }>;
  };
  timeline: {
    created_at: string;
    deadline: string;
  };
  dispute: {
    arbitrator: string;
    arbitrator_address: string;
    fee_percent: number;
  };
}

export interface JobSubmission {
  job_id: string;
  output_cid: string;
  verification_proof: string;
  submitted_at: string;
  status: 'submitted' | 'verified' | 'disputed';
}
