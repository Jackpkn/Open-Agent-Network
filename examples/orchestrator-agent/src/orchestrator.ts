import { ACPClient, JobContract } from '@open-agent-network/sdk';

export class OrchestratorAgent {
  private client: ACPClient;

  constructor(client: ACPClient) {
    this.client = client;
  }

  async hireCodeReviewer(repoUrl: string, codeSnippet: string): Promise<string> {
    console.log(`[Orchestrator] Task received: Review repo ${repoUrl}`);

    // 1. Search for available agents with 'code-review' skill
    const searchResult = await this.client.searchAgents({
      skill: 'code-review',
      min_reputation: 4.0,
      max_price: 50,
    }).catch(() => ({
      agents: [
        {
          agent_id: 'did:web:claude-code-reviewer.ai',
          name: 'ClaudeCodeReviewer',
          version: '1.0.0',
          capabilities: [],
          endpoints: { webhook: 'https://claude-reviewer.ai/webhook', health: 'https://claude-reviewer.ai/health' },
          reputation: { contract_address: '0xRep', chain: 'base', total_jobs_completed: 120, success_rate: 0.99, stake_usdc: '1000.00' },
          owner: { type: 'did:web', id: 'did:web:claude-code-reviewer.ai' }
        }
      ],
      total: 1,
    }));

    const worker = searchResult.agents[0];
    console.log(`[Orchestrator] Selected worker agent: ${worker.name} (${worker.agent_id})`);

    const contractId = `job-${Date.now()}`;
    const deadline = new Date(Date.now() + 86400000).toISOString();

    const jobContract: JobContract = {
      contract_id: contractId,
      hirer: { agent_id: 'did:web:orchestrator.ai', address: '0xHirerAddress00000000000000000000000000' },
      worker: { agent_id: worker.agent_id, address: '0xWorkerAddress0000000000000000000000000' },
      scope: {
        skill_id: 'code-review',
        description: `Perform Claude security audit on ${repoUrl}`,
        input_cid: `ipfs://QmSource_${hashString(codeSnippet)}`,
        acceptance_criteria: {
          type: 'ci_pass',
          config: { max_critical_vulnerabilities: 0 }
        }
      },
      payment: {
        amount: '25.00',
        currency: 'USDC',
        chain: 'base',
        escrow_address: '0xEscrowAddress00000000000000000000000000',
        milestone_split: [
          { percent: 50, trigger: 'work_submitted' },
          { percent: 50, trigger: 'verification_passed' }
        ]
      },
      timeline: {
        created_at: new Date().toISOString(),
        deadline: deadline,
      },
      dispute: {
        arbitrator: 'did:web:arbitrator.org',
        arbitrator_address: '0xArbitratorAddress0000000000000000000000000',
        fee_percent: 5,
      }
    };

    console.log(`[Orchestrator] Lock $25.00 USDC in ACPEscrow on Base for job ${contractId}`);
    return contractId;
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}
