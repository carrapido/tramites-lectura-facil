import { readNoticePhoto } from '@/screens/read/api-client';

const PHOTO = { base64: 'QUJD', mimeType: 'image/jpeg' } as const;

function answer(body: unknown) {
  global.fetch = jest.fn(async () => Response.json(body, { status: 422 }));
}

describe('readNoticePhoto without text (S4 amended from L7)', () => {
  it('passes no-text through with what the photo shows', async () => {
    answer({ ok: false, reason: 'no-text', seen: 'una taza de café' });

    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: false, reason: 'no-text', seen: 'una taza de café' });
  });

  it('passes no-text through without a description', async () => {
    answer({ ok: false, reason: 'no-text' });

    const body = await readNoticePhoto(PHOTO);

    expect(body).toEqual({ ok: false, reason: 'no-text' });
    expect(body.ok === false && body.seen).toBeFalsy();
  });

  it('drops a description that is not text instead of failing', async () => {
    answer({ ok: false, reason: 'no-text', seen: 7 });

    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: false, reason: 'no-text' });
  });
});
