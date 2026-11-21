import { readNoticePhoto } from '@/screens/read/api-client';

const PHOTO = { base64: 'QUJD', mimeType: 'image/jpeg' } as const;
const FACT = { kind: 'fecha', text: 'Vence el 30 de noviembre.', sourceQuote: 'vence el día 30 de noviembre de 2026' };

describe('readNoticePhoto demo replay flag (easyread-pitch S5, PR #7 review W2)', () => {
  it('keeps replayed: true from a recorded answer', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: true, facts: [FACT], replayed: true }));
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: true, category: 'otro', facts: [FACT], replayed: true });
  });

  it('adds no replayed flag to a live answer', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: true, facts: [FACT] }));
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: true, category: 'otro', facts: [FACT] });
  });

  it('passes not-recorded through as the reason', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: false, reason: 'not-recorded' }, { status: 404 }));
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: false, reason: 'not-recorded' });
  });
});
