import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';

import { theme } from '@/theme';

import { LoadingSymbol } from './loading-indicator';

export interface ButtonSymbol {
  ios: SFSymbol;
  android: AndroidSymbol;
}

interface ButtonIconProps {
  icon: ButtonSymbol;
  /** The action is in progress: the loading symbol takes the icon's place (field-feedback S8). */
  busy: boolean;
  color: string;
}

/** https://docs.expo.dev/versions/v58.0.0/sdk/symbols/ */
export function ButtonIcon({ icon, busy, color }: ButtonIconProps) {
  if (busy) return <LoadingSymbol variant="inline" color={color} />;
  return <SymbolView name={icon} size={theme.size.icon} tintColor={color} fallback={null} />;
}
