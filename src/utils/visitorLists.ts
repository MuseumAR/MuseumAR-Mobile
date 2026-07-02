import { BookmarkDto, VisitedExhibitDto } from '../services/apiService';

/** Keep the most recent visit per exhibit. */
export function uniqueVisitedExhibits(visited: VisitedExhibitDto[]): VisitedExhibitDto[] {
  const byExhibit = new Map<number, VisitedExhibitDto>();
  for (const entry of visited) {
    const existing = byExhibit.get(entry.exhibitId);
    if (!existing || new Date(entry.visitedAt) > new Date(existing.visitedAt)) {
      byExhibit.set(entry.exhibitId, entry);
    }
  }
  return Array.from(byExhibit.values()).sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime(),
  );
}

/** Keep the most recent bookmark per exhibit. */
export function uniqueBookmarks(bookmarks: BookmarkDto[]): BookmarkDto[] {
  const byExhibit = new Map<number, BookmarkDto>();
  for (const entry of bookmarks) {
    const existing = byExhibit.get(entry.exhibitId);
    if (!existing || new Date(entry.createdAt) > new Date(existing.createdAt)) {
      byExhibit.set(entry.exhibitId, entry);
    }
  }
  return Array.from(byExhibit.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function formatVisitorDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
