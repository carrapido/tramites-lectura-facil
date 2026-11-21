/** Plain Spanish sentences have this many words or fewer (S3). */
export const MAX_PLAIN_WORDS = 15;

/** Words are whitespace-separated tokens. */
export function countWords(text: string): number {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}
