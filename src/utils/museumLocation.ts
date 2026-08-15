import { Linking } from 'react-native';
import type { MuseumRecord } from '../data/museums';

function isBlankLocation(value?: string | null): boolean {
  const trimmed = value?.trim();
  return !trimmed || trimmed === '—';
}

/** Street address for display; fall back to city if address is empty. */
export function museumLocationLabel(
  museum: Pick<MuseumRecord, 'address' | 'city'>,
): string {
  if (!isBlankLocation(museum.address)) return museum.address.trim();
  if (!isBlankLocation(museum.city)) return museum.city.trim();
  return '';
}

export function canOpenMuseumMap(
  museum: Pick<MuseumRecord, 'address' | 'city' | 'latitude' | 'longitude'>,
): boolean {
  const lat = museum.latitude;
  const lng = museum.longitude;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    return true;
  }
  return museumLocationLabel(museum).length > 0;
}

/** Open Google Maps at the museum coordinates, or search by address. */
export function openMuseumMap(
  museum: Pick<MuseumRecord, 'address' | 'city' | 'latitude' | 'longitude'>,
): void {
  const lat = museum.latitude;
  const lng = museum.longitude;
  let query: string;
  if (lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng)) {
    query = `${lat},${lng}`;
  } else {
    query = museumLocationLabel(museum);
  }
  if (!query) return;
  void Linking.openURL(
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`,
  );
}
