/**
 * expo-audio cannot load its native module under Jest. Screens that only import it get this stub;
 * tests that exercise playback mock it themselves, which takes precedence.
 */
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));
