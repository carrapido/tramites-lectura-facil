import { useState } from 'react';
import { Pressable, type GestureResponderEvent, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { cubicBezier } from 'react-native-reanimated';

import { theme } from '@/theme';

import { useReduceMotion } from './use-reduce-motion';

/**
 * Reanimated components run CSS transitions on the UI thread
 * (react-native-reanimated/src/createAnimatedComponent/AnimatedComponent.native.tsx:10,45).
 * https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/
 */
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const { pressScale, pressOpacity, pressMs, pressEasing } = theme.motion;
const EASE_OUT = cubicBezier(...pressEasing);

export interface PressableFeedbackProps extends Omit<PressableProps, 'style'> {
  style?: StyleProp<ViewStyle>;
}

/**
 * The one pressable of the app: on press-in it shrinks a little and dims, on press-out it
 * comes back (field-feedback S7). With reduce motion on, it only dims.
 */
export function PressableFeedback({ style, onPressIn, onPressOut, disabled, ...pressableProps }: PressableFeedbackProps) {
  const reduceMotion = useReduceMotion();
  const [pressed, setPressed] = useState(false);

  function handlePressIn(event: GestureResponderEvent) {
    setPressed(true);
    onPressIn?.(event);
  }

  function handlePressOut(event: GestureResponderEvent) {
    setPressed(false);
    onPressOut?.(event);
  }

  return (
    <AnimatedPressable
      {...pressableProps}
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      // A button that turns disabled mid-press may never get its press-out, so it never stays dimmed.
      style={[style, pressStyle(pressed && disabled !== true, reduceMotion)]}
    />
  );
}

/** Only transform and opacity change, so no layout runs per frame. */
function pressStyle(pressed: boolean, reduceMotion: boolean) {
  return {
    transitionProperty: reduceMotion ? ['opacity' as const] : ['transform' as const, 'opacity' as const],
    transitionDuration: pressMs,
    transitionTimingFunction: EASE_OUT,
    opacity: pressed ? pressOpacity : 1,
    transform: [{ scale: pressed && !reduceMotion ? pressScale : 1 }],
  };
}
