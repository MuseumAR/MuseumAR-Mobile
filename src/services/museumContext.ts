/** Cache id bảo tàng đã resolve từ GET /Admin/museum-profile. */
let cachedMuseumId: number | null = null;

export function setCachedMuseumId(id: number | null | undefined): void {
  if (id != null && Number.isFinite(id) && id > 0) {
    cachedMuseumId = id;
  }
}

export function getCachedMuseumId(): number | null {
  return cachedMuseumId;
}
