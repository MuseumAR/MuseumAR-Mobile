/** ActionType values allowed by BE AnalyticsLogs (database_schema.sql). */
export const AnalyticsAction = {
  QR_SCAN: 'QR_SCAN',
  AUDIO_PLAY: 'AUDIO_PLAY',
  AUDIO_PAUSE: 'AUDIO_PAUSE',
  AUDIO_COMPLETE: 'AUDIO_COMPLETE',
  AR_VIEW: 'AR_VIEW',
  EXHIBIT_VIEW: 'EXHIBIT_VIEW',
  BOOKMARK_ADD: 'BOOKMARK_ADD',
  BOOKMARK_REMOVE: 'BOOKMARK_REMOVE',
  SEARCH: 'SEARCH',
  MAP_VIEW: 'MAP_VIEW',
  ROUTE_VIEW: 'ROUTE_VIEW',
  PACKAGE_DOWNLOAD: 'PACKAGE_DOWNLOAD',
  LANGUAGE_SWITCH: 'LANGUAGE_SWITCH',
  APP_OPEN: 'APP_OPEN',
  APP_CLOSE: 'APP_CLOSE',
} as const;

export type AnalyticsActionType =
  (typeof AnalyticsAction)[keyof typeof AnalyticsAction];
