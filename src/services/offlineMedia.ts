import * as FileSystem from 'expo-file-system/legacy';
import { CACHE_DIR, ensureOfflineDirs } from './offlineCache';

const MAP_PATH = `${CACHE_DIR}media-map.json`;

/** remote URL or logical key → local file:// uri */
let mediaMap: Record<string, string> = {};
let loaded = false;

export async function loadMediaMap(): Promise<Record<string, string>> {
  try {
    await ensureOfflineDirs();
    const info = await FileSystem.getInfoAsync(MAP_PATH);
    if (!info.exists) {
      mediaMap = {};
      loaded = true;
      return mediaMap;
    }
    const raw = await FileSystem.readAsStringAsync(MAP_PATH);
    mediaMap = JSON.parse(raw) as Record<string, string>;
    loaded = true;
    return mediaMap;
  } catch {
    mediaMap = {};
    loaded = true;
    return mediaMap;
  }
}

export async function saveMediaMap(next: Record<string, string>): Promise<void> {
  mediaMap = next;
  loaded = true;
  await ensureOfflineDirs();
  await FileSystem.writeAsStringAsync(MAP_PATH, JSON.stringify(next));
}

export async function mergeMediaMap(partial: Record<string, string>): Promise<void> {
  if (!loaded) await loadMediaMap();
  await saveMediaMap({ ...mediaMap, ...partial });
}

export function resolveOfflineUri(
  url?: string | null,
  logicalKey?: string,
): string | undefined {
  if (!loaded) {
    void loadMediaMap();
  }
  const trimmed = url?.trim();
  if (logicalKey && mediaMap[logicalKey]) return mediaMap[logicalKey];
  if (trimmed && mediaMap[trimmed]) return mediaMap[trimmed];
  return undefined;
}

export function audioLogicalKey(exhibitId: number, lang: string): string {
  return `audio:${exhibitId}:${lang}`;
}

export function thumbLogicalKey(exhibitId: number): string {
  return `thumb:${exhibitId}`;
}

export function overlayLogicalKey(exhibitId: number): string {
  return `overlay:${exhibitId}`;
}

export function modelLogicalKey(exhibitId: number): string {
  return `model:${exhibitId}`;
}

export function markerLogicalKey(exhibitId: number): string {
  return `marker:${exhibitId}`;
}
