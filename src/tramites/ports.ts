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

/** A phone photo of a notice, base64-encoded. */
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
  transcript: string;
  facts: Fact[];
}

/** Transcribes a notice photo and extracts candidate facts. */
export interface NoticeReader {
  read(image: NoticeImage): Promise<NoticeReading>;
}

/** Speaks a Yucatec Maya text with a machine voice; returns WAV or headerless 16-bit PCM bytes. */
export interface VoiceSynthesizer {
  synthesize(text: string): Promise<Uint8Array>;
}

/** Stores synthesized audio by key so the same text is never paid for twice. */
export interface AudioCache {
  get(key: string): Promise<Uint8Array | null>;
  set(key: string, audio: Uint8Array): Promise<void>;
}
