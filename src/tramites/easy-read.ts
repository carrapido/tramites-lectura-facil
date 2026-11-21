import { CredentialsUnavailableError } from './errors';
import type { BatchTranslator, Fact, FactBox, PlainLanguageWriter } from './ports';

/** The UI shows this under every Maya sentence (S4). */
export const MACHINE_TRANSLATION_LABEL = 'Traducción automática, sin revisar';

/** Plain Spanish sentences have this many words or fewer (S3). */
export const MAX_PLAIN_WORDS = 15;

export type MayaStatus = 'machine-unreviewed' | 'unavailable';

/** One fact in plain Spanish and machine-translated Yucatec Maya, with its source quote. */
export interface EasyReadCard {
  kind: string;
  plainSpanish: string;
  maya: string | null;
  mayaStatus: MayaStatus;
  sourceQuote: string;
  box?: FactBox;
}

export interface EasyReadDependencies {
  writer: PlainLanguageWriter;
  translator: BatchTranslator;
}

/**
 * Turns traceable facts into easy-read cards (S2-S5).
 * Plain Spanish is always delivered; Maya is null when Translation fails for any reason but missing credentials.
 */
export async function toEasyReadCards(facts: Fact[], { writer, translator }: EasyReadDependencies): Promise<EasyReadCard[]> {
  const plainSpanish = await Promise.all(facts.map((fact) => toPlainSpanish(fact.text, writer)));
  const maya = await translateToMayaOrNull(plainSpanish, translator);
  return facts.map((fact, index) => toCard(fact, plainSpanish[index], maya?.[index] ?? null));
}

async function toPlainSpanish(text: string, writer: PlainLanguageWriter): Promise<string> {
  return countWords(text) > MAX_PLAIN_WORDS ? writer.toPlainSpanish(text) : text;
}

async function translateToMayaOrNull(texts: string[], translator: BatchTranslator): Promise<string[] | null> {
  try {
    const maya = await translator.translateAll({ texts, from: 'es', to: 'yua' });
    return maya.length === texts.length ? maya : null;
  } catch (error) {
    if (error instanceof CredentialsUnavailableError) throw error;
    return null;
  }
}

function toCard({ kind, sourceQuote, box }: Fact, plainSpanish: string, maya: string | null): EasyReadCard {
  const card: EasyReadCard = {
    kind,
    plainSpanish,
    maya,
    mayaStatus: maya === null ? 'unavailable' : 'machine-unreviewed',
    sourceQuote,
  };
  return box ? { ...card, box } : card;
}

/** Words are whitespace-separated tokens. */
function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}
