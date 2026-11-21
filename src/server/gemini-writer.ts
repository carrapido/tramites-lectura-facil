import { ThinkingLevel } from '@google/genai';
import { z } from 'zod';

import type { PlainLanguageWriter } from '@/tramites/ports';

import { withCredentialMapping } from './google-errors';

/** A text part or an inline image part of a Gemini message. https://ai.google.dev/api/caching#Part */
export type GenerateContentPart = { text: string } | { inlineData: { data: string; mimeType: string } };

export interface GenerateContentMessage {
  role: 'user';
  parts: GenerateContentPart[];
}

export interface GenerateContentRequest {
  model: string;
  contents: string | GenerateContentMessage[];
  config: { systemInstruction: string; responseMimeType?: string; thinkingConfig?: { thinkingLevel: ThinkingLevel } };
}

/** The subset of `GoogleGenAI.models` the Gemini adapters need. https://github.com/googleapis/js-genai */
export interface GenerateContentClient {
  generateContent(request: GenerateContentRequest): Promise<{ text?: string }>;
}

export const GEMINI_MODEL = 'gemini-3.8-flash';

const INSTRUCTION =
  'Reescribe el texto en español sencillo para una persona mayor. Una sola oración de 15 palabras o menos. Usa "usted". Responde solo con la oración.';

const geminiAnswer = z.object({ text: z.string().trim().min(1) });

export class GeminiPlainLanguageWriter implements PlainLanguageWriter {
  constructor(private readonly client: GenerateContentClient) {}

  async toPlainSpanish(text: string): Promise<string> {
    const response = await withCredentialMapping(() =>
      this.client.generateContent({ model: GEMINI_MODEL, contents: text, config: { systemInstruction: INSTRUCTION } }),
    );
    return geminiAnswer.parse(response).text;
  }
}
