import { z } from 'zod';

import type { PlainLanguageWriter } from '@/tramites/ports';

import { withCredentialMapping } from './google-errors';

/** The subset of `GoogleGenAI.models` this adapter needs. https://github.com/googleapis/js-genai */
export interface GenerateContentClient {
  generateContent(request: { model: string; contents: string; config: { systemInstruction: string } }): Promise<{
    text?: string;
  }>;
}

const MODEL = 'gemini-3.8-flash';

const INSTRUCTION =
  'Reescribe el texto en español sencillo para una persona mayor. Una sola oración de 15 palabras o menos. Usa "usted". Responde solo con la oración.';

const geminiAnswer = z.object({ text: z.string().trim().min(1) });

export class GeminiPlainLanguageWriter implements PlainLanguageWriter {
  constructor(private readonly client: GenerateContentClient) {}

  async toPlainSpanish(text: string): Promise<string> {
    const response = await withCredentialMapping(() =>
      this.client.generateContent({ model: MODEL, contents: text, config: { systemInstruction: INSTRUCTION } }),
    );
    return geminiAnswer.parse(response).text;
  }
}
