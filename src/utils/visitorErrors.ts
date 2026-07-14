import { ApiError } from '../services/apiService';

/** Expected failures for fire-and-forget visitor analytics — don't spam LogBox. */
export function isIgnorableVisitorError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;
  // No offline pack / exhibit missing / bad body
  if (error.statusCode === 404) return true;
  if (error.statusCode === 400) return true;
  // VisitorId = JWT userId FK miss (Visitors table) — BE not linking User→Visitor yet
  if (error.statusCode === 500) return true;
  if (error.statusCode === 401 || error.statusCode === 403) return true;
  return false;
}
