/**
 * @jest-environment node
 */
import { handleSmoke } from '@/server/smoke-handler';
import { CredentialsUnavailableError } from '@/tramites/errors';
import type { PlainLanguageWriter, Translator } from '@/tramites/ports';
import { SMOKE_SENTENCE } from '@/tramites/smoke';

function fakeWriter(result: () => Promise<string>): PlainLanguageWriter & { inputs: string[] } {
  const inputs: string[] = [];
  return {
    inputs,
    toPlainSpanish(text) {
      inputs.push(text);
      return result();
    },
  };
}

function fakeTranslator(result: () => Promise<string>): Translator & { calls: unknown[] } {
  const calls: unknown[] = [];
  return {
    calls,
    translate(request) {
      calls.push(request);
      return result();
    },
  };
}

describe('GET /api/smoke handler (S6)', () => {
  it('returns plain Spanish from the writer and Maya from the translator', async () => {
    const writer = fakeWriter(async () => 'Pague su predial antes del viernes.');
    const translator = fakeTranslator(async () => "Bo'ot a predial.");

    const response = await handleSmoke(() => ({ writer, translator }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      plainSpanish: 'Pague su predial antes del viernes.',
      maya: "Bo'ot a predial.",
    });
    expect(writer.inputs).toEqual([SMOKE_SENTENCE]);
    expect(translator.calls).toEqual([{ text: SMOKE_SENTENCE, from: 'es', to: 'yua' }]);
  });

  it('returns 503 adc-missing with the login command when credentials are missing', async () => {
    const writer = fakeWriter(async () => {
      throw new CredentialsUnavailableError();
    });
    const translator = fakeTranslator(async () => 'unused');

    const response = await handleSmoke(() => ({ writer, translator }));

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: 'adc-missing',
      fix: 'gcloud auth application-default login',
    });
  });

  it('returns 502 upstream-failed when a Google call fails for another reason', async () => {
    const writer = fakeWriter(async () => 'ok');
    const translator = fakeTranslator(async () => {
      throw new Error('boom');
    });

    const response = await handleSmoke(() => ({ writer, translator }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: 'upstream-failed' });
  });

  it('returns 500 config-missing when the environment is invalid', async () => {
    const response = await handleSmoke(() => {
      throw new Error('GOOGLE_CLOUD_PROJECT missing');
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, reason: 'config-missing' });
  });
});
