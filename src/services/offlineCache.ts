import * as FileSystem from 'expo-file-system/legacy';

const CACHE_DIR = `${FileSystem.documentDirectory}offline/`;
const RESPONSES_DIR = `${CACHE_DIR}responses/`;
const INDEX_PATH = `${CACHE_DIR}packs.json`;

export type OfflinePackRecord = {
  id: string;
  museumId?: number;
  versionId?: number;
  checksum?: string | null;
  packageUrl?: string | null;
  downloadedAt: string;
  extractDir?: string;
};

function responsePath(endpoint: string): string {
  const safe = endpoint.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return `${RESPONSES_DIR}${safe}.json`;
}

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

export async function ensureOfflineDirs(): Promise<void> {
  await ensureDir(CACHE_DIR);
  await ensureDir(RESPONSES_DIR);
}

export function isCacheableEndpoint(endpoint: string, method?: string): boolean {
  const verb = (method ?? 'GET').toUpperCase();
  if (verb !== 'GET') return false;
  const path = endpoint.split('?')[0].toLowerCase();
  if (path.startsWith('content/')) return true;
  if (path.startsWith('admin/museum-profile')) return true;
  if (path.startsWith('visitor/sync-check')) return true;
  return false;
}

export async function saveCachedResponse(endpoint: string, payload: unknown): Promise<void> {
  try {
    await ensureOfflineDirs();
    await FileSystem.writeAsStringAsync(responsePath(endpoint), JSON.stringify(payload));
  } catch {
    // ignore cache write errors
  }
}

export async function readCachedResponse<T>(endpoint: string): Promise<T | null> {
  try {
    const path = responsePath(endpoint);
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) return null;
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function readPackIndex(): Promise<Record<string, OfflinePackRecord>> {
  try {
    const info = await FileSystem.getInfoAsync(INDEX_PATH);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(INDEX_PATH);
    return JSON.parse(raw) as Record<string, OfflinePackRecord>;
  } catch {
    return {};
  }
}

export async function writePackIndex(index: Record<string, OfflinePackRecord>): Promise<void> {
  await ensureOfflineDirs();
  await FileSystem.writeAsStringAsync(INDEX_PATH, JSON.stringify(index));
}

export async function markPackDownloaded(record: OfflinePackRecord): Promise<void> {
  const index = await readPackIndex();
  index[record.id] = record;
  await writePackIndex(index);
}

export async function removePackRecord(packId: string): Promise<void> {
  const index = await readPackIndex();
  delete index[packId];
  await writePackIndex(index);
}

export function getPackExtractDir(packId: string): string {
  return `${CACHE_DIR}packs/${packId}/`;
}

export { CACHE_DIR };
