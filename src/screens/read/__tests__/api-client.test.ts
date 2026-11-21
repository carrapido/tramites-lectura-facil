import { readNoticePhoto } from '@/screens/read/api-client';

const PHOTO = { base64: 'QUJD', mimeType: 'image/jpeg' } as const;

describe('readNoticePhoto failure reasons', () => {
  it('reports bad-response when the laptop answers with something that is not JSON', async () => {
    global.fetch = jest.fn(async () => new Response('<html>Internal error</html>', { status: 500 }));
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('reports bad-response when the JSON does not match the expected shape', async () => {
    global.fetch = jest.fn(async () => Response.json({ facts: 'none' }));
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: false, reason: 'bad-response' });
  });

  it('reports unreachable when the request cannot reach the laptop', async () => {
    global.fetch = jest.fn(async () => {
      throw new TypeError('Network request failed');
    });
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: false, reason: 'unreachable' });
  });

  it('reports timeout and aborts the request when the deadline passes', async () => {
    let signal: AbortSignal | null | undefined;
    global.fetch = jest.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          signal = init?.signal;
          init?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        }),
    );

    expect(await readNoticePhoto(PHOTO, 10)).toEqual({ ok: false, reason: 'timeout' });
    expect(signal?.aborted).toBe(true);
  });

  it('passes the server reason through', async () => {
    global.fetch = jest.fn(async () => Response.json({ ok: false, reason: 'invalid-request' }, { status: 400 }));
    expect(await readNoticePhoto(PHOTO)).toEqual({ ok: false, reason: 'invalid-request' });
  });
});
