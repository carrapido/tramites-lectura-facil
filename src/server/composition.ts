import { TranslationServiceClient } from '@google-cloud/translate';
import { GoogleGenAI } from '@google/genai';

import type { SmokeDependencies } from '@/tramites/smoke';

import { CloudTranslator } from './cloud-translator';
import { GeminiPlainLanguageWriter } from './gemini-writer';
import { readGoogleEnv } from './google-env';

/** Wires real Google adapters with Application Default Credentials. No API keys. */
export function composeSmokeDependencies(): SmokeDependencies {
  const { project, location } = readGoogleEnv(process.env);
  // vertexai: true routes Gemini through Agent Platform (Vertex AI). https://github.com/googleapis/js-genai
  const genai = new GoogleGenAI({ vertexai: true, project, location });
  const translation = new TranslationServiceClient();
  return {
    writer: new GeminiPlainLanguageWriter(genai.models),
    translator: new CloudTranslator(translation, project),
  };
}
