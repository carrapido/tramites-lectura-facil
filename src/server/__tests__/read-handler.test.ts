/**
 * @jest-environment node
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

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
    expect(await response.json()).toEqual({ ok: true, category: 'otro', facts: FACTS });
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

const requestWithInstruction = z.object({ config: z.object({ systemInstruction: z.string() }) });

function systemInstructionOf(request: unknown): string {
  return requestWithInstruction.parse(request).config.systemInstruction;
}

async function readWith(answer: unknown): Promise<Response> {
  return handleRead(post({ imageBase64: PHOTO, mimeType: 'image/jpeg' }), () => new GeminiNoticeReader(geminiAnswering(answer)));
}

describe('POST /api/read category (context-categories S2)', () => {
  it('returns the category Gemini chose with the facts', async () => {
    const response = await readWith({ readable: true, category: 'reunion', transcript: TRANSCRIPT, facts: FACTS });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, category: 'reunion', facts: FACTS });
  });

  it.each([
    ['an unknown category', 'banco'],
    ['a number', 3],
    ['null', null],
  ])('turns %s into otro instead of failing', async (_name, category) => {
    const response = await readWith({ readable: true, category, transcript: TRANSCRIPT, facts: FACTS });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, category: 'otro', facts: FACTS });
  });

  it('accepts the category written with capitals and accents', async () => {
    const response = await readWith({ readable: true, category: ' Trámite ', transcript: TRANSCRIPT, facts: FACTS });

    expect(await response.json()).toEqual({ ok: true, category: 'tramite', facts: FACTS });
  });
});

describe('GeminiNoticeReader instruction (context-categories S2, S3)', () => {
  async function instruction(): Promise<string> {
    const gemini = geminiAnswering({ readable: true, category: 'nota', transcript: TRANSCRIPT, facts: FACTS });
    await new GeminiNoticeReader(gemini).read({ base64: PHOTO, mimeType: 'image/jpeg' });
    return systemInstructionOf(gemini.requests[0]);
  }

  it('asks for one of the five categories, each explained', async () => {
    const text = await instruction();

    for (const category of ['tramite', 'reunion', 'salud', 'nota', 'otro']) expect(text).toContain(`"${category}"`);
    expect(text).toContain('"category"');
    expect(text).toMatch(/invitación/);
    expect(text).toMatch(/receta/);
    expect(text).toMatch(/cita médica/);
    expect(text).toMatch(/escuela/);
  });

  it('reads any paper instead of framing everything as an official notice', async () => {
    const text = await instruction();

    expect(text).toContain('Lee la foto de un papel');
    expect(text).not.toContain('Lee la foto de un aviso oficial');
    expect(text).toContain('de 3 a 7 hechos');
    expect(text).toContain('"sourceQuote" es un fragmento copiado exactamente de "transcript"');
  });
});
