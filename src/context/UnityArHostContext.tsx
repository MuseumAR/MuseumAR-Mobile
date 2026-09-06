import { AnalyticsAction } from '../constants/analyticsActions';
import { useLanguage } from '../i18n/LanguageContext';
import { isUnityNativeAvailable } from '../services/unityAr';
import { resolveArModelUrl } from '../utils/arModelUrl';
import { trackAnalytics } from '../services/trackAnalytics';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type UnityArSession = {
  exhibitId: number;
  modelUrl: string;
};

type UnityArHostValue = {
  session: UnityArSession | null;
  visible: boolean;
  playerMounted: boolean;
  openAr: (exhibitId: number, modelUrl: string) => Promise<void>;
  closeAr: () => void;
};

const UnityArHostContext = createContext<UnityArHostValue | null>(null);

export function UnityArHostProvider({ children }: { children: ReactNode }) {
  const { lang } = useLanguage();
  const [session, setSession] = useState<UnityArSession | null>(null);
  const [visible, setVisible] = useState(false);
  const [playerMounted, setPlayerMounted] = useState(false);

  const openAr = useCallback(
    async (exhibitId: number, modelUrl: string) => {
      const remote = modelUrl.trim();
      if (exhibitId <= 0 || !remote) return;

      const url = (await resolveArModelUrl(exhibitId, remote)) ?? remote;
      if (!url) return;

      if (isUnityNativeAvailable()) {
        setPlayerMounted(true);
      }
      setSession({ exhibitId, modelUrl: url });
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
