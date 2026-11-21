/**
 * @jest-environment node
 */
import { CloudTranslator, type TranslateTextClient } from '@/server/cloud-translator';
import { CredentialsUnavailableError } from '@/tramites/errors';

const ADC_MESSAGE = 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication';

function clientAnswering(translations: string[]): TranslateTextClient & { requests: unknown[] } {
  const requests: unknown[] = [];
  return {
    requests,
    translateText: async (request) => {
      requests.push(request);
      return [{ translations: translations.map((translatedText) => ({ translatedText })) }];
    },
  };
}

describe('CloudTranslator.translateAll (S2)', () => {
  it('translates every text in one plain-text translateText call', async () => {
    const client = clientAnswering(["Ma'alob", "Bo'ot"]);

    const texts = await new CloudTranslator(client, 'demo-project').translateAll({
      texts: ['Hola', 'Pague'],
      from: 'es',
      to: 'yua',
    });

    expect(texts).toEqual(["Ma'alob", "Bo'ot"]);
    expect(client.requests).toEqual([
      {
        parent: 'projects/demo-project/locations/global',
        contents: ['Hola', 'Pague'],
        mimeType: 'text/plain',
        sourceLanguageCode: 'es',
        targetLanguageCode: 'yua',
      },
    ]);
  });

  it('rejects an answer with a different number of translations', async () => {
    const client = clientAnswering(['solo una']);

    await expect(
      new CloudTranslator(client, 'p').translateAll({ texts: ['Hola', 'Pague'], from: 'es', to: 'yua' }),
    ).rejects.toThrow();
  });

  it('maps missing ADC to CredentialsUnavailableError', async () => {
    const client: TranslateTextClient = {
      translateText: async () => {
        throw new Error(ADC_MESSAGE);
      },
    };

    await expect(
      new CloudTranslator(client, 'p').translateAll({ texts: ['Hola'], from: 'es', to: 'yua' }),
    ).rejects.toBeInstanceOf(CredentialsUnavailableError);
  });

  it('keeps translate working for a single text', async () => {
    const client = clientAnswering(["Ma'alob"]);

    expect(await new CloudTranslator(client, 'p').translate({ text: 'Hola', from: 'es', to: 'yua' })).toBe("Ma'alob");
  });
});
