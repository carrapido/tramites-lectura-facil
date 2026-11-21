import { z } from 'zod';

import { apiUrl } from '@/screens/api-url';

const fact = z.object({
  kind: z.string(),
  text: z.string(),
  sourceQuote: z.string(),
});

const readBody = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), facts: z.array(fact) }),
  z.object({ ok: z.literal(false), reason: z.string() }),
]);

export type ReadBody = z.infer<typeof readBody>;
export type ReadFact = z.infer<typeof fact>;

export interface NoticePhoto {
  base64: string;
  mimeType: 'image/jpeg' | 'image/png';
}

/** Sends the photo to the laptop and returns the traceable facts or the failure reason. */
export async function readNoticePhoto(photo: NoticePhoto): Promise<ReadBody> {
  try {
    const response = await fetch(apiUrl('/api/read'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: photo.base64, mimeType: photo.mimeType }),
    });
    return readBody.parse(await response.json());
  } catch {
    return { ok: false, reason: 'unreachable' };
  }
}
