import { useCallback } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { type TrackActionRequest } from '../services/apiService';
import { trackAnalytics } from '../services/trackAnalytics';

/**
 * Ghi analytics (POST /Visitor/track-action).
 * BE bắt buộc museumId thật — resolve từ payload hoặc cache profile.
 * Auth optional trên BE; không bắt buộc JWT phía client.
 */
export function useTrackAction() {
  const { lang } = useLanguage();

  const track = useCallback(
    async (payload: TrackActionRequest) => {
      await trackAnalytics({
        ...payload,
        languageUsed: payload.languageUsed?.trim() || lang,
      });
    },
    [lang],
  );

  return { track };
}
