import type { PlainLanguageWriter, Translator } from './ports';

/** Fixed fictitious notice sentence. Never use a real CURP, INE or person. */
export const SMOKE_SENTENCE =
  'Se le notifica que deberá presentarse en la oficina municipal antes del día 30 para regularizar su predio ficticio.';

export interface SmokeDependencies {
  writer: PlainLanguageWriter;
  translator: Translator;
}

export interface SmokeResult {
  plainSpanish: string;
  maya: string;
}

export async function runSmoke({ writer, translator }: SmokeDependencies): Promise<SmokeResult> {
  const [plainSpanish, maya] = await Promise.all([
    writer.toPlainSpanish(SMOKE_SENTENCE),
    translator.translate({ text: SMOKE_SENTENCE, from: 'es', to: 'yua' }),
  ]);
  return { plainSpanish, maya };
}
