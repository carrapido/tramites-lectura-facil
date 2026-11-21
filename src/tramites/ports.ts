import type { Category } from './category';

export type LanguageCode = 'es' | 'yua';

export interface TranslationRequest {
  text: string;
  from: LanguageCode;
  to: LanguageCode;
}

export interface BatchTranslationRequest {
  texts: string[];
  from: LanguageCode;
  to: LanguageCode;
}

/** Rewrites official Spanish into short, plain Spanish. */
export interface PlainLanguageWriter {
  toPlainSpanish(text: string): Promise<string>;
}

/** Translates plain text between two languages. */
export interface Translator {
  translate(request: TranslationRequest): Promise<string>;
}

/** Translates many texts in one call; the answer keeps the order of `texts`. */
export interface BatchTranslator {
  translateAll(request: BatchTranslationRequest): Promise<string[]>;
}

/** A phone photo of a paper, base64-encoded. */
export interface NoticeImage {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

/** Normalized region of the photo, each value from 0 to 1. */
export interface FactBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** One short fact with the literal quote of the notice it came from. */
export interface Fact {
  kind: string;
  text: string;
  sourceQuote: string;
  box?: FactBox;
}

/** What a reader saw in the photo, before the traceability check. */
export interface NoticeReading {
  readable: boolean;
  /** Kind of paper, judged from its context (context-categories S2). */
  category: Category;
  transcript: string;
  facts: Fact[];
  /** False when the photo shows no text at all; absent means text was found (S4 amended from L7). */
  textFound?: boolean;
  /** When there is no text, a short Spanish phrase for what the photo shows, such as "una taza de café". */
  seen?: string;
}

/** Transcribes a paper photo, names its category and extracts candidate facts. */
export interface NoticeReader {
  read(image: NoticeImage): Promise<NoticeReading>;
}

/**
 * Speaks a text with a machine voice; returns WAV or headerless 16-bit PCM bytes.
 * Without a language it speaks Yucatec Maya, as before Spanish moved to the laptop (field-feedback S3).
 */
export interface VoiceSynthesizer {
  synthesize(text: string, language?: LanguageCode): Promise<Uint8Array>;
}

/** Stores synthesized audio by key so the same text is never paid for twice. */
export interface AudioCache {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, audio: Uint8Array): Promise<void>;
}

/** One thing to bring or do, with the literal quote of the notice it came from. */
export interface ChecklistItem {
  text: string;
  sourceQuote: string;
}

/** A deadline worth a phone reminder. */
export interface Reminder {
  /** Calendar date as `YYYY-MM-DD`. */
  dueDate: string;
  title: string;
  place?: string;
  sourceQuote: string;
}

/** What to bring and when to go. */
export interface Plan {
  checklist: ChecklistItem[];
  reminder: Reminder | null;
}

/** Proposes a plan from traceable facts and the paper's category, before the traceability and date checks. */
export interface PlanProposer {
  propose(facts: Fact[], category: Category): Promise<Plan>;
}

/** Schedules the reminder on the phone. Called only after the person says "Sí". */
export interface ReminderScheduler {
  schedule(reminder: Reminder, checklist: ChecklistItem[]): Promise<void>;
}
