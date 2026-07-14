import { useCallback } from 'react';
import { apiService, TrackActionRequest } from '../services/apiService';
import { getCachedMuseumId } from '../services/museumContext';
import { isIgnorableVisitorError } from '../utils/visitorErrors';

/**
 * Ghi analytics (POST /Visitor/track-action).
 * BE bắt buộc museumId thật — resolve từ payload hoặc cache profile.
 * Auth optional trên BE; không bắt buộc JWT phía client.
 */
export function useTrackAction() {
  const track = useCallback(async (payload: TrackActionRequest) => {
    const museumId =
      payload.museumId != null && payload.museumId > 0
        ? payload.museumId
        : getCachedMuseumId();

    if (museumId == null || museumId <= 0) {
      // Chưa có museum profile → bỏ qua, tránh spam 500 FK
      return;
    }

    try {
      await apiService.trackAction({ ...payload, museumId });
    } catch (error) {
      if (!isIgnorableVisitorError(error)) {
        console.warn('track-action failed:', error);
      }
    }
  }, []);

  return { track };
}
