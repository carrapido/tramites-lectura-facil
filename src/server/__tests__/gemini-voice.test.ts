/**
 * @jest-environment node
 */
import { GeminiVoiceSynthesizer, type GenerateSpeechClient } from '@/server/gemini-voice';
import { CredentialsUnavailableError } from '@/tramites/errors';

const ADC_MESSAGE = 'Could not load the default credentials. Browse to https://cloud.google.com/docs/authentication';
const MAYA = "Bo'ot ka'aj 30.";

function audioAnswer(base64: string) {
  return { candidates: [{ content: { parts: [{ inlineData: { data: base64, mimeType: 'audio/wav' } }] } }] };
}

function client(answer: () => Promise<unknown>): GenerateSpeechClient & { requests: unknown[] } {
  const requests: unknown[] = [];
  return {
    requests,
    generateContent: (request) => {
      requests.push(request);
      return answer();
    },
  };
}

describe('GeminiVoiceSynthesizer (S2)', () => {
  it('asks gemini-3.8-flash-lite-tts for audio with the Kore voice and decodes the inline data', async () => {
    const speech = client(async () => audioAnswer(Buffer.from([82, 73, 70, 70]).toString('base64')));

    const audio = await new GeminiVoiceSynthesizer(speech).synthesize(MAYA);

    expect(Array.from(audio)).toEqual([82, 73, 70, 70]);
    expect(speech.requests).toEqual([
      expect.objectContaining({
        model: 'gemini-3.8-flash-lite-tts',
        config: expect.objectContaining({ responseModalities: ['AUDIO'] }),
      }),
    ]);
    const request = JSON.stringify(speech.requests[0]);
    expect(request).toContain(MAYA);
    expect(request).toContain('"Kore"');
  });

  it('never sends settings that 3.8 TTS rejects', async () => {
    const speech = client(async () => audioAnswer('AAAA'));

    await new GeminiVoiceSynthesizer(speech).synthesize(MAYA);

    const request = JSON.stringify(speech.requests[0]);
    for (const rejected of ['systemInstruction', 'temperature', 'topP', 'topK']) {
      expect(request).not.toContain(rejected);
    }
  });

  it('rejects an answer without audio', async () => {
    const speech = client(async () => ({ candidates: [{ content: { parts: [{ text: 'no audio' }] } }] }));

    await expect(new GeminiVoiceSynthesizer(speech).synthesize(MAYA)).rejects.toThrow();
  });

  it('rejects empty audio', async () => {
    const speech = client(async () => audioAnswer(''));

    await expect(new GeminiVoiceSynthesizer(speech).synthesize(MAYA)).rejects.toThrow();
  });

  it('maps missing ADC to CredentialsUnavailableError', async () => {
    const speech = client(async () => {
      throw new Error(ADC_MESSAGE);
    });

    await expect(new GeminiVoiceSynthesizer(speech).synthesize(MAYA)).rejects.toBeInstanceOf(
      CredentialsUnavailableError,
    );
  });
});
