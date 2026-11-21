/**
 * @jest-environment node
 */
import { defaultQuotaProject } from '@/server/google-env';

describe('defaultQuotaProject (no extra .env.local line needed)', () => {
  it('uses the project as quota project when none is set', () => {
    const env: Record<string, string | undefined> = { GOOGLE_CLOUD_PROJECT: 'demo-proj' };
    defaultQuotaProject(env, 'demo-proj');
    expect(env.GOOGLE_CLOUD_QUOTA_PROJECT).toBe('demo-proj');
  });

  it('fills an empty quota project', () => {
    const env: Record<string, string | undefined> = { GOOGLE_CLOUD_QUOTA_PROJECT: '' };
    defaultQuotaProject(env, 'demo-proj');
    expect(env.GOOGLE_CLOUD_QUOTA_PROJECT).toBe('demo-proj');
  });

  it('keeps a quota project someone configured', () => {
    const env: Record<string, string | undefined> = { GOOGLE_CLOUD_QUOTA_PROJECT: 'billing-proj' };
    defaultQuotaProject(env, 'demo-proj');
    expect(env.GOOGLE_CLOUD_QUOTA_PROJECT).toBe('billing-proj');
  });
});
