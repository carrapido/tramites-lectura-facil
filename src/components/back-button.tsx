import { router } from 'expo-router';

import { SecondaryButton } from './secondary-button';

/** Back is always visible; it goes home when there is no screen to return to. */
export function BackButton() {
  return <SecondaryButton label="Volver" icon={{ ios: 'arrow.left', android: 'arrow_back' }} onPress={goBack} />;
}

function goBack() {
  // https://docs.expo.dev/versions/v58.0.0/sdk/router/
  if (router.canGoBack()) router.back();
  else router.replace('/');
}
