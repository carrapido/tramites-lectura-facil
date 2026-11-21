/**
 * @jest-environment node
 */
import { readDemoMode, replayedField, REPLAY_HEADER } from '@/server/demo-mode';

afterEach(() => jest.restoreAllMocks());

describe('readDemoMode (S4, S5)', () => {
  it.each([
    ['neither variable', {}, 'live'],
    ['DEMO_RECORD=1', { DEMO_RECORD: '1' }, 'record'],
    ['DEMO_REPLAY=1', { DEMO_REPLAY: '1' }, 'replay'],
    ['a value other than 1', { DEMO_RECORD: 'true', DEMO_REPLAY: '0' }, 'live'],
  ])('reads %s as %s', (_name, env, mode) => {
    expect(readDemoMode(env)).toBe(mode);
  });

  it('lets replay win and warns when both are on', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    expect(readDemoMode({ DEMO_RECORD: '1', DEMO_REPLAY: '1' })).toBe('replay');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('does not warn for a single mode', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

    readDemoMode({ DEMO_REPLAY: '1' });

    expect(warn).not.toHaveBeenCalled();
  });
});

describe('replay markers (S5)', () => {
  it('adds replayed: true only while replaying', () => {
    expect(replayedField(true)).toEqual({ replayed: true });
    expect(replayedField(false)).toEqual({});
  });

  it('names the voice header X-Demo-Replay', () => {
    expect(REPLAY_HEADER).toBe('X-Demo-Replay');
  });
});
