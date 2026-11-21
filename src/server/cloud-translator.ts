import { z } from 'zod';

import type { TranslationRequest, Translator } from '@/tramites/ports';

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

const translateTextResponse = z.tuple(
  [z.object({ translations: z.array(z.object({ translatedText: z.string().min(1) })).min(1) })],
  z.unknown(),
);

export class CloudTranslator implements Translator {
  constructor(
    private readonly client: TranslateTextClient,
    private readonly project: string,
  ) {}

  async translate({ text, from, to }: TranslationRequest): Promise<string> {
    // mimeType text/plain keeps apostrophes; the default text/html returns &#39;.
    // https://cloud.google.com/translate/docs/reference/rest/v3/projects/translateText
    const response = await withCredentialMapping(() =>
      this.client.translateText({
        parent: `projects/${this.project}/locations/global`,
        contents: [text],
        mimeType: 'text/plain',
        sourceLanguageCode: from,
        targetLanguageCode: to,
      }),
    );
    return translateTextResponse.parse(response)[0].translations[0].translatedText;
  }
}
