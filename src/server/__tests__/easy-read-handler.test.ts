/**
 * @jest-environment node
 */
import { CloudTranslator, type TranslateTextClient } from '@/server/cloud-translator';
import { handleEasyRead } from '@/server/easy-read-handler';
import { CredentialsUnavailableError } from '@/tramites/errors';
import type { BatchTranslator, Fact, PlainLanguageWriter } from '@/tramites/ports';

function post(body: unknown): Request {
  return new Request('http://laptop/api/easy-read', { method: 'POST', body: JSON.stringify(body) });
}

const FACTS: Fact[] = [
  { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
  {
    kind: 'lugar',
    text: 'Vaya a la Tesorería Municipal.',
    sourceQuote: 'Deberá presentarse en la Tesorería Municipal',
    box: { x: 0.05, y: 0.4, width: 0.9, height: 0.1 },
  },
];

const writer: PlainLanguageWriter = { toPlainSpanish: async () => 'Texto corto.' };

function translationClient(answer: () => Promise<unknown>): TranslateTextClient & { requests: unknown[] } {
  const requests: unknown[] = [];
  return {
    requests,
    translateText: (request) => {
      requests.push(request);
      return answer();
    },
  };
}

function composeWith(translator: BatchTranslator) {
  return jest.fn(() => ({ writer, translator }));
}

const failingTranslator = (error: Error): BatchTranslator => ({
  translateAll: async () => {
    throw error;
  },
});

describe('POST /api/easy-read (S1, S2, S4, S5)', () => {
  it('returns one card per fact with Maya from a single translateText call (S2, S4)', async () => {
    const client = translationClient(async () => [
      { translations: [{ translatedText: "Bo'ot ka'aj 30." }, { translatedText: 'Xi’ik Tesorería.' }] },
    ]);

    const response = await handleEasyRead(post({ facts: FACTS }), composeWith(new CloudTranslator(client, 'p')));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      cards: [
        {
          kind: 'fecha',
          plainSpanish: 'Pague antes del 30 de noviembre.',
          maya: "Bo'ot ka'aj 30.",
          mayaStatus: 'machine-unreviewed',
          sourceQuote: 'vence el día 30 de noviembre de 2026',
        },
        {
          kind: 'lugar',
          plainSpanish: 'Vaya a la Tesorería Municipal.',
          maya: 'Xi’ik Tesorería.',
          mayaStatus: 'machine-unreviewed',
          sourceQuote: 'Deberá presentarse en la Tesorería Municipal',
          box: { x: 0.05, y: 0.4, width: 0.9, height: 0.1 },
        },
      ],
    });
    expect(client.requests).toEqual([
      expect.objectContaining({
        contents: ['Pague antes del 30 de noviembre.', 'Vaya a la Tesorería Municipal.'],
        mimeType: 'text/plain',
        sourceLanguageCode: 'es',
        targetLanguageCode: 'yua',
      }),
    ]);
  });

  it.each([
    ['no facts key', {}],
    ['an empty list', { facts: [] }],
    ['more than 7 facts', { facts: Array.from({ length: 8 }, () => FACTS[0]) }],
    ['a fact without sourceQuote', { facts: [{ kind: 'fecha', text: 'x' }] }],
    ['a fact with an empty text', { facts: [{ ...FACTS[0], text: '' }] }],
    ['a box outside 0..1', { facts: [{ ...FACTS[0], box: { x: 2, y: 0, width: 1, height: 1 } }] }],
  ])('rejects %s with 400 invalid-request (S1)', async (_name, body) => {
    const compose = composeWith(failingTranslator(new Error('unused')));

    const response = await handleEasyRead(post(body), compose);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'invalid-request' });
    expect(compose).not.toHaveBeenCalled();
  });

  it('rejects a body that is not JSON with 400 invalid-request (S1)', async () => {
    const request = new Request('http://laptop/api/easy-read', { method: 'POST', body: '{not json' });

    const response = await handleEasyRead(request, composeWith(failingTranslator(new Error('unused'))));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'invalid-request' });
  });

  it('rejects a declared Content-Length above 64 KB before reading the body (S1)', async () => {
    const compose = composeWith(failingTranslator(new Error('unused')));
    const request = new Request('http://laptop/api/easy-read', {
      method: 'POST',
      headers: { 'Content-Length': String(64 * 1024 + 1) },
      body: JSON.stringify({ facts: FACTS }),
    });

    const response = await handleEasyRead(request, compose);

    expect(response.status).toBe(400);
    expect(request.bodyUsed).toBe(false);
    expect(compose).not.toHaveBeenCalled();
  });

  it('returns 200 with maya null and status unavailable when Translation fails (S5)', async () => {
    const response = await handleEasyRead(
      post({ facts: FACTS }),
      composeWith(failingTranslator(new Error('PERMISSION_DENIED'))),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.cards).toEqual([
      expect.objectContaining({ plainSpanish: 'Pague antes del 30 de noviembre.', maya: null, mayaStatus: 'unavailable' }),
      expect.objectContaining({ plainSpanish: 'Vaya a la Tesorería Municipal.', maya: null, mayaStatus: 'unavailable' }),
    ]);
  });

  it('returns 503 adc-missing when Translation has no credentials (S5)', async () => {
    const response = await handleEasyRead(
      post({ facts: FACTS }),
      composeWith(failingTranslator(new CredentialsUnavailableError())),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: 'adc-missing',
      fix: 'gcloud auth application-default login',
    });
  });

  it('returns 502 upstream-failed when the writer fails for another reason', async () => {
    const longFact = { ...FACTS[0], text: 'uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince dieciséis' };
    const failingWriter: PlainLanguageWriter = {
      toPlainSpanish: async () => {
        throw new Error('boom');
      },
    };

    const response = await handleEasyRead(post({ facts: [longFact] }), () => ({
      writer: failingWriter,
      translator: failingTranslator(new Error('unused')),
    }));

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: 'upstream-failed' });
  });

  it('returns 500 config-missing when the server configuration is invalid', async () => {
    const response = await handleEasyRead(post({ facts: FACTS }), () => {
      throw new Error('GOOGLE_CLOUD_PROJECT missing');
    });

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, reason: 'config-missing' });
  });
});
