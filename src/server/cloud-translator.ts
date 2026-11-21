import { z } from 'zod';

import type { BatchTranslationRequest, BatchTranslator, TranslationRequest, Translator } from '@/tramites/ports';

import { withCredentialMapping } from './google-errors';

export interface TranslateTextRequest {
  parent: string;
  contents: string[];
  mimeType: 'text/plain';
  sourceLanguageCode: string;
  targetLanguageCode: string;
}

/** The subset of Translation v3 `TranslationServiceClient` this adapter needs. */
export interface TranslateTextClient {
  translateText(request: TranslateTextRequest): Promise<unknown>;
}

export class CloudTranslator implements Translator, BatchTranslator {
  constructor(
    private readonly client: TranslateTextClient,
    private readonly project: string,
  ) {}

  async translate({ text, from, to }: TranslationRequest): Promise<string> {
    const [translated] = await this.translateAll({ texts: [text], from, to });
    return translated;
  }

  /** One translateText call for every text; the answer keeps their order. */
  async translateAll({ texts, from, to }: BatchTranslationRequest): Promise<string[]> {
    // mimeType text/plain keeps apostrophes; the default text/html returns &#39;.
    // https://cloud.google.com/translate/docs/reference/rest/v3/projects/translateText
    const response = await withCredentialMapping(() =>
      this.client.translateText({
        parent: `projects/${this.project}/locations/global`,
        contents: texts,
        mimeType: 'text/plain',
        sourceLanguageCode: from,
        targetLanguageCode: to,
      }),
    );
    return translatedTexts(response, texts.length);
  }
}

function translatedTexts(response: unknown, count: number): string[] {
  const [first] = translateTextResponse(count).parse(response);
  return first.translations.map((translation) => translation.translatedText);
}

function translateTextResponse(count: number) {
  return z.tuple(
    [z.object({ translations: z.array(z.object({ translatedText: z.string().min(1) })).length(count) })],
    z.unknown(),
  );
}
