import { z } from 'zod';

import { UnreadableNoticeError } from '@/tramites/errors';
import type { NoticeReader } from '@/tramites/ports';
import { readNotice } from '@/tramites/read-notice';

import { composeOrNull } from './compose-or-null';
import { configMissingResponse, googleFailureResponse } from './failure-response';

/** About 4 MB of image bytes; base64 needs 4 characters for every 3 bytes. */
const MAX_IMAGE_BASE64_LENGTH = Math.ceil((4 * 1024 * 1024 * 4) / 3);
/** Room for the JSON keys, quotes and mimeType around the base64 string. */
const JSON_OVERHEAD_BYTES = 1024;
const MAX_REQUEST_BYTES = MAX_IMAGE_BASE64_LENGTH + JSON_OVERHEAD_BYTES;

const readRequest = z.object({
  imageBase64: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH),
  mimeType: z.enum(['image/jpeg', 'image/png']),
});

/** POST /api/read: photo in, traceable facts out (S1-S4). */
export async function handleRead(request: Request, compose: () => NoticeReader): Promise<Response> {
  if (declaresOversizedBody(request)) return invalidRequestResponse();
  const body = readRequest.safeParse(await jsonOrNull(request));
  if (!body.success) return invalidRequestResponse();

  const reader = composeOrNull(compose, 'read');
  if (!reader) return configMissingResponse();

  try {
    const facts = await readNotice(reader, { base64: body.data.imageBase64, mimeType: body.data.mimeType });
    return Response.json({ ok: true, facts });
  } catch (error) {
    if (error instanceof UnreadableNoticeError) return Response.json({ ok: false, reason: 'unreadable' }, { status: 422 });
    return googleFailureResponse(error, 'read');
  }
}

/** Rejects an oversized upload from its header, before the body is buffered in memory. */
function declaresOversizedBody(request: Request): boolean {
  return Number(request.headers.get('content-length') ?? 0) > MAX_REQUEST_BYTES;
}

function invalidRequestResponse(): Response {
  return Response.json({ ok: false, reason: 'invalid-request' }, { status: 400 });
}

async function jsonOrNull(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
