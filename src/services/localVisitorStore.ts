import * as FileSystem from 'expo-file-system/legacy';
import { BookmarkDto, VisitedExhibitDto } from './apiService';
import { DEFAULT_VISITOR_ID } from './sessionStorage';

/**
 * Local mock store for Visitor APIs that cannot target visitorId=1 via JWT
 * (bookmarks / visited-exhibits). All data is scoped to visitor id 1.
 */

const BOOKMARKS_PATH = FileSystem.documentDirectory + 'local_bookmarks_v1.json';
const VISITED_PATH = FileSystem.documentDirectory + 'local_visited_v1.json';

/** Seed vài bookmark mẫu lần đầu (chỉ khi file chưa tồn tại). */
const SEED_BOOKMARKS: BookmarkDto[] = [
  {
    id: 1,
    visitorId: DEFAULT_VISITOR_ID,
    exhibitId: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    visitorId: DEFAULT_VISITOR_ID,
    exhibitId: 3,
    createdAt: new Date().toISOString(),
  },
];

const SEED_VISITED: VisitedExhibitDto[] = [
  {
    id: 1,
    visitorId: DEFAULT_VISITOR_ID,
    exhibitId: 1,
    visitedAt: new Date().toISOString(),
    timeSpentSeconds: 45,
  },
];

async function readJsonFile<T>(path: string, seed: T): Promise<T> {
  try {
    const info = await FileSystem.getInfoAsync(path);
    if (!info.exists) {
      await FileSystem.writeAsStringAsync(path, JSON.stringify(seed));
      return seed;
    }
    const raw = await FileSystem.readAsStringAsync(path);
    return JSON.parse(raw) as T;
  } catch {
    return seed;
  }
}

async function writeJsonFile<T>(path: string, data: T): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(path, JSON.stringify(data));
  } catch (error) {
    console.warn('localVisitorStore write failed:', error);
  }
}

export async function loadLocalBookmarks(): Promise<BookmarkDto[]> {
  return readJsonFile(BOOKMARKS_PATH, SEED_BOOKMARKS);
}

export async function saveLocalBookmarks(list: BookmarkDto[]): Promise<void> {
  await writeJsonFile(BOOKMARKS_PATH, list);
}

export async function loadLocalVisited(): Promise<VisitedExhibitDto[]> {
  return readJsonFile(VISITED_PATH, SEED_VISITED);
}

export async function saveLocalVisited(list: VisitedExhibitDto[]): Promise<void> {
  await writeJsonFile(VISITED_PATH, list);
}

export async function addLocalBookmark(exhibitId: number): Promise<BookmarkDto[]> {
  const list = await loadLocalBookmarks();
  if (list.some((b) => b.exhibitId === exhibitId)) return list;
  const next = [
    {
      id: Date.now(),
      visitorId: DEFAULT_VISITOR_ID,
      exhibitId,
      createdAt: new Date().toISOString(),
    },
    ...list,
  ];
  await saveLocalBookmarks(next);
  return next;
}

export async function removeLocalBookmark(exhibitId: number): Promise<BookmarkDto[]> {
  const list = await loadLocalBookmarks();
  const next = list.filter((b) => b.exhibitId !== exhibitId);
  await saveLocalBookmarks(next);
  return next;
}

export async function recordLocalVisit(
  exhibitId: number,
  timeSpentSeconds: number,
): Promise<VisitedExhibitDto[]> {
  const list = await loadLocalVisited();
  const entry: VisitedExhibitDto = {
    id: Date.now(),
    visitorId: DEFAULT_VISITOR_ID,
    exhibitId,
    visitedAt: new Date().toISOString(),
    timeSpentSeconds,
  };
  // Newest first; keep duplicate history rows like BE would
  const next = [entry, ...list];
  await saveLocalVisited(next);
  return next;
}
