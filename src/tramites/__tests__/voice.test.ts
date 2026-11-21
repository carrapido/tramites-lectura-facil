import type { AudioCache, VoiceSynthesizer } from '@/tramites/ports';
import { ensureWav, getMayaVoice, MACHINE_VOICE_LABEL, MAX_VOICE_TEXT } from '@/tramites/voice';

const MAYA = "Bo'ot ka'aj 30.";

/** Reads a little-endian ASCII tag such as "RIFF" from the header. */
function tagAt(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(...bytes.slice(offset, offset + 4));
}

function view(bytes: Uint8Array): DataView {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function wavBytes(): Uint8Array {
  const pcm = new Uint8Array([1, 2, 3, 4]);
  return ensureWav(pcm);
}

function fakeSynthesizer(audio: Uint8Array): VoiceSynthesizer & { texts: string[] } {
  const texts: string[] = [];
  return {
    texts,
    async synthesize(text) {
      texts.push(text);
      return audio;
    },
  };
}

function memoryCache(entries: [string, Uint8Array][] = []): AudioCache & { store: Map<string, Uint8Array> } {
  const store = new Map(entries);
  return {
    store,
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, audio) {
      store.set(key, audio);
    },
  };
}

const hash = (text: string) => `hash:${text}`;

describe('voice labels (S2, S5)', () => {
  it('exports the machine voice label for the UI', () => {
    expect(MACHINE_VOICE_LABEL).toBe('Voz automática, sin revisar');
  });

  it('limits a voice text to 300 characters', () => {
    expect(MAX_VOICE_TEXT).toBe(300);
  });
});

describe('ensureWav (S4)', () => {
  it('adds a 44-byte RIFF/WAVE header to headerless 16-bit PCM at 24 kHz mono', () => {
    const pcm = new Uint8Array(480).fill(7);

    const wav = ensureWav(pcm);
    const header = view(wav);

    expect(wav.length).toBe(44 + 480);
    expect(tagAt(wav, 0)).toBe('RIFF');
    expect(header.getUint32(4, true)).toBe(36 + 480);
    expect(tagAt(wav, 8)).toBe('WAVE');
    expect(tagAt(wav, 12)).toBe('fmt ');
    expect(header.getUint32(16, true)).toBe(16);
    expect(header.getUint16(20, true)).toBe(1);
    expect(header.getUint16(22, true)).toBe(1);
    expect(header.getUint32(24, true)).toBe(24000);
    expect(header.getUint32(28, true)).toBe(48000);
    expect(header.getUint16(32, true)).toBe(2);
    expect(header.getUint16(34, true)).toBe(16);
    expect(tagAt(wav, 36)).toBe('data');
    expect(header.getUint32(40, true)).toBe(480);
    expect(Array.from(wav.slice(44))).toEqual(Array.from(pcm));
  });

  it('returns a full WAV unchanged', () => {
    const wav = wavBytes();

    expect(ensureWav(wav)).toEqual(wav);
    expect(ensureWav(wav).length).toBe(48);
  });
});

describe('getMayaVoice (S3, S4)', () => {
  it('synthesizes on a cache miss and stores the WAV under the hash of the text', async () => {
    const synthesizer = fakeSynthesizer(new Uint8Array([9, 9]));
    const cache = memoryCache();

    const audio = await getMayaVoice(MAYA, { synthesizer, cache, hash });

    expect(synthesizer.texts).toEqual([MAYA]);
    expect(tagAt(audio, 0)).toBe('RIFF');
    expect(audio.length).toBe(46);
    expect(cache.store.get(`hash:${MAYA}`)).toEqual(audio);
  });

  it('returns the cached audio without synthesizing again (S3)', async () => {
    const cached = wavBytes();
    const synthesizer = fakeSynthesizer(new Uint8Array([1]));
    const cache = memoryCache([[`hash:${MAYA}`, cached]]);

    const audio = await getMayaVoice(MAYA, { synthesizer, cache, hash });

    expect(audio).toEqual(cached);
    expect(synthesizer.texts).toEqual([]);
  });

  it('pays for the same text only once across two calls (S3)', async () => {
    const synthesizer = fakeSynthesizer(new Uint8Array([5, 5]));
    const dependencies = { synthesizer, cache: memoryCache(), hash };

    await getMayaVoice(MAYA, dependencies);
    await getMayaVoice(MAYA, dependencies);

    expect(synthesizer.texts).toEqual([MAYA]);
  });
});
