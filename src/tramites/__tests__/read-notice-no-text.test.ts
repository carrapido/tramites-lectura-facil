import { NoTextFoundError, UnreadableNoticeError } from '@/tramites/errors';
import type { NoticeReader, NoticeReading } from '@/tramites/ports';
import { readNotice } from '@/tramites/read-notice';

const IMAGE = { base64: 'AAAA', mimeType: 'image/jpeg' as const };
const TRANSCRIPT = 'El recibo vence el día 30 de noviembre de 2026.';
const DUE_DATE = { kind: 'fecha', text: 'Pague antes del 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' };

function readerReturning(reading: Partial<NoticeReading>): NoticeReader {
  return { read: async () => ({ readable: false, category: 'otro', transcript: '', facts: [], ...reading }) };
}

async function failureOf(reader: NoticeReader): Promise<unknown> {
  return readNotice(reader, IMAGE).then(
    () => null,
    (error: unknown) => error,
  );
}

describe('readNotice without text (S4 amended from L7)', () => {
  it('throws NoTextFoundError with what the photo shows when it has no text', async () => {
    const error = await failureOf(readerReturning({ textFound: false, seen: 'una taza de café' }));

    expect(error).toBeInstanceOf(NoTextFoundError);
    expect(error).toEqual(expect.objectContaining({ seen: 'una taza de café' }));
  });

  it('throws NoTextFoundError without a description when the reader gives none', async () => {
    const error = await failureOf(readerReturning({ textFound: false }));

    expect(error).toBeInstanceOf(NoTextFoundError);
    expect(error).toEqual(expect.objectContaining({ seen: undefined }));
  });

  it('keeps blurry text as unreadable, not as no text', async () => {
    const error = await failureOf(readerReturning({ textFound: true, readable: false }));

    expect(error).toBeInstanceOf(UnreadableNoticeError);
    expect(error).not.toBeInstanceOf(NoTextFoundError);
  });

  it('returns the facts when the photo has readable text', async () => {
    const reader = readerReturning({ textFound: true, readable: true, transcript: TRANSCRIPT, facts: [DUE_DATE] });

    expect(await readNotice(reader, IMAGE)).toEqual({ category: 'otro', facts: [DUE_DATE] });
  });
});
