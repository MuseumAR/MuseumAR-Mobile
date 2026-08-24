import { AnalyticsAction } from '../constants/analyticsActions';
import { useLanguage } from '../i18n/LanguageContext';
import { isUnityNativeAvailable } from '../services/unityAr';
import { resolveArOverlayUrl } from '../utils/arOverlayUrl';
import { trackAnalytics } from '../services/trackAnalytics';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { Image } from 'react-native';

export type UnityArSession = {
  exhibitId: number;
  overlayUrl: string;
};

type UnityArHostValue = {
  session: UnityArSession | null;
  visible: boolean;
  playerMounted: boolean;
  openAr: (exhibitId: number, overlayUrl: string) => Promise<void>;
  closeAr: () => void;
};

const UnityArHostContext = createContext<UnityArHostValue | null>(null);

async function prefetchOverlay(url: string): Promise<void> {
  try {
    await Image.prefetch(url);
  } catch {
    // Unity will still fetch the URL itself.
  }
}

export function UnityArHostProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const [session, setSession] = useState<UnityArSession | null>(null);
  const [visible, setVisible] = useState(false);
  const [playerMounted, setPlayerMounted] = useState(false);

  const openAr = useCallback(
    async (exhibitId: number, overlayUrl: string) => {
      const remote = overlayUrl.trim();
      if (exhibitId <= 0 || !remote) return;

      const url = (await resolveArOverlayUrl(exhibitId, remote)) ?? remote;
      if (!url) return;

      void prefetchOverlay(url);

      if (isUnityNativeAvailable()) {
        setPlayerMounted(true);
      }
      setSession({ exhibitId, overlayUrl: url });
      setVisible(true);
      void trackAnalytics({
        actionType: AnalyticsAction.AR_VIEW,
        exhibitId,
        languageUsed: lang,
      });
    },
    [lang],
  );

  const closeAr = useCallback(() => {
    setVisible(false);
  }, []);

  const value = useMemo(
    () => ({ session, visible, playerMounted, openAr, closeAr }),
    [session, visible, playerMounted, openAr, closeAr],
  );

  return (
    <UnityArHostContext.Provider value={value}>
      {children}
    </UnityArHostContext.Provider>
  );
}

export function useUnityArHost(): UnityArHostValue {
  const ctx = useContext(UnityArHostContext);
  if (!ctx) {
    throw new Error('useUnityArHost must be used inside UnityArHostProvider');
  }
  return ctx;
}
