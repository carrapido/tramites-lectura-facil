import { composeSmokeDependencies } from '@/server/composition';
import { handleSmoke } from '@/server/smoke-handler';

/** https://docs.expo.dev/router/web/api-routes/ */
export function GET(): Promise<Response> {
  return handleSmoke(composeSmokeDependencies);
}
