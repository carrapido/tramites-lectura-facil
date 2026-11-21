/**
 * @jest-environment node
 */
import { handleVoice } from '@/server/voice-handler';
import { CredentialsUnavailableError } from '@/tramites/errors';
import type { AudioCache, VoiceSynthesizer } from '@/tramites/ports';
import type { VoiceDependencies } from '@/tramites/voice';

const MAYA = "Bo'ot ka'aj 30.";
const PCM = new Uint8Array([1, 0, 2, 0]);

function get(query: string): Request {
  return new Request(`http://laptop/api/voice${query}`);
}

function voiceQuery(text: string): string {
  return `?text=${encodeURIComponent(text)}`;
}

function memoryCache(): AudioCache {
  const store = new Map<string, Uint8Array>();
  return {
    get: async (key) => store.get(key) ?? null,
    set: async (key, audio) => {
      store.set(key, audio);
    },
  };
}

function synthesizer(answer: () => Promise<Uint8Array>): VoiceSynthesizer & { texts: string[] } {
  const texts: string[] = [];
  return {
    texts,
    synthesize: (text) => {
      texts.push(text);
      return answer();
    },
  };
}

function dependencies(voice: VoiceSynthesizer, cache = memoryCache()): VoiceDependencies {
  return { synthesizer: voice, cache, hash: (text) => `h:${text}` };
}

const failing = (error: Error) => synthesizer(() => Promise.reject(error));

afterEach(() => jest.restoreAllMocks());

describe('GET /api/voice (S2, S3, S4)', () => {
  it('returns the Maya audio as a WAV with cache headers (S2, S4)', async () => {
    const voice = synthesizer(async () => PCM);

    const response = await handleVoice(get(voiceQuery(MAYA)), () => dependencies(voice));

    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('audio/wav');
    expect(response.headers.get('Cache-Control')).toBe('private, max-age=86400');
    const body = new Uint8Array(await response.arrayBuffer());
    expect(String.fromCharCode(...body.slice(0, 4))).toBe('RIFF');
    expect(new DataView(body.buffer).getUint32(40, true)).toBe(PCM.length);
    expect(voice.texts).toEqual([MAYA]);
  });

  it('serves the second request for the same text from the cache (S3)', async () => {
    const voice = synthesizer(async () => PCM);
    const shared = dependencies(voice);

    await handleVoice(get(voiceQuery(MAYA)), () => shared);
    const second = await handleVoice(get(voiceQuery(MAYA)), () => shared);

    expect(second.status).toBe(200);
    expect(voice.texts).toEqual([MAYA]);
  });

  it('accepts exactly 300 characters and trims the text', async () => {
    const voice = synthesizer(async () => PCM);
    const text = 'a'.repeat(300);

    const response = await handleVoice(get(voiceQuery(`  ${text}  `)), () => dependencies(voice));

    expect(response.status).toBe(200);
    expect(voice.texts).toEqual([text]);
  });

  it.each([
    ['no text parameter', ''],
    ['an empty text', '?text='],
    ['a blank text', voiceQuery('   ')],
    ['301 characters', voiceQuery('a'.repeat(301))],
  ])('rejects %s with 400 invalid-request', async (_name, query) => {
    const compose = jest.fn(() => dependencies(failing(new Error('unused'))));

    const response = await handleVoice(get(query), compose);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'invalid-request' });
    expect(compose).not.toHaveBeenCalled();
  });

  it('returns 500 config-missing when the server configuration is invalid', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await handleVoice(get(voiceQuery(MAYA)), () => {
      throw new Error('GOOGLE_CLOUD_PROJECT missing');
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, reason: 'config-missing' });
  });

  it('returns 503 adc-missing when Gemini has no credentials', async () => {
    const response = await handleVoice(get(voiceQuery(MAYA)), () =>
      dependencies(failing(new CredentialsUnavailableError())),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: 'adc-missing',
      fix: 'gcloud auth application-default login',
    });
  });

  it('returns 502 upstream-failed when Gemini fails for another reason', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);

    const response = await handleVoice(get(voiceQuery(MAYA)), () => dependencies(failing(new Error('boom'))));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: 'upstream-failed' });
  });
});
