/**
 * @jest-environment node
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { FileAudioCache } from '@/server/audio-cache';
import { sha256 } from '@/server/hash';

const KEY = sha256("Bo'ot ka'aj 30.");
const AUDIO = new Uint8Array([82, 73, 70, 70, 1, 2]);

let scratch: string;

beforeEach(() => {
  scratch = mkdtempSync(join(tmpdir(), 'voice-cache-'));
});

afterEach(() => {
  jest.restoreAllMocks();
  rmSync(scratch, { recursive: true, force: true });
});

describe('sha256 (S3)', () => {
  it('returns the lowercase hex SHA-256 of the text', () => {
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
});

describe('FileAudioCache (S3)', () => {
  it('returns null for a key it never stored', async () => {
    expect(await new FileAudioCache(join(scratch, 'voice')).get(KEY)).toBeNull();
  });

  it('creates its folder only when it stores audio, as <sha256>.wav', async () => {
    const folder = join(scratch, 'voice');
    const cache = new FileAudioCache(folder);
    expect(existsSync(folder)).toBe(false);

    await cache.set(KEY, AUDIO);

    expect(Array.from(readFileSync(join(folder, `${KEY}.wav`)))).toEqual(Array.from(AUDIO));
    expect(Array.from((await cache.get(KEY)) ?? [])).toEqual(Array.from(AUDIO));
  });

  it('serves audio stored by an earlier instance, as after a dev-server restart', async () => {
    const folder = join(scratch, 'voice');
    await new FileAudioCache(folder).set(KEY, AUDIO);

    const audio = await new FileAudioCache(folder).get(KEY);

    expect(Array.from(audio ?? [])).toEqual(Array.from(AUDIO));
  });

  it('keeps audio in memory and never fails when the disk write fails', async () => {
    const blocker = join(scratch, 'not-a-folder');
    writeFileSync(blocker, 'x');
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const cache = new FileAudioCache(join(blocker, 'voice'));

    await expect(cache.set(KEY, AUDIO)).resolves.toBeUndefined();

    expect(Array.from((await cache.get(KEY)) ?? [])).toEqual(Array.from(AUDIO));
    expect(console.error).toHaveBeenCalled();
  });

  it('defaults to .cache/voice under the working directory, which git ignores', () => {
    expect(new FileAudioCache().folder).toBe(join(process.cwd(), '.cache', 'voice'));
    expect(readFileSync(join(__dirname, '..', '..', '..', '.gitignore'), 'utf8')).toMatch(/^\.cache\/$/m);
  });
});
