import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export interface StoredBlob {
  sha256: string;
  storageKey: string;
  sizeBytes: number;
}

/**
 * Content-addressed blob storage.
 *
 * Deliberately narrow so S3 or GCS can replace it without touching callers.
 * Addressing by hash means identical uploads deduplicate and every reference
 * is self-verifying.
 */
export interface BlobStorage {
  put(data: Buffer): Promise<StoredBlob>;
  get(storageKey: string): Promise<Buffer>;
  delete(storageKey: string): Promise<void>;
}

export class LocalBlobStorage implements BlobStorage {
  constructor(private readonly root: string) {}

  private pathFor(storageKey: string): string {
    // Reject anything that could escape the storage root.
    if (!/^[0-9a-f]{2}\/[0-9a-f]{64}$/.test(storageKey)) {
      throw new Error(`Refusing to resolve unsafe storage key: ${storageKey}`);
    }
    return path.join(this.root, storageKey);
  }

  async put(data: Buffer): Promise<StoredBlob> {
    const sha256 = crypto.createHash('sha256').update(data).digest('hex');
    const storageKey = `${sha256.slice(0, 2)}/${sha256}`;
    const target = this.pathFor(storageKey);

    await fs.mkdir(path.dirname(target), { recursive: true });

    // Content-addressed: an existing file with this name already has this content.
    try {
      await fs.access(target);
    } catch {
      const tmp = `${target}.${crypto.randomBytes(6).toString('hex')}.tmp`;
      await fs.writeFile(tmp, data);
      await fs.rename(tmp, target);
    }

    return { sha256, storageKey, sizeBytes: data.length };
  }

  async get(storageKey: string): Promise<Buffer> {
    return fs.readFile(this.pathFor(storageKey));
  }

  async delete(storageKey: string): Promise<void> {
    await fs.rm(this.pathFor(storageKey), { force: true });
  }
}

export const blobStorage: BlobStorage = new LocalBlobStorage(
  process.env.OAN_BLOB_ROOT || path.join(__dirname, '..', '..', 'data', 'blobs')
);
