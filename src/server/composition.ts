import { TranslationServiceClient } from '@google-cloud/translate';
import { GoogleGenAI } from '@google/genai';

import type { NoticeReader } from '@/tramites/ports';
import type { SmokeDependencies } from '@/tramites/smoke';

import { CloudTranslator } from './cloud-translator';
import { GeminiNoticeReader } from './gemini-notice-reader';
import { GeminiPlainLanguageWriter } from './gemini-writer';
import { readGoogleEnv } from './google-env';

/** Wires real Google adapters with Application Default Credentials. No API keys. */
export function composeSmokeDependencies(): SmokeDependencies {
  const { project, location } = readGoogleEnv(process.env);
  const translation = new TranslationServiceClient();
  return {
    writer: new GeminiPlainLanguageWriter(createGeminiModels(project, location)),
    translator: new CloudTranslator(translation, project),
  };
}

export function composeNoticeReader(): NoticeReader {
  const { project, location } = readGoogleEnv(process.env);
  return new GeminiNoticeReader(createGeminiModels(project, location));
}

function createGeminiModels(project: string, location: string): GoogleGenAI['models'] {
  // vertexai: true routes Gemini through Agent Platform (Vertex AI). https://github.com/googleapis/js-genai
  return new GoogleGenAI({ vertexai: true, project, location }).models;
}
