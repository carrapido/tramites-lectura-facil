/**
 * @jest-environment node
 */
import { z } from 'zod';

import { GeminiNoticeReader } from '@/server/gemini-notice-reader';
import type { GenerateContentClient } from '@/server/gemini-writer';
import { handleRead } from '@/server/read-handler';

const IMAGE = { base64: 'QUJD', mimeType: 'image/jpeg' as const };
const TRANSCRIPT = 'El recibo vence el día 30 de noviembre de 2026.';
const FACTS = [{ kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' }];

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

async function readWith(answer: unknown): Promise<Response> {
  const request = new Request('http://laptop/api/read', {
    method: 'POST',
    body: JSON.stringify({ imageBase64: IMAGE.base64, mimeType: IMAGE.mimeType }),
  });
  return handleRead(request, () => new GeminiNoticeReader(geminiAnswering(answer)));
}

const NO_TEXT = { textFound: false, readable: false, transcript: '', facts: [] };

describe('GeminiNoticeReader without text (S4 amended from L7)', () => {
  it('reports no text and the trimmed description of what the photo shows', async () => {
    const reading = await new GeminiNoticeReader(geminiAnswering({ ...NO_TEXT, seen: '  una taza de café  ' })).read(IMAGE);

    expect(reading.textFound).toBe(false);
    expect(reading.seen).toBe('una taza de café');
  });

  it.each([
    ['empty', '   '],
    ['too long', 'un '.repeat(30)],
    ['not text', 42],
  ])('drops a description that is %s', async (_name, seen) => {
    const reading = await new GeminiNoticeReader(geminiAnswering({ ...NO_TEXT, seen })).read(IMAGE);

    expect(reading.textFound).toBe(false);
    expect(reading.seen).toBeUndefined();
  });

  it('keeps today behavior when Gemini does not say whether there is text', async () => {
    const reading = await new GeminiNoticeReader(
      geminiAnswering({ readable: true, transcript: TRANSCRIPT, facts: FACTS }),
    ).read(IMAGE);

    expect(reading.textFound).not.toBe(false);
    expect(reading.facts).toEqual(FACTS);
  });

  it('never marks a photo without text as readable', async () => {
    const reading = await new GeminiNoticeReader(geminiAnswering({ ...NO_TEXT, readable: true })).read(IMAGE);

    expect(reading.readable).toBe(false);
  });

  it('asks Gemini whether the photo has text and for a short Spanish description without names', async () => {
    const gemini = geminiAnswering({ readable: true, transcript: TRANSCRIPT, facts: FACTS });
    await new GeminiNoticeReader(gemini).read(IMAGE);
    const text = z.object({ config: z.object({ systemInstruction: z.string() }) }).parse(gemini.requests[0]).config.systemInstruction;

    expect(text).toContain('"textFound"');
    expect(text).toContain('"seen"');
    expect(text).toContain('una taza de café');
    expect(text).toMatch(/nombres/);
  });
});

describe('POST /api/read without text (S4 amended from L7)', () => {
  it('returns 422 no-text with what the photo shows', async () => {
    const response = await readWith({ ...NO_TEXT, seen: 'un perro en un sillón' });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, reason: 'no-text', seen: 'un perro en un sillón' });
  });

  it('returns 422 no-text without seen when there is no description', async () => {
    const response = await readWith(NO_TEXT);

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, reason: 'no-text' });
  });

  it('keeps 422 unreadable for blurry text', async () => {
    const response = await readWith({ textFound: true, readable: false, transcript: '', facts: [] });

    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ ok: false, reason: 'unreadable' });
  });

  it('returns the facts when the photo has text', async () => {
    const response = await readWith({ textFound: true, readable: true, category: 'tramite', transcript: TRANSCRIPT, facts: FACTS });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, category: 'tramite', facts: FACTS });
  });
});
