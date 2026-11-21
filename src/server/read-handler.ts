import { z } from 'zod';

import { UnreadableNoticeError } from '@/tramites/errors';
import type { NoticeReader } from '@/tramites/ports';
import { readNotice } from '@/tramites/read-notice';

import { googleFailureResponse } from './failure-response';

/** About 4 MB of image bytes; base64 needs 4 characters for every 3 bytes. */
const MAX_IMAGE_BASE64_LENGTH = Math.ceil((4 * 1024 * 1024 * 4) / 3);

const readRequest = z.object({
  imageBase64: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH),
  mimeType: z.enum(['image/jpeg', 'image/png']),
});

/** POST /api/read: photo in, traceable facts out (S1-S4). */
export async function handleRead(request: Request, compose: () => NoticeReader): Promise<Response> {
  const body = readRequest.safeParse(await jsonOrNull(request));
  if (!body.success) return Response.json({ ok: false, reason: 'invalid-request' }, { status: 400 });

  try {
    const facts = await readNotice(compose(), { base64: body.data.imageBase64, mimeType: body.data.mimeType });
    return Response.json({ ok: true, facts });
  } catch (error) {
    if (error instanceof UnreadableNoticeError) return Response.json({ ok: false, reason: 'unreadable' }, { status: 422 });
    return googleFailureResponse(error, 'read');
  }
}

async function jsonOrNull(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
