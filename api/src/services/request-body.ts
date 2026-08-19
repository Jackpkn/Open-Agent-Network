/**
 * Uploads arrive as raw request bodies. Fastify parses some content types itself
 * (text/plain becomes a string, JSON becomes an object) and hands the rest to the
 * catch-all buffer parser, so normalise before storing.
 */
export function bodyAsBuffer(body: unknown): Buffer | null {
  if (Buffer.isBuffer(body)) return body;
  if (typeof body === 'string') return Buffer.from(body, 'utf8');
  if (body && typeof body === 'object') return Buffer.from(JSON.stringify(body), 'utf8');
  return null;
}
