import { z } from 'zod';

import { NoTextFoundError, UnreadableNoticeError } from '@/tramites/errors';
import type { NoticeReader } from '@/tramites/ports';
import { readNotice } from '@/tramites/read-notice';

import { composeOrNull } from './compose-or-null';
import { replayedField } from './demo-mode';
import { configMissingResponse, googleFailureResponse } from './failure-response';
import { declaresOversizedBody, invalidRequestResponse, jsonOrNull } from './request-body';

/** About 4 MB of image bytes; base64 needs 4 characters for every 3 bytes. */
const MAX_IMAGE_BASE64_LENGTH = Math.ceil((4 * 1024 * 1024 * 4) / 3);
/** Room for the JSON keys, quotes and mimeType around the base64 string. */
const JSON_OVERHEAD_BYTES = 1024;
const MAX_REQUEST_BYTES = MAX_IMAGE_BASE64_LENGTH + JSON_OVERHEAD_BYTES;

const readRequest = z.object({
  imageBase64: z.string().min(1).max(MAX_IMAGE_BASE64_LENGTH),
  mimeType: z.enum(['image/jpeg', 'image/png']),
});

/** POST /api/read: photo in, the paper's category and traceable facts out (S1-S4). `replayed` marks a demo replay answer. */
export async function handleRead(request: Request, compose: () => NoticeReader, replayed = false): Promise<Response> {
  if (declaresOversizedBody(request, MAX_REQUEST_BYTES)) return invalidRequestResponse();
  const body = readRequest.safeParse(await jsonOrNull(request));
  if (!body.success) return invalidRequestResponse();

  const reader = composeOrNull(compose, 'read');
  if (!reader) return configMissingResponse();

  try {
    const { category, facts } = await readNotice(reader, { base64: body.data.imageBase64, mimeType: body.data.mimeType });
    return Response.json({ ok: true, category, facts, ...replayedField(replayed) });
  } catch (error) {
    return readFailureResponse(error);
  }
}

/** 422 no-text (with `seen` when known) or unreadable for the photo itself (S4 amended from L7); else a Google failure. */
function readFailureResponse(error: unknown): Response {
  if (error instanceof NoTextFoundError) {
    const seen = error.seen ? { seen: error.seen } : {};
    return Response.json({ ok: false, reason: 'no-text', ...seen }, { status: 422 });
  }
  if (error instanceof UnreadableNoticeError) return Response.json({ ok: false, reason: 'unreadable' }, { status: 422 });
  return googleFailureResponse(error, 'read');
}
