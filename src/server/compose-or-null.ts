/** Runs a composition root; a throw means the server environment is not configured. */
export function composeOrNull<T>(compose: () => T, route: string): T | null {
  try {
    return compose();
  } catch (error) {
    console.error(`[${route}] composition failed`, error);
    return null;
  }
}
