import { TranslationServiceClient } from '@google-cloud/translate';
import { GoogleGenAI } from '@google/genai';

import type { EasyReadDependencies } from '@/tramites/easy-read';
import type { NoticeReader } from '@/tramites/ports';
import type { SmokeDependencies } from '@/tramites/smoke';

import { CloudTranslator } from './cloud-translator';
import { GeminiNoticeReader } from './gemini-notice-reader';
import { GeminiPlainLanguageWriter } from './gemini-writer';
import { readGoogleEnv } from './google-env';

/** Wires real Google adapters with Application Default Credentials. No API keys. */
export function composeSmokeDependencies(): SmokeDependencies {
  return composeTextAdapters();
}

export function composeEasyRead(): EasyReadDependencies {
  return composeTextAdapters();
}

export function composeNoticeReader(): NoticeReader {
  const { project, location } = readGoogleEnv(process.env);
  return new GeminiNoticeReader(createGeminiModels(project, location));
}

function composeTextAdapters(): { writer: GeminiPlainLanguageWriter; translator: CloudTranslator } {
  const { project, location } = readGoogleEnv(process.env);
  return {
    writer: new GeminiPlainLanguageWriter(createGeminiModels(project, location)),
    translator: new CloudTranslator(new TranslationServiceClient(), project),
  };
}

function createGeminiModels(project: string, location: string): GoogleGenAI['models'] {
  // vertexai: true routes Gemini through Agent Platform (Vertex AI). https://github.com/googleapis/js-genai
  return new GoogleGenAI({ vertexai: true, project, location }).models;
}
