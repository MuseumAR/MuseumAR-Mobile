import { useCallback } from 'react';
import { apiService, TrackActionRequest } from '../services/apiService';
import { getToken } from '../services/tokenStorage';
import { isIgnorableVisitorError } from '../utils/visitorErrors';

export function useTrackAction() {
  const track = useCallback(async (payload: TrackActionRequest) => {
    const token = await getToken();
    if (!token) return;
    try {
      await apiService.trackAction(payload);
    } catch (error) {
      if (!isIgnorableVisitorError(error)) {
        console.warn('track-action failed:', error);
      }
    }
  }, []);

  return { track };
}
