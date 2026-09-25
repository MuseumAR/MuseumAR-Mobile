import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useUnityArHost } from '../../src/context/UnityArHostContext';
import { C } from '../../src/theme/colors';
import { parseNumericId } from '../../src/utils/parseId';

/** Legacy route — opens the persistent Unity host then leaves this screen. */
export default function UnityArRedirectScreen() {
  const router = useRouter();
  const { openAr } = useUnityArHost();
  const { id, modelUrl: modelUrlParam, overlayUrl: legacyOverlayParam } = useLocalSearchParams<{
    id: string;
    modelUrl?: string | string[];
    overlayUrl?: string | string[];
  }>();

  const exhibitId = parseNumericId(id);
  const modelUrl = (() => {
    const raw = Array.isArray(modelUrlParam)
      ? modelUrlParam[0]
      : modelUrlParam ?? (Array.isArray(legacyOverlayParam) ? legacyOverlayParam[0] : legacyOverlayParam);
    const trimmed = (raw ?? '').trim();
    if (!trimmed) return '';
    try {
      return decodeURIComponent(trimmed);
    } catch {
      return trimmed;
    }
  })();

  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (exhibitId != null && modelUrl) {
      void openAr(exhibitId, modelUrl);
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [exhibitId, modelUrl, openAr, router]);

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: C.bgPrimary,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator color={C.accent} />
    </View>
  );
}
