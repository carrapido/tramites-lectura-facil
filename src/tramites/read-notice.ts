import type { Category } from './category';
import { UnreadableNoticeError } from './errors';
import type { Fact, NoticeImage, NoticeReader, NoticeReading } from './ports';
import { collapseWhitespace, isQuotedIn } from './quote-match';

/** A read paper: its category and its traceable facts. */
export interface PaperReading {
  category: Category;
  facts: Fact[];
}

/**
 * Reads a paper and keeps only the facts whose source quote appears literally in the transcript (S3).
 * The category comes with them (context-categories S2). Throws UnreadableNoticeError when nothing traceable remains (S4).
 */
export async function readNotice(reader: NoticeReader, image: NoticeImage): Promise<PaperReading> {
  const reading = await reader.read(image);
  const facts = reading.readable ? traceableFacts(reading) : [];
  if (facts.length === 0) throw new UnreadableNoticeError();
  return { category: reading.category, facts };
}

function traceableFacts({ transcript, facts }: NoticeReading): Fact[] {
  const text = collapseWhitespace(transcript);
  return facts.filter((fact) => isQuotedIn(text, fact.sourceQuote));
}
