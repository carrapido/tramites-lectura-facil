/**
 * @jest-environment node
 */
import { CloudTranslator, type TranslateTextClient } from '@/server/cloud-translator';
import { GeminiPlainLanguageWriter, type GenerateContentClient } from '@/server/gemini-writer';
import { readGoogleEnv } from '@/server/google-env';
import { CredentialsUnavailableError } from '@/tramites/errors';

const ADC_MESSAGE = 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication';

describe('GeminiPlainLanguageWriter (S6)', () => {
  it('asks gemini-3.8-flash for plain Spanish and returns its text', async () => {
    const requests: unknown[] = [];
    const client: GenerateContentClient = {
      generateContent: async (request) => {
        requests.push(request);
        return { text: '  Pague antes del viernes.  ' };
      },
    };

    const text = await new GeminiPlainLanguageWriter(client).toPlainSpanish('Texto oficial.');

    expect(text).toBe('Pague antes del viernes.');
    expect(requests).toEqual([expect.objectContaining({ model: 'gemini-3.8-flash' })]);
    expect(JSON.stringify(requests[0])).toContain('Texto oficial.');
  });

  it('rejects an empty answer', async () => {
    const client: GenerateContentClient = { generateContent: async () => ({ text: '' }) };

    await expect(new GeminiPlainLanguageWriter(client).toPlainSpanish('x')).rejects.toThrow();
  });

  it('maps missing ADC to CredentialsUnavailableError', async () => {
    const client: GenerateContentClient = {
      generateContent: async () => {
        throw new Error(ADC_MESSAGE);
      },
    };

    await expect(new GeminiPlainLanguageWriter(client).toPlainSpanish('x')).rejects.toBeInstanceOf(
      CredentialsUnavailableError,
    );
  });
});

describe('CloudTranslator (S6)', () => {
  it('calls translateText as plain text so apostrophes are not HTML-escaped', async () => {
    const requests: unknown[] = [];
    const client: TranslateTextClient = {
      translateText: async (request) => {
        requests.push(request);
        return [{ translations: [{ translatedText: "Ma'alob" }] }];
      },
    };

    const text = await new CloudTranslator(client, 'demo-project').translate({ text: 'Hola', from: 'es', to: 'yua' });

    expect(text).toBe("Ma'alob");
    expect(requests).toEqual([
      {
        parent: 'projects/demo-project/locations/global',
        contents: ['Hola'],
        mimeType: 'text/plain',
        sourceLanguageCode: 'es',
        targetLanguageCode: 'yua',
      },
    ]);
  });

  it('maps missing ADC to CredentialsUnavailableError', async () => {
    const client: TranslateTextClient = {
      translateText: async () => {
        throw new Error(ADC_MESSAGE);
      },
    };

    await expect(
      new CloudTranslator(client, 'p').translate({ text: 'Hola', from: 'es', to: 'yua' }),
    ).rejects.toBeInstanceOf(CredentialsUnavailableError);
  });
});

describe('readGoogleEnv (S3)', () => {
  it('reads project and location', () => {
    expect(readGoogleEnv({ GOOGLE_CLOUD_PROJECT: 'p', GOOGLE_CLOUD_LOCATION: 'global' })).toEqual({
      project: 'p',
      location: 'global',
    });
  });

  it('fails when the project is missing', () => {
    expect(() => readGoogleEnv({ GOOGLE_CLOUD_LOCATION: 'global' })).toThrow();
  });
});
