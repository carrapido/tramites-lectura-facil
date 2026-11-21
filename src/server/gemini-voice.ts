import { Modality } from '@google/genai';
import { z } from 'zod';

import type { VoiceSynthesizer } from '@/tramites/ports';

import { withCredentialMapping } from './google-errors';

/**
 * A text-to-speech request. 3.8 TTS rejects systemInstruction, temperature, topP and topK,
 * so the style travels in the part's speechMetadata. https://docs.cloud.google.com/text-to-speech/docs/gemini-tts
 */
export interface GenerateSpeechRequest {
  model: string;
  contents: { role: 'user'; parts: { text: string; speechMetadata: { style: string } }[] }[];
  config: {
    responseModalities: Modality[];
    speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: string } } };
  };
}

/** The subset of `GoogleGenAI.models` the voice adapter needs. https://github.com/googleapis/js-genai */
export interface GenerateSpeechClient {
  generateContent(request: GenerateSpeechRequest): Promise<unknown>;
}

/** Cheapest 3.8 TTS model; it runs on the `global` location. */
export const GEMINI_TTS_MODEL = 'gemini-3.8-flash-lite-tts';

const VOICE_NAME = 'Kore';

const STYLE = 'Slow and clear, for an older listener.';

/** The audio arrives base64-encoded in the first part. https://ai.google.dev/api/caching#Blob */
const speechAnswer = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({ parts: z.array(z.object({ inlineData: z.object({ data: z.base64().min(1) }) })).min(1) }),
      }),
    )
    .min(1),
});

export class GeminiVoiceSynthesizer implements VoiceSynthesizer {
  constructor(private readonly client: GenerateSpeechClient) {}

  async synthesize(text: string): Promise<Uint8Array> {
    const response = await withCredentialMapping(() => this.client.generateContent(speechRequest(text)));
    const base64 = speechAnswer.parse(response).candidates[0].content.parts[0].inlineData.data;
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
}

function speechRequest(text: string): GenerateSpeechRequest {
  return {
    model: GEMINI_TTS_MODEL,
    contents: [{ role: 'user', parts: [{ text, speechMetadata: { style: STYLE } }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } } },
    },
  };
}
