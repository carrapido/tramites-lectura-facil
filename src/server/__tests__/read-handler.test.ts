/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { GeminiNoticeReader } from '@/server/gemini-notice-reader';
import type { GenerateContentClient } from '@/server/gemini-writer';
import { handleRead } from '@/server/read-handler';
import { CredentialsUnavailableError } from '@/tramites/errors';
import type { NoticeReader } from '@/tramites/ports';

const FIXTURES = join(__dirname, '..', '..', '..', 'fixtures');
const TRANSCRIPT = readFileSync(join(FIXTURES, 'aviso-ficticio.txt'), 'utf8');
const PHOTO = readFileSync(join(FIXTURES, 'aviso-ficticio.jpg')).toString('base64');

function post(body: unknown): Request {
  return new Request('http://laptop/api/read', { method: 'POST', body: JSON.stringify(body) });
}

function geminiAnswering(answer: unknown): GenerateContentClient & { requests: unknown[] } {
  const requests: unknown[] = [];
  return {
    requests,
    generateContent: async (request) => {
      requests.push(request);
      return { text: JSON.stringify(answer) };
    },
  };
}

const FACTS = [
  { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' },
  { kind: 'monto', text: 'Debe pagar 1,250 pesos.', sourceQuote: 'El monto a pagar es de $1,250.00' },
  {
    kind: 'lugar',
    text: 'Vaya a la Tesorería Municipal.',
    sourceQuote: 'Deberá presentarse en la Tesorería Municipal',
    box: { x: 0.05, y: 0.4, width: 0.9, height: 0.1 },
  },
];

describe('POST /api/read end to end with a fake Gemini (S1, S2, S5)', () => {
  it('returns the traceable facts read from the fictitious notice', async () => {
    const gemini = geminiAnswering({ readable: true, transcript: TRANSCRIPT, facts: FACTS });

    const response = await handleRead(post({ imageBase64: PHOTO, mimeType: 'image/jpeg' }), () => new GeminiNoticeReader(gemini));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, facts: FACTS });
    expect(gemini.requests).toEqual([expect.objectContaining({ model: 'gemini-3.8-flash' })]);
    expect(JSON.stringify(gemini.requests[0])).toContain(PHOTO.slice(0, 64));
  });

  it('rejects a body without an image with 400 and the reason (S1)', async () => {
    const response = await handleRead(post({ mimeType: 'image/jpeg' }), () => new GeminiNoticeReader(geminiAnswering({})));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'invalid-request' });
  });

  it('rejects an unsupported image type with 400 (S1)', async () => {
    const response = await handleRead(post({ imageBase64: PHOTO, mimeType: 'image/gif' }), () =>
      new GeminiNoticeReader(geminiAnswering({})),
    );
    expect(response.status).toBe(400);
  });

  it('rejects a photo above 4 MB with 400 (S1)', async () => {
    const huge = 'A'.repeat(Math.ceil((4 * 1024 * 1024 * 4) / 3) + 8);
    const response = await handleRead(post({ imageBase64: huge, mimeType: 'image/jpeg' }), () =>
      new GeminiNoticeReader(geminiAnswering({})),
    );
    expect(response.status).toBe(400);
  });

  it('returns 502 when Gemini output does not match the schema (S2)', async () => {
    const gemini = geminiAnswering({ readable: true, transcript: TRANSCRIPT, facts: [{ text: 'sin cita' }] });
    const response = await handleRead(post({ imageBase64: PHOTO, mimeType: 'image/jpeg' }), () => new GeminiNoticeReader(gemini));
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ ok: false, reason: 'upstream-failed' });
  });

  it('returns 502 when Gemini returns more than 7 facts (S2)', async () => {
    const many = Array.from({ length: 8 }, () => FACTS[0]);
    const gemini = geminiAnswering({ readable: true, transcript: TRANSCRIPT, facts: many });
    const response = await handleRead(post({ imageBase64: PHOTO, mimeType: 'image/jpeg' }), () => new GeminiNoticeReader(gemini));
    expect(response.status).toBe(502);
  });

  it('returns 422 unreadable for an unreadable photo (S4)', async () => {
    const gemini = geminiAnswering({ readable: false, transcript: '', facts: [] });
    const response = await handleRead(post({ imageBase64: PHOTO, mimeType: 'image/jpeg' }), () => new GeminiNoticeReader(gemini));
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('returns 503 adc-missing when credentials are missing', async () => {
    const reader: NoticeReader = {
      read: async () => {
        throw new CredentialsUnavailableError();
      },
    };
    const response = await handleRead(post({ imageBase64: PHOTO, mimeType: 'image/jpeg' }), () => reader);
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      ok: false,
      reason: 'adc-missing',
      fix: 'gcloud auth application-default login',
    });
  });

  it('returns 500 config-missing when the server configuration is invalid', async () => {
    const response = await handleRead(post({ imageBase64: PHOTO, mimeType: 'image/jpeg' }), () => {
      throw new Error('GOOGLE_CLOUD_PROJECT missing');
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ ok: false, reason: 'config-missing' });
  });

  it('rejects a declared Content-Length above the cap with 400 before reading the body (S1)', async () => {
    const compose = jest.fn(() => new GeminiNoticeReader(geminiAnswering({ readable: true, transcript: TRANSCRIPT, facts: FACTS })));
    const request = new Request('http://laptop/api/read', {
      method: 'POST',
      headers: { 'Content-Length': String(6 * 1024 * 1024) },
      body: JSON.stringify({ imageBase64: PHOTO, mimeType: 'image/jpeg' }),
    });

    const response = await handleRead(request, compose);

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, reason: 'invalid-request' });
    expect(request.bodyUsed).toBe(false);
    expect(compose).not.toHaveBeenCalled();
  });
});
