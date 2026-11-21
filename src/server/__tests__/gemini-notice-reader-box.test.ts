/**
 * @jest-environment node
 */
import { GeminiNoticeReader } from '@/server/gemini-notice-reader';
import type { GenerateContentClient } from '@/server/gemini-writer';

const IMAGE = { base64: 'QUJD', mimeType: 'image/jpeg' as const };
const TRANSCRIPT = 'Fecha: sábado 5 de diciembre de 2026, a las 17:00 horas.';

function geminiAnswering(box: unknown): GenerateContentClient {
  const fact = { kind: 'fecha', text: 'La reunión es el sábado 5.', sourceQuote: TRANSCRIPT, box };
  return { generateContent: async () => ({ text: JSON.stringify({ readable: true, category: 'reunion', transcript: TRANSCRIPT, facts: [fact] }) }) };
}

describe('GeminiNoticeReader box handling (the second photo failed on a 0–1000 box)', () => {
  it('converts a box Gemini sends on its 0–1000 scale to 0–1 instead of failing the reading', async () => {
    const reading = await new GeminiNoticeReader(geminiAnswering({ x: 120, y: 340, width: 600, height: 80 })).read(IMAGE);

    expect(reading.facts[0].box).toEqual({ x: 0.12, y: 0.34, width: 0.6, height: 0.08 });
  });

  it('keeps a box that is already on the 0–1 scale', async () => {
    const reading = await new GeminiNoticeReader(geminiAnswering({ x: 0.1, y: 0.2, width: 0.5, height: 0.1 })).read(IMAGE);

    expect(reading.facts[0].box).toEqual({ x: 0.1, y: 0.2, width: 0.5, height: 0.1 });
  });

  it('drops a box that makes no sense and keeps the fact', async () => {
    const reading = await new GeminiNoticeReader(geminiAnswering({ x: -5, y: 'top', width: 9000 })).read(IMAGE);

    expect(reading.facts).toHaveLength(1);
    expect(reading.facts[0].box).toBeUndefined();
    expect(reading.facts[0].text).toBe('La reunión es el sábado 5.');
  });
});
