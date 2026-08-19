import { FastifyInstance } from 'fastify';
import { artifacts } from '../services/artifacts.js';
import { currentUser, sendError } from '../services/auth.js';
import { config } from '../services/config.js';
import { bodyAsBuffer } from '../services/request-body.js';

export async function uploadRoutes(fastify: FastifyInstance) {
  /**
   * POST /v1/uploads
   * Send the file as the raw request body, with its type in Content-Type and its
   * name in X-Filename. The response describes the stored artifact, including the
   * SHA-256 the worker will verify it against.
   */
  fastify.post(
    '/v1/uploads',
    { bodyLimit: config.maxUploadBytes },
    async (request, reply) => {
      try {
        const user = currentUser(request);
        const body = bodyAsBuffer(request.body);

        if (!body) {
          return reply.status(400).send({
            error: 'invalid_request',
            message: 'Send the file as the raw request body with its Content-Type set.',
          });
        }

        const filenameHeader = request.headers['x-filename'];
        const record = await artifacts.create({
          data: body,
          filename: typeof filenameHeader === 'string' ? filenameHeader : 'upload',
          mime: request.headers['content-type'] || 'application/octet-stream',
          kind: 'input',
          ownerUserId: user.id,
        });

        return reply.status(201).send({ artifact: artifacts.describe(record) });
      } catch (err) {
        return sendError(reply, err);
      }
    }
  );

  /** GET /v1/artifacts/:id — download a file you own. */
  fastify.get<{ Params: { id: string } }>('/v1/artifacts/:id', async (request, reply) => {
    try {
      const user = currentUser(request);
      const record = artifacts.get(request.params.id);

      if (!record || (record.owner_user_id && record.owner_user_id !== user.id)) {
        return reply.status(404).send({ error: 'not_found', message: 'No such file.' });
      }
      if (record.deleted_at) {
        return reply.status(410).send({
          error: 'expired',
          message: 'This file was deleted under its retention policy.',
        });
      }

      const { data } = await artifacts.read(record.id);
      return reply
        .header('Content-Type', record.mime)
        .header('Content-Disposition', `attachment; filename="${record.filename}"`)
        .header('X-Content-SHA256', record.sha256)
        .send(data);
    } catch (err) {
      return sendError(reply, err);
    }
  });
}
