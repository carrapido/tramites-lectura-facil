import {
  MACHINE_TRANSLATION_LABEL,
  MAX_PLAIN_WORDS,
  toEasyReadCards,
} from '@/tramites/easy-read';
import { CredentialsUnavailableError } from '@/tramites/errors';
import type { BatchTranslationRequest, BatchTranslator, Fact, PlainLanguageWriter } from '@/tramites/ports';

const SHORT_FACT: Fact = {
  kind: 'fecha',
  text: 'Pague antes del 30 de noviembre.',
  sourceQuote: 'vence el día 30 de noviembre de 2026',
  box: { x: 0.05, y: 0.4, width: 0.9, height: 0.1 },
};

/** 17 whitespace-separated words: above the limit. */
const LONG_TEXT =
  'Usted deberá presentarse en la Tesorería Municipal con su identificación y su recibo anterior para pagar hoy.';

const LONG_FACT: Fact = {
  kind: 'lugar',
  text: LONG_TEXT,
  sourceQuote: 'Deberá presentarse en la Tesorería Municipal',
};

/** Exactly 15 words: at the limit, kept as is. */
const FIFTEEN_WORDS = 'uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince';

function fakeWriter(answer = 'Vaya a la Tesorería Municipal.'): PlainLanguageWriter & { inputs: string[] } {
  const inputs: string[] = [];
  return {
    inputs,
    async toPlainSpanish(text) {
      inputs.push(text);
      return answer;
    },
  };
}

function fakeTranslator(
  answer: (request: BatchTranslationRequest) => Promise<string[]>,
): BatchTranslator & { calls: BatchTranslationRequest[] } {
  const calls: BatchTranslationRequest[] = [];
  return {
    calls,
    translateAll(request) {
      calls.push(request);
      return answer(request);
    },
  };
}

function mayaOf(request: BatchTranslationRequest): Promise<string[]> {
  return Promise.resolve(request.texts.map((text) => `yua:${text}`));
}

describe('easy-read labels (S3, S4)', () => {
  it('exports the machine translation label for the UI', () => {
    expect(MACHINE_TRANSLATION_LABEL).toBe('Traducción automática, sin revisar');
  });

  it('limits plain Spanish to 15 words', () => {
    expect(MAX_PLAIN_WORDS).toBe(15);
  });
});

describe('toEasyReadCards (S2, S3, S4, S5)', () => {
  it('keeps kind, sourceQuote and box and adds plain Spanish with unreviewed Maya (S2, S4)', async () => {
    const translator = fakeTranslator(mayaOf);

    const cards = await toEasyReadCards([SHORT_FACT], { writer: fakeWriter(), translator });

    expect(cards).toEqual([
      {
        kind: 'fecha',
        plainSpanish: 'Pague antes del 30 de noviembre.',
        maya: 'yua:Pague antes del 30 de noviembre.',
        mayaStatus: 'machine-unreviewed',
        sourceQuote: 'vence el día 30 de noviembre de 2026',
        box: { x: 0.05, y: 0.4, width: 0.9, height: 0.1 },
      },
    ]);
  });

  it('translates every card es to yua in a single batch call (S2)', async () => {
    const translator = fakeTranslator(mayaOf);

    await toEasyReadCards([SHORT_FACT, LONG_FACT], { writer: fakeWriter(), translator });

    expect(translator.calls).toEqual([
      { texts: ['Pague antes del 30 de noviembre.', 'Vaya a la Tesorería Municipal.'], from: 'es', to: 'yua' },
    ]);
  });

  it('rewrites a fact text above 15 words once with the writer (S3)', async () => {
    const writer = fakeWriter('Vaya a la Tesorería Municipal.');

    const cards = await toEasyReadCards([LONG_FACT], { writer, translator: fakeTranslator(mayaOf) });

    expect(writer.inputs).toEqual([LONG_TEXT]);
    expect(cards[0].plainSpanish).toBe('Vaya a la Tesorería Municipal.');
    expect(cards[0]).not.toHaveProperty('box');
  });

  it('keeps a fact text of exactly 15 words without calling the writer (S3)', async () => {
    const writer = fakeWriter();
    const fact = { ...SHORT_FACT, text: FIFTEEN_WORDS };

    const cards = await toEasyReadCards([fact], { writer, translator: fakeTranslator(mayaOf) });

    expect(writer.inputs).toEqual([]);
    expect(cards[0].plainSpanish).toBe(FIFTEEN_WORDS);
  });

  it('counts words across repeated whitespace and line breaks (S3)', async () => {
    const writer = fakeWriter();
    const fact = { ...SHORT_FACT, text: `  ${FIFTEEN_WORDS.replaceAll(' ', ' \n  ')}  ` };

    await toEasyReadCards([fact], { writer, translator: fakeTranslator(mayaOf) });

    expect(writer.inputs).toEqual([]);
  });

  it('delivers plain Spanish with maya null and status unavailable when Translation fails (S5)', async () => {
    const translator = fakeTranslator(() => Promise.reject(new Error('PERMISSION_DENIED')));

    const cards = await toEasyReadCards([SHORT_FACT, LONG_FACT], { writer: fakeWriter(), translator });

    expect(cards).toEqual([
      expect.objectContaining({ plainSpanish: 'Pague antes del 30 de noviembre.', maya: null, mayaStatus: 'unavailable' }),
      expect.objectContaining({ plainSpanish: 'Vaya a la Tesorería Municipal.', maya: null, mayaStatus: 'unavailable' }),
    ]);
  });

  it('marks Maya unavailable when Translation returns the wrong number of texts (S5)', async () => {
    const translator = fakeTranslator(() => Promise.resolve(['solo una']));

    const cards = await toEasyReadCards([SHORT_FACT, LONG_FACT], { writer: fakeWriter(), translator });

    expect(cards.map((card) => [card.maya, card.mayaStatus])).toEqual([
      [null, 'unavailable'],
      [null, 'unavailable'],
    ]);
  });

  it('rethrows missing credentials from Translation (S5)', async () => {
    const translator = fakeTranslator(() => Promise.reject(new CredentialsUnavailableError()));

    await expect(toEasyReadCards([SHORT_FACT], { writer: fakeWriter(), translator })).rejects.toBeInstanceOf(
      CredentialsUnavailableError,
    );
  });
});
