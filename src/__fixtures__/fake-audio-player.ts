import type { AudioEvents, AudioPlayer, AudioStatus } from 'expo-audio';

export type FakeAudioPlayer = Pick<AudioPlayer, 'play' | 'pause' | 'remove' | 'addListener'> & {
  emit(status: Partial<AudioStatus>): void;
};

const BASE_STATUS: AudioStatus = {
  id: 'fake',
  currentTime: 0,
  playbackState: 'ready',
  timeControlStatus: 'paused',
  reasonForWaitingToPlay: '',
  mute: false,
  duration: 2,
  playing: false,
  loop: false,
  didJustFinish: false,
  isBuffering: false,
  isLoaded: true,
  playbackRate: 1,
  shouldCorrectPitch: true,
  isLive: false,
  currentOffsetFromLive: null,
  error: null,
};

/** An expo-audio player double; `onCall` records pause and remove in order. */
export function fakeAudioPlayer(onCall: (name: 'pause' | 'remove') => void = () => undefined): FakeAudioPlayer {
  const listeners: AudioEvents['playbackStatusUpdate'][] = [];
  return {
    play: jest.fn(),
    pause: jest.fn(() => onCall('pause')),
    remove: jest.fn(() => onCall('remove')),
    addListener: jest.fn((event: keyof AudioEvents, listener: AudioEvents[keyof AudioEvents]) => {
      if (isStatusListener(event, listener)) listeners.push(listener);
      return { remove: jest.fn() };
    }),
    emit: (status) => listeners.forEach((listener) => listener({ ...BASE_STATUS, ...status })),
  };
}

function isStatusListener(
  event: keyof AudioEvents,
  _listener: AudioEvents[keyof AudioEvents],
): _listener is AudioEvents['playbackStatusUpdate'] {
  return event === 'playbackStatusUpdate';
}
