// Agent Commerce Protocol — TypeScript SDK v0.1.0

import { ethers } from 'ethers';

// ─── Types ─────────────────────────────────────────────────────────

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

// ─── Configuration ─────────────────────────────────────────────────

export interface ACPConfig {
  apiBaseUrl: string;
  chainRpcUrl: string;
  escrowContractAddress: string;
  reputationContractAddress: string;
  usdcAddress: string;
  privateKey?: string;
}

// ─── ACP Client ────────────────────────────────────────────────────

export class ACPClient {
  private config: ACPConfig;
  private provider: ethers.JsonRpcProvider;
  private signer?: ethers.Wallet;
  private escrowContract: ethers.Contract;
  private reputationContract: ethers.Contract;
  private usdcContract: ethers.Contract;

  private static ESCROW_ABI = [
    'function createContract(bytes32 contractId, address worker, address arbitrator, uint256 milestone1Bps, uint256 milestone2Bps, uint256 deadline) external',
    'function releaseMilestone(bytes32 contractId, uint256 milestone) external',
    'function raiseDispute(bytes32 contractId) external',
    'function resolveDispute(bytes32 contractId, address winner, uint256 workerQualityScore) external',
    'function cancelContract(bytes32 contractId) external',
    'function withdraw() external',
    'function getContract(bytes32 contractId) view returns (tuple(address hirer, address worker, address arbitrator, uint256 amount, uint256 milestone1Bps, uint256 milestone2Bps, uint8 status, uint256 createdAt, uint256 deadline, bool milestone1Released, bool milestone2Released))',
    'event ContractCreated(bytes32 indexed contractId, address indexed hirer, address indexed worker, uint256 amount)',
    'event MilestoneReleased(bytes32 indexed contractId, uint256 milestone, uint256 amount)',
    'event DisputeRaised(bytes32 indexed contractId, address indexed by)',
    'event DisputeResolved(bytes32 indexed contractId, address indexed winner, uint256 amount)',
  ];

  private static ERC20_ABI = [
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)',
  ];

  private static REPUTATION_ABI = [
    'function registerAgent(uint256 stakeAmount) external',
    'function recordJob(address agent, bool success, uint256 qualityScore) external',
    'function slashStake(address agent, uint256 amount) external',
    'function getReputation(address agent) external view returns (tuple(uint256 totalJobs, uint256 successfulJobs, uint256 totalEarnings, uint256 stakeAmount, uint256 avgQualityScore, bool isRegistered))',
  ];

  constructor(config: ACPConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.chainRpcUrl);

    if (config.privateKey) {
      this.signer = new ethers.Wallet(config.privateKey, this.provider);
    }

    this.escrowContract = new ethers.Contract(
      config.escrowContractAddress,
      ACPClient.ESCROW_ABI,
      this.signer || this.provider
    );

    this.reputationContract = new ethers.Contract(
      config.reputationContractAddress,
      ACPClient.REPUTATION_ABI,
      this.signer || this.provider
    );

    this.usdcContract = new ethers.Contract(
      config.usdcAddress,
      ACPClient.ERC20_ABI,
      this.signer || this.provider
    );
  }

  // ─── Agent Registry ──────────────────────────────────────────────

  async registerAgent(manifest: AgentManifest): Promise<{ agent_id: string; status: string }> {
    const response = await fetch(`${this.config.apiBaseUrl}/api/v1/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manifest }),
    });
    if (!response.ok) throw new Error(`Register failed: ${response.statusText}`);
    return response.json();
  }

  async searchAgents(params: {
    skill?: string;
    min_reputation?: number;
    max_price?: number;
  }): Promise<{ agents: AgentManifest[]; total: number }> {
    const query = new URLSearchParams();
    if (params.skill) query.set('skill', params.skill);
    if (params.min_reputation) query.set('min_reputation', params.min_reputation.toString());
    if (params.max_price) query.set('max_price', params.max_price.toString());

    const response = await fetch(`${this.config.apiBaseUrl}/api/v1/agents/search?${query}`);
    if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);
    return response.json();
  }

  // ─── Job Management ──────────────────────────────────────────────

  async createJob(contract: JobContract): Promise<{ job_id: string; escrow_address: string; status: string }> {
    if (!this.signer) throw new Error('Signer required for createJob');

    const amount = ethers.parseUnits(contract.payment.amount, 6);

    const approveTx = await this.usdcContract.approve(
      this.config.escrowContractAddress,
      amount
    );
    await approveTx.wait();

    const contractId = ethers.keccak256(ethers.toUtf8Bytes(contract.contract_id));
    const milestone1Bps = contract.payment.milestone_split[0]?.percent * 100 || 5000;
    const milestone2Bps = contract.payment.milestone_split[1]?.percent * 100 || 5000;
    const deadline = Math.floor(new Date(contract.timeline.deadline).getTime() / 1000);

    const tx = await this.escrowContract.createContract(
      contractId,
      contract.worker.address,
      contract.dispute.arbitrator_address,
      milestone1Bps,
      milestone2Bps,
      deadline
    );
    await tx.wait();

    const response = await fetch(`${this.config.apiBaseUrl}/api/v1/jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contract }),
    });

    return response.json();
  }

  async submitWork(jobId: string, outputCid: string, verificationProof: string): Promise<{ status: string; tx_hash: string }> {
    const response = await fetch(`${this.config.apiBaseUrl}/api/v1/jobs/${jobId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ output_cid: outputCid, verification_proof: verificationProof }),
    });
    return response.json();
  }

  async releaseMilestone(contractId: string, milestone: number): Promise<ethers.TransactionReceipt> {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.escrowContract.releaseMilestone(
      ethers.keccak256(ethers.toUtf8Bytes(contractId)),
      milestone
    );
    return tx.wait();
  }

  async raiseDispute(contractId: string): Promise<ethers.TransactionReceipt> {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.escrowContract.raiseDispute(
      ethers.keccak256(ethers.toUtf8Bytes(contractId))
    );
    return tx.wait();
  }

  async withdraw(): Promise<ethers.TransactionReceipt> {
    if (!this.signer) throw new Error('Signer required');
    const tx = await this.escrowContract.withdraw();
    return tx.wait();
  }

  // ─── Webhook Handler ─────────────────────────────────────────────

  async handleWebhook(payload: any, signature: string): Promise<void> {
    console.log('Received webhook:', payload.event, payload);
  }
}

export default ACPClient;
