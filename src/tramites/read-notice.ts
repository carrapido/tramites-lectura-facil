import { UnreadableNoticeError } from './errors';
import type { Fact, NoticeImage, NoticeReader, NoticeReading } from './ports';
import { collapseWhitespace, isQuotedIn } from './quote-match';

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
