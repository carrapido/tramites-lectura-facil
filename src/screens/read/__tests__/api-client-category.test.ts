import { readNoticePhoto } from '@/screens/read/api-client';

const PHOTO = { base64: 'QUJD', mimeType: 'image/jpeg' } as const;
const FACT = { kind: 'fecha', text: 'La junta es el 5 de diciembre.', sourceQuote: 'junta el día 5 de diciembre' };

function answer(body: unknown) {
  global.fetch = jest.fn(async () => Response.json(body));
}

describe('readNoticePhoto category (context-categories S2, S4)', () => {
  it('passes a known category through', async () => {
    answer({ ok: true, category: 'reunion', facts: [FACT] });
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: true, category: 'reunion', facts: [FACT] });
  });

  it('treats a missing category as otro', async () => {
    answer({ ok: true, facts: [FACT] });
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: true, category: 'otro', facts: [FACT] });
  });

  it.each([['banco'], [3], [null]])('treats the unknown category %p as otro instead of failing', async (category) => {
    answer({ ok: true, category, facts: [FACT] });
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: true, category: 'otro', facts: [FACT] });
  });
});
