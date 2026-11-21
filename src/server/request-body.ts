/** Rejects an oversized upload from its header, before the body is buffered in memory. */
export function declaresOversizedBody(request: Request, maxBytes: number): boolean {
  return Number(request.headers.get('content-length') ?? 0) > maxBytes;
}

export function invalidRequestResponse(): Response {
  return Response.json({ ok: false, reason: 'invalid-request' }, { status: 400 });
}

/** A body that is not JSON parses to null, so the schema check rejects it. */
export async function jsonOrNull(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
