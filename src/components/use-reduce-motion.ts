import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Follows the system "reduce motion" setting. Until the phone answers it assumes "on",
 * so a person who asked for no motion never sees motion flash.
 * https://reactnative.dev/docs/accessibilityinfo
 */
export function useReduceMotion(): boolean {
  const [reduceMotion, setReduceMotion] = useState(true);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((enabled) => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return reduceMotion;
}
