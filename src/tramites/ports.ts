export type LanguageCode = 'es' | 'yua';

export interface TranslationRequest {
  text: string;
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
