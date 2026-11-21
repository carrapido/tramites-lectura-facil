/** Liveness only: calls no external service. https://docs.expo.dev/router/web/api-routes/ */
export function GET(): Response {
  return Response.json({ ok: true });
}
