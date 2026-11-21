import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { UnreadableNoticeError } from '@/tramites/errors';
import type { NoticeReader, NoticeReading } from '@/tramites/ports';
import { readNotice } from '@/tramites/read-notice';

const TRANSCRIPT = readFileSync(join(__dirname, '..', '..', '..', 'fixtures', 'aviso-ficticio.txt'), 'utf8');
const IMAGE = { base64: 'AAAA', mimeType: 'image/jpeg' as const };

function readerReturning(reading: NoticeReading): NoticeReader {
  return { read: async () => reading };
}

const dueDate = {
  kind: 'fecha',
  text: 'Pague antes del 30 de noviembre.',
  sourceQuote: 'vence el día 30 de noviembre de 2026',
};

describe('readNotice (S3 traceability)', () => {
  it('keeps facts whose quote appears literally in the transcript', async () => {
    const facts = await readNotice(readerReturning({ readable: true, transcript: TRANSCRIPT, facts: [dueDate] }), IMAGE);
    expect(facts).toEqual([dueDate]);
  });

  it('matches quotes across line breaks and repeated spaces', async () => {
    const wrapped = { ...dueDate, sourceQuote: 'correspondiente al ejercicio 2026\n  vence el día 30' };
    const facts = await readNotice(readerReturning({ readable: true, transcript: TRANSCRIPT, facts: [wrapped] }), IMAGE);
    expect(facts).toEqual([wrapped]);
  });

  it('drops facts whose quote is not in the transcript', async () => {
    const invented = { kind: 'monto', text: 'Pague 5,000 pesos.', sourceQuote: 'El monto a pagar es de $5,000.00' };
    const facts = await readNotice(
      readerReturning({ readable: true, transcript: TRANSCRIPT, facts: [dueDate, invented] }),
      IMAGE,
    );
    expect(facts).toEqual([dueDate]);
  });

  it('treats a notice with no traceable fact as unreadable (S4)', async () => {
    const invented = { kind: 'monto', text: 'x', sourceQuote: 'no existe' };
    await expect(
      readNotice(readerReturning({ readable: true, transcript: TRANSCRIPT, facts: [invented] }), IMAGE),
    ).rejects.toBeInstanceOf(UnreadableNoticeError);
  });

  it('treats a reading marked unreadable as unreadable (S4)', async () => {
    await expect(
      readNotice(readerReturning({ readable: false, transcript: '', facts: [] }), IMAGE),
    ).rejects.toBeInstanceOf(UnreadableNoticeError);
  });
});
