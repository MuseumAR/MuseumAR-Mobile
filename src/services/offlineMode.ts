import { hasDownloadedPacks } from './offlineCache';
import { getToken } from './tokenStorage';

export { hasDownloadedPacks };

export function isTicketingEndpoint(endpoint: string): boolean {
  const path = endpoint.split('?')[0].toLowerCase();
  return path.startsWith('ticketing/') || path.startsWith('payment/');
}

export async function isGuestSession(): Promise<boolean> {
  const token = (await getToken())?.trim();
  return !token;
}

/**
 * Downloaded museum content is only served without a network when the user is a guest.
 * Tickets / PayOS never use this path.
 */
export async function canUseOfflineContent(): Promise<boolean> {
  if (!(await isGuestSession())) return false;
  return hasDownloadedPacks();
}
