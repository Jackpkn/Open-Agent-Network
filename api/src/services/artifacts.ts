import { getDb } from './store.js';
import { initProtocolSchema } from './schema.js';
import { newId } from './tokens.js';
import { blobStorage } from './blob-storage.js';
import { config } from './config.js';

export interface ArtifactRecord {
  id: string;
  owner_user_id: string | null;
  job_id: string | null;
  kind: 'input' | 'output';
  filename: string;
  mime: string;
  size_bytes: number;
  sha256: string;
  storage_key: string;
  created_at: string;
  expires_at: string | null;
  deleted_at: string | null;
}

export class ArtifactTooLarge extends Error {
  constructor(size: number) {
    super(
      `File is ${(size / 1048576).toFixed(1)} MB. The limit is ${(config.maxUploadBytes / 1048576).toFixed(0)} MB.`
    );
    this.name = 'ArtifactTooLarge';
  }
}

/** Strip anything that could be read as a path or a control sequence. */
function safeFilename(raw: string | undefined): string {
  const base = (raw || 'file').split(/[\\/]/).pop() || 'file';
  const cleaned = base.replace(/[\x00-\x1F\x7F]/g, '').trim();
  return (cleaned || 'file').slice(0, 200);
}

/**
 * Files moving through the protocol.
 *
 * A task input is no longer a prompt string: it is a content-addressed artifact
 * the hub holds and hands to exactly one worker through a scoped, expiring token.
 * Outputs come back the same way, so a delivered result can be hash-verified
 * against what the worker claimed to produce.
 */
class ArtifactService {
  private get db() {
    initProtocolSchema();
    return getDb();
  }

  async create(input: {
    data: Buffer;
    filename?: string;
    mime?: string;
    kind: 'input' | 'output';
    ownerUserId?: string | null;
    jobId?: string | null;
  }): Promise<ArtifactRecord> {
    if (input.data.length === 0) throw new Error('Refusing to store an empty file');
    if (input.data.length > config.maxUploadBytes) throw new ArtifactTooLarge(input.data.length);

    const blob = await blobStorage.put(input.data);
    const id = newId('art');

    this.db
      .prepare(
        `INSERT INTO artifacts (id, owner_user_id, job_id, kind, filename, mime, size_bytes, sha256, storage_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        id,
        input.ownerUserId ?? null,
        input.jobId ?? null,
        input.kind,
        safeFilename(input.filename),
        input.mime || 'application/octet-stream',
        blob.sizeBytes,
        blob.sha256,
        blob.storageKey
      );

    return this.get(id)!;
  }

  get(id: string): ArtifactRecord | undefined {
    const row = this.db.prepare('SELECT * FROM artifacts WHERE id = ?').get(id) as any;
    return row ?? undefined;
  }

  /** Read the bytes back for a caller that has already been authorised. */
  async read(id: string): Promise<{ record: ArtifactRecord; data: Buffer }> {
    const record = this.get(id);
    if (!record) throw new Error(`Artifact ${id} not found`);
    if (record.deleted_at) {
      throw new Error(`Artifact ${id} was deleted under its retention policy`);
    }

    const data = await blobStorage.get(record.storage_key);
    return { record, data };
  }

  /** Attach an unbound upload to a job at hire time. */
  bindToJob(id: string, jobId: string): void {
    this.db.prepare('UPDATE artifacts SET job_id = ? WHERE id = ? AND job_id IS NULL').run(jobId, id);
  }

  listForJob(jobId: string, kind?: 'input' | 'output'): ArtifactRecord[] {
    const sql = kind
      ? 'SELECT * FROM artifacts WHERE job_id = ? AND kind = ? AND deleted_at IS NULL ORDER BY created_at ASC'
      : 'SELECT * FROM artifacts WHERE job_id = ? AND deleted_at IS NULL ORDER BY created_at ASC';
    return (kind
      ? this.db.prepare(sql).all(jobId, kind)
      : this.db.prepare(sql).all(jobId)) as ArtifactRecord[];
  }

  /** Start the retention clock once a job reaches a terminal state. */
  scheduleExpiry(jobId: string): void {
    const expiresAt = new Date(Date.now() + config.artifactTtlSeconds * 1000).toISOString();
    this.db
      .prepare('UPDATE artifacts SET expires_at = ? WHERE job_id = ? AND expires_at IS NULL')
      .run(expiresAt, jobId);
  }

  /**
   * Delete blobs past their retention date. Rows survive with `deleted_at` set,
   * so a receipt still resolves to a hash and a filename after the bytes are gone.
   */
  async purgeExpired(now = new Date()): Promise<number> {
    const due = this.db
      .prepare(
        `SELECT * FROM artifacts WHERE deleted_at IS NULL AND expires_at IS NOT NULL AND expires_at <= ?`
      )
      .all(now.toISOString()) as ArtifactRecord[];

    for (const record of due) {
      // Storage is content-addressed, so only remove bytes nothing else points at.
      const others = this.db
        .prepare(
          'SELECT COUNT(*) AS n FROM artifacts WHERE storage_key = ? AND deleted_at IS NULL AND id != ?'
        )
        .get(record.storage_key, record.id) as any;

      if (!others || others.n === 0) {
        await blobStorage.delete(record.storage_key).catch(() => undefined);
      }
      this.db
        .prepare(`UPDATE artifacts SET deleted_at = strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id = ?`)
        .run(record.id);
    }

    return due.length;
  }

  /** The safe subset of an artifact to show a hirer or hand to a worker. */
  describe(record: ArtifactRecord) {
    return {
      id: record.id,
      filename: record.filename,
      mime: record.mime,
      size_bytes: record.size_bytes,
      sha256: record.sha256,
      created_at: record.created_at,
    };
  }
}

export const artifacts = new ArtifactService();
