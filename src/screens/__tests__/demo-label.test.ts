import { isReplayedVoice, REPLAY_LABEL } from '@/screens/demo-label';

describe('replay label (S5)', () => {
  it('reads "Respuesta grabada"', () => {
    expect(REPLAY_LABEL).toBe('Respuesta grabada');
  });

  it('recognizes a replayed voice by its X-Demo-Replay header', () => {
    expect(isReplayedVoice(new Headers({ 'X-Demo-Replay': '1' }))).toBe(true);
    expect(isReplayedVoice(new Headers())).toBe(false);
  });
});
