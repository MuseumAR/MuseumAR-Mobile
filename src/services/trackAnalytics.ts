import NetInfo from '@react-native-community/netinfo';
import { AppState, type NativeEventSubscription } from 'react-native';
import { AnalyticsAction } from '../constants/analyticsActions';
import { isIgnorableVisitorError } from '../utils/visitorErrors';
import { apiService, type TrackActionRequest } from './apiService';
import { getStoredLanguage } from './languagePrefs';
import { getCachedMuseumId } from './museumContext';

let sessionOpen = false;

const EXHIBIT_BOUND_ACTIONS = new Set<string>([
  AnalyticsAction.QR_SCAN,
  AnalyticsAction.AUDIO_PLAY,
  AnalyticsAction.AUDIO_PAUSE,
  AnalyticsAction.AUDIO_COMPLETE,
  AnalyticsAction.AR_VIEW,
  AnalyticsAction.EXHIBIT_VIEW,
  AnalyticsAction.BOOKMARK_ADD,
  AnalyticsAction.BOOKMARK_REMOVE,
]);

function validExhibitId(exhibitId: number | null | undefined): boolean {
  const id = Number(exhibitId);
  return Number.isFinite(id) && id > 0;
}

/**
 * Fire-and-forget POST /Visitor/track-action.
 * Skips until a real museumId is known (FK on AnalyticsLogs).
 * Exhibit-bound actions are skipped when exhibitId is null/0.
 */
export async function trackAnalytics(payload: TrackActionRequest): Promise<void> {
  const museumId =
    payload.museumId != null && payload.museumId > 0
      ? payload.museumId
      : getCachedMuseumId();

  if (museumId == null || museumId <= 0) return;

  const net = await NetInfo.fetch();
  if (net.isConnected === false || net.isInternetReachable === false) return;

  if (
    EXHIBIT_BOUND_ACTIONS.has(payload.actionType) &&
    !validExhibitId(payload.exhibitId)
  ) {
    return;
  }

  const languageUsed =
    payload.languageUsed?.trim() || (await getStoredLanguage());

  try {
    await apiService.trackAction({
      ...payload,
      museumId,
      languageUsed,
    });
  } catch (error) {
    if (!isIgnorableVisitorError(error)) {
      console.warn('track-action failed:', error);
    }
  }
}

async function emitAppOpen(): Promise<void> {
  if (sessionOpen || !getCachedMuseumId()) return;
  sessionOpen = true;
  await trackAnalytics({ actionType: AnalyticsAction.APP_OPEN });
}

async function emitAppClose(): Promise<void> {
  if (!sessionOpen) return;
  sessionOpen = false;
  await trackAnalytics({ actionType: AnalyticsAction.APP_CLOSE });
}

/** Call after museum profile cache is set so APP_OPEN has a valid museumId. */
export function notifyMuseumReadyForAnalytics(): void {
  if (AppState.currentState === 'active') {
    void emitAppOpen();
  }
}

/** APP_OPEN / APP_CLOSE around foreground and background. */
export function startAnalyticsLifecycle(): () => void {
  const sub: NativeEventSubscription = AppState.addEventListener(
    'change',
    (next) => {
      if (next === 'active') {
        void emitAppOpen();
      } else if (next === 'background' || next === 'inactive') {
        void emitAppClose();
      }
    },
  );
  return () => sub.remove();
}
