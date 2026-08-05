import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Constants from 'expo-constants';
import { apiService } from '../services/apiService';
import { getOrCreateDeviceId } from '../services/deviceId';
import {
  getStoredLanguage,
  setStoredLanguage,
  type AppLanguage,
} from '../services/languagePrefs';
import { getSession } from '../services/sessionStorage';
import { getToken } from '../services/tokenStorage';
import { getDeviceModel, getDeviceType } from '../utils/deviceInfo';
import { translate, type TranslationKey } from './strings';

type LanguageContextValue = {
  lang: AppLanguage;
  ready: boolean;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  t: (key: TranslationKey | string, fallback?: string) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

async function syncPreferredLangToVisitor(lang: AppLanguage): Promise<void> {
  try {
    const token = await getToken();
    if (!token) return;
    const session = await getSession();
    const deviceId = await getOrCreateDeviceId();
    await apiService.syncVisitor({
      deviceId,
      displayName: session?.fullName,
      email: session?.email,
      preferredLang: lang,
      deviceType: getDeviceType(),
      deviceModel: getDeviceModel(),
      appVersion: Constants.expoConfig?.version ?? '1.0.0',
    });
  } catch (error) {
    console.warn('Failed to sync preferredLang:', error);
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<AppLanguage>('vi');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredLanguage();
      if (!cancelled) {
        setLang(stored);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage) => {
    setLang(next);
    await setStoredLanguage(next);
    void syncPreferredLangToVisitor(next);
  }, []);

  const t = useCallback(
    (key: TranslationKey | string, fallback?: string) =>
      translate(lang, key, fallback),
    [lang],
  );

  const value = useMemo(
    () => ({ lang, ready, setLanguage, t }),
    [lang, ready, setLanguage, t],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}

/** Safe variant for modules that may render outside provider during tests. */
export function useLanguageOptional(): LanguageContextValue | null {
  return useContext(LanguageContext);
}
