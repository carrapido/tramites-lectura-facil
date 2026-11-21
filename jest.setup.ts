/**
 * expo-audio cannot load its native module under Jest. Screens that only import it get this stub;
 * tests that exercise playback mock it themselves, which takes precedence.
 */
jest.mock('expo-audio', () => ({ createAudioPlayer: jest.fn() }));

/**
 * Reanimated 4 cannot load under Jest without the `react-native-reanimated/jest/resolver` resolver,
 * and its own mock loads the real module first. Components here only use `createAnimatedComponent`
 * with CSS transitions, so this stub renders the plain component with its style, which tests read.
 * https://docs.swmansion.com/react-native-reanimated/docs/css-transitions/transition-property
 */
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { createAnimatedComponent: <T,>(component: T) => component },
  createAnimatedComponent: <T,>(component: T) => component,
  cubicBezier: (x1: number, y1: number, x2: number, y2: number) => ({ easingName: 'cubicBezier', x1, y1, x2, y2 }),
}));
