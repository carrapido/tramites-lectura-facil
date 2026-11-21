import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { AudioCache } from '@/tramites/ports';

/**
 * Keeps audio in memory and in a git-ignored folder, so a dev-server restart reuses it (S3).
 * Disk failures are logged and never fail a request: the memory copy still serves it.
 */
export class FileAudioCache implements AudioCache {
  private readonly memory = new Map<string, Uint8Array>();

  constructor(readonly folder = join(process.cwd(), '.cache', 'voice')) {}

  async get(key: string): Promise<Uint8Array | null> {
    const remembered = this.memory.get(key);
    if (remembered) return remembered;

    const stored = await readOrNull(this.fileOf(key));
    if (stored) this.memory.set(key, stored);
    return stored;
  }

  async set(key: string, audio: Uint8Array): Promise<void> {
    this.memory.set(key, audio);
    try {
      await mkdir(this.folder, { recursive: true });
      await writeFile(this.fileOf(key), audio);
    } catch (error) {
      console.error('[voice] audio cache write failed', error);
    }
  }

  private fileOf(key: string): string {
    return join(this.folder, `${key}.wav`);
  }
}

/** A missing or unreadable file is a cache miss. */
async function readOrNull(file: string): Promise<Uint8Array | null> {
  try {
    return new Uint8Array(await readFile(file));
  } catch {
    return null;
  }
}
