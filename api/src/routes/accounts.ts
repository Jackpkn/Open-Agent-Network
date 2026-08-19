import { FastifyInstance } from 'fastify';
import { users } from '../services/users.js';
import { ledger } from '../services/ledger.js';
import { currentUser, sendError } from '../services/auth.js';
import { store } from '../services/store.js';
import { formatUsdc } from '../services/money.js';
import { agentKeys } from '../services/agent-keys.js';
import { bearerFrom } from '../services/tokens.js';

export async function accountRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/users
   * Create an account. The API key is returned once and never again.
   */
  fastify.post<{ Body: { email?: string; display_name?: string; opening_balance_usdc?: string } }>(
    '/v1/users',
    async (request, reply) => {
      try {
        const { user, apiKey } = users.create(request.body ?? {});
        return reply.status(201).send({
          user,
          api_key: apiKey,
          message: 'Save this API key now. It cannot be shown again.',
        });
      } catch (err: any) {
        if (String(err?.message).includes('UNIQUE')) {
          return reply.status(409).send({ error: 'email_taken', message: 'That email already has an account.' });
        }
        return sendError(reply, err);
      }
    }
  );

  /** GET /v1/me — the signed-in account and its balance. */
  fastify.get('/v1/me', async (request, reply) => {
    try {
      const user = currentUser(request);
      return reply.send({ user });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /**
   * POST /v1/me/credit
   * Top up a balance. Stands in for a card charge until a payment provider is wired in.
   */
  fastify.post<{ Body: { amount_usdc: string } }>('/v1/me/credit', async (request, reply) => {
    try {
      const user = currentUser(request);
      const amount = request.body?.amount_usdc;
      if (!amount) {
        return reply.status(400).send({ error: 'invalid_request', message: 'Specify amount_usdc.' });
      }
      return reply.send({ user: users.credit(user.id, amount) });
    } catch (err) {
      return sendError(reply, err);
    }
  });

  /** GET /v1/agents/:id/earnings — what an agent has earned and can claim. */
  fastify.get<{ Params: { id: string } }>('/v1/agents/:id/earnings', async (request, reply) => {
    const agentId = Number.parseInt(request.params.id, 10);
    const agent = store.getAgent(agentId);
    if (!agent) return reply.status(404).send({ error: 'not_found', message: 'No such agent.' });

    return reply.send({
      agent_id: agentId,
      agent_name: agent.agent_card?.name,
      claimable_usdc: formatUsdc(ledger.claimable(agentId)),
      lifetime_usdc: formatUsdc(ledger.lifetime(agentId)),
    });
  });

  /**
   * POST /v1/agents/:id/withdraw
   * Claim what this agent has earned. Requires the payout key issued at registration.
   *
   * This records the payout and zeroes the claimable balance; it does not itself
   * move funds. A payment rail or an on-chain withdrawal settles against the record.
   */
  fastify.post<{ Params: { id: string }; Body: { destination?: string } }>(
    '/v1/agents/:id/withdraw',
    async (request, reply) => {
      const agentId = Number.parseInt(request.params.id, 10);
      const agent = store.getAgent(agentId);
      if (!agent) return reply.status(404).send({ error: 'not_found', message: 'No such agent.' });

      const key =
        bearerFrom(request.headers.authorization) ??
        (typeof request.headers['x-agent-key'] === 'string' ? request.headers['x-agent-key'] : undefined);

      if (!agentKeys.verify(agentId, key)) {
        return reply.status(401).send({
          error: 'unauthorized',
          message: 'Provide the payout key issued when this agent was registered.',
        });
      }

      const destination = request.body?.destination?.trim();
      if (!destination) {
        return reply.status(400).send({
          error: 'invalid_request',
          message: 'Say where the payout should go (a wallet address or account reference).',
        });
      }

      const payout = ledger.recordPayout(agentId, destination);
      if (!payout) {
        return reply.status(409).send({
          error: 'nothing_to_withdraw',
          message: 'This agent has no earnings to claim right now.',
        });
      }

      return reply.status(201).send({
        payout: { ...payout, destination, status: 'recorded' },
        message: `Recorded a payout of ${payout.amount_usdc} USDC to ${destination}.`,
      });
    }
  );

  /** GET /v1/agents/:id/payouts — what has been claimed, and when. */
  fastify.get<{ Params: { id: string } }>('/v1/agents/:id/payouts', async (request, reply) => {
    const agentId = Number.parseInt(request.params.id, 10);
    return reply.send({ payouts: ledger.payoutsFor(agentId) });
  });
}
