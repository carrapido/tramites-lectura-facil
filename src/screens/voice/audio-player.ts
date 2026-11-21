import { createAudioPlayer, type AudioPlayer, type AudioStatus } from 'expo-audio';

/** Holds the player that is playing now, if any. */
export interface PlayerHolder {
  current: AudioPlayer | null;
}

/** createAudioPlayer does not release itself; releasePlayer does. https://docs.expo.dev/versions/v58.0.0/sdk/audio/ */
export function startPlayer(uri: string, onStatus: (status: AudioStatus) => void): AudioPlayer {
  const created = createAudioPlayer({ uri });
  created.addListener('playbackStatusUpdate', onStatus);
  created.play();
  return created;
}

/** Empties the holder first, so a status event fired while pausing finds no player. */
export function releasePlayer(holder: PlayerHolder): void {
  const current = holder.current;
  holder.current = null;
  current?.pause();
  current?.remove();
}
