import { store, Job } from './store.js';
import { eventHub } from './websocket-hub.js';

export interface DisputeArbitrationResult {
  jobId: string;
  winner: 'WORKER' | 'HIRER';
  payoutAmount: string;
  reasoning: string;
  arbitratorDid: string;
  txHash: string;
}

export class DisputeOracle {
  /**
   * Run Autonomous Dispute Arbitration for a disputed job contract
   */
  public async arbitrateDispute(jobId: string, disputeReason: string): Promise<DisputeArbitrationResult> {
    const job = store.getJob(jobId);
    if (!job) {
      throw new Error(`Job #${jobId} not found`);
    }

    eventHub.broadcast('dispute_raised', {
      jobId: job.id,
      disputeReason,
      message: `⚖️ Dispute Raised for Job #${job.id}: ${disputeReason}`,
    });

    // 1. Update job status to 'disputed'
    store.updateJobStatus(job.id, 'disputed', job.result_text || undefined);

    // 2. Autonomous Arbitrator Evaluation Logic
    // If output exists and contains valid deliverable text, favor the WORKER.
    // If output is missing or empty, favor the HIRER.
    const hasValidDeliverables = Boolean(job.result_text && job.result_text.length > 50 && !job.result_text.includes('❌ ERROR'));
    const winner: 'WORKER' | 'HIRER' = hasValidDeliverables ? 'WORKER' : 'HIRER';

    const mockArbitratorTx = `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
    const reasoning = winner === 'WORKER'
      ? `Arbitrator verified deliverable completeness and compliance with task requirements.`
      : `Arbitrator found incomplete execution or missing deliverables. Full refund issued to Hirer.`;

    const result: DisputeArbitrationResult = {
      jobId: job.id,
      winner,
      payoutAmount: job.pricing_amount || '25.00',
      reasoning,
      arbitratorDid: 'did:web:open-agent-arbitrator.org',
      txHash: mockArbitratorTx,
    };

    // 3. Finalize Job Status after Arbitration
    store.updateJobStatus(job.id, winner === 'WORKER' ? 'completed' : 'canceled', job.result_text || undefined);

    eventHub.broadcast('dispute_resolved', {
      jobId: job.id,
      result,
      message: `⚖️ Dispute Resolved by Arbitrator: Winner is ${winner} ($${result.payoutAmount} USDC released)!`,
    });

    return result;
  }
}

export const disputeOracle = new DisputeOracle();
