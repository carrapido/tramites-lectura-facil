import { z } from 'zod';

import { apiUrl } from '@/screens/api-url';
import { replayedFlag } from '@/screens/post-json';

/**
 * The server's Gemini call takes about 11 s and the Expo dev server closes its socket at 30 s.
 * 45 s covers both with margin, so a stalled request ends instead of hanging the button.
 */
export const READ_DEADLINE_MS = 45_000;

const fact = z.object({
  kind: z.string(),
  text: z.string(),
  sourceQuote: z.string(),
});

const readBody = z.discriminatedUnion('ok', [
  // `replayed: true` means a demo recording answered: show REPLAY_LABEL (easyread-pitch S5).
  z.object({ ok: z.literal(true), facts: z.array(fact), replayed: replayedFlag }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);

export type ReadBody = z.infer<typeof readBody>;
export type ReadFact = z.infer<typeof fact>;

export interface NoticePhoto {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

/** Sends the photo to the laptop and returns the traceable facts or the failure reason. */
export async function readNoticePhoto(photo: NoticePhoto, deadlineMs = READ_DEADLINE_MS): Promise<ReadBody> {
  // https://developer.mozilla.org/en-US/docs/Web/API/AbortController
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), deadlineMs);
  try {
    return await requestFacts(photo, controller.signal);
  } catch {
    return { ok: false, reason: controller.signal.aborted ? 'timeout' : 'unreachable' };
  } finally {
    clearTimeout(timer);
  }
}

async function requestFacts(photo: NoticePhoto, signal: AbortSignal): Promise<ReadBody> {
  const response = await fetch(apiUrl('/api/read'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64: photo.base64, mimeType: photo.mimeType }),
    signal,
  });
  const parsed = readBody.safeParse(parseJsonOrNull(await response.text()));
  return parsed.success ? parsed.data : { ok: false, reason: 'bad-response' };
}

function parseJsonOrNull(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}
