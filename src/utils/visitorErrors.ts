import { ApiError } from '../services/apiService';

/** Expected failures for fire-and-forget visitor analytics — don't spam LogBox. */
export function isIgnorableVisitorError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  // Mock exhibit IDs may not exist on backend yet
  if (error.statusCode === 404) return true;
  if (error.statusCode === 400 && /exhibit not found/i.test(error.message)) return true;
  return false;
}
