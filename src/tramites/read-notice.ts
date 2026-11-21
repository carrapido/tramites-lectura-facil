import { UnreadableNoticeError } from './errors';
import type { Fact, NoticeImage, NoticeReader, NoticeReading } from './ports';

/**
 * Reads a notice and keeps only the facts whose source quote appears literally in the transcript (S3).
 * Throws UnreadableNoticeError when nothing traceable remains (S4).
 */
export async function readNotice(reader: NoticeReader, image: NoticeImage): Promise<Fact[]> {
  const reading = await reader.read(image);
  const facts = reading.readable ? traceableFacts(reading) : [];
  if (facts.length === 0) throw new UnreadableNoticeError();
  return facts;
}

function traceableFacts({ transcript, facts }: NoticeReading): Fact[] {
  const text = collapseWhitespace(transcript);
  return facts.filter((fact) => isQuotedIn(text, fact.sourceQuote));
}

function isQuotedIn(collapsedTranscript: string, quote: string): boolean {
  const collapsedQuote = collapseWhitespace(quote);
  return collapsedQuote.length > 0 && collapsedTranscript.includes(collapsedQuote);
}

/** Line breaks and repeated spaces in a photo transcript are layout, not content. */
function collapseWhitespace(text: string): string {
  return text.replaceAll(/\s+/g, ' ').trim();
}
