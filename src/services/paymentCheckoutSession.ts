/**
 * In-memory PayOS checkout payload for the in-app QR screen.
 * VietQR strings are too long for expo-router URL params; keep them here
 * keyed by orderCode instead of stuffing them into the route.
 *
 * While `locked` is true (checkout screen open), callers must NOT hit
 * GET /Ticketing/pending-order — that endpoint recreates the PayOS link and
 * overwrites GatewayTransactionId, so check-status never sees PAID.
 *
 * Countdown must use absolute `expiresAtMs` (not a fresh 15:00) so reopening
 * the checkout screen continues the same payment window.
 */
export type PaymentCheckoutSession = {
  orderCode: string;
  checkoutUrl?: string | null;
  qrCode?: string | null;
  amount?: number | null;
  ticketTypeName?: string | null;
  quantity?: number | null;
  paidBefore?: number;
  /** Wall-clock ms when the 15-min PayOS window ends. */
  expiresAtMs?: number;
};

const PAYMENT_WINDOW_MS = 15 * 60 * 1000;

let session: PaymentCheckoutSession | null = null;
let lockedOrderCode: string | null = null;

/** Absolute expiry from BE pending fields, or now + remaining / 15 min. */
export function expiresAtMsFromPending(pending: {
  expiresAt?: string | null;
  remainingSeconds?: number | null;
}): number {
  const raw = pending.expiresAt?.trim();
  if (raw) {
    const parsed = Date.parse(raw);
    if (Number.isFinite(parsed)) return parsed;
  }
  const rem = pending.remainingSeconds;
  if (rem != null && Number.isFinite(Number(rem))) {
    return Date.now() + Math.max(0, Number(rem)) * 1000;
  }
  return Date.now() + PAYMENT_WINDOW_MS;
}

export function secondsLeftUntil(expiresAtMs?: number | null): number {
  if (expiresAtMs == null || !Number.isFinite(expiresAtMs)) {
    return Math.floor(PAYMENT_WINDOW_MS / 1000);
  }
  return Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
}

export function setPaymentCheckoutSession(
  next: PaymentCheckoutSession | null,
): void {
  if (!next?.orderCode?.trim()) {
    session = null;
    return;
  }
  const orderCode = next.orderCode.trim();
  const prev =
    session?.orderCode === orderCode ? session : null;
  const expiresAtMs =
    next.expiresAtMs != null && Number.isFinite(next.expiresAtMs)
      ? next.expiresAtMs
      : prev?.expiresAtMs;
  session = {
    ...next,
    orderCode,
    expiresAtMs:
      expiresAtMs != null && Number.isFinite(expiresAtMs)
        ? expiresAtMs
        : Date.now() + PAYMENT_WINDOW_MS,
  };
}

export function getPaymentCheckoutSession(
  orderCode?: string | null,
): PaymentCheckoutSession | null {
  if (!session) return null;
  const code = (orderCode ?? '').trim();
  if (code && session.orderCode !== code) return null;
  return session;
}

export function clearPaymentCheckoutSession(orderCode?: string | null): void {
  if (!session) return;
  const code = (orderCode ?? '').trim();
  if (!code || session.orderCode === code) {
    session = null;
  }
  if (code && lockedOrderCode === code) {
    lockedOrderCode = null;
  } else if (!code) {
    lockedOrderCode = null;
  }
}

/** Mark checkout screen active — blocks pending-order regeneration. */
export function lockPaymentCheckoutSession(orderCode: string): void {
  const code = orderCode.trim();
  lockedOrderCode = code || null;
}

export function unlockPaymentCheckoutSession(orderCode?: string | null): void {
  const code = (orderCode ?? '').trim();
  if (!code || lockedOrderCode === code) {
    lockedOrderCode = null;
  }
}

export function isPaymentCheckoutLocked(orderCode?: string | null): boolean {
  if (!lockedOrderCode) return false;
  const code = (orderCode ?? '').trim();
  if (!code) return true;
  return lockedOrderCode === code;
}

/** Build a PendingOrderDto-shaped object from the locked session (no API). */
export function pendingFromCheckoutSession(): {
  orderCode: string;
  checkoutUrl: string | null;
  qrCode: string | null;
  ticketTypeName?: string;
  quantity?: number;
  totalAmount?: number;
  remainingSeconds: number;
  expiresAt?: string;
} | null {
  if (!session?.orderCode) return null;
  if (!isPaymentCheckoutLocked(session.orderCode)) return null;
  const remainingSeconds = secondsLeftUntil(session.expiresAtMs);
  return {
    orderCode: session.orderCode,
    checkoutUrl: session.checkoutUrl ?? null,
    qrCode: session.qrCode ?? null,
    ticketTypeName: session.ticketTypeName ?? undefined,
    quantity: session.quantity ?? undefined,
    totalAmount: session.amount ?? undefined,
    remainingSeconds,
    expiresAt:
      session.expiresAtMs != null
        ? new Date(session.expiresAtMs).toISOString()
        : undefined,
  };
}
