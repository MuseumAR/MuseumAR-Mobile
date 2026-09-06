/**
 * In-memory PayOS checkout payload for the in-app QR screen.
 * VietQR strings are too long for expo-router URL params; keep them here
 * keyed by orderCode instead of stuffing them into the route.
 *
 * While `locked` is true (checkout screen open), callers must NOT hit
 * GET /Ticketing/pending-order — that endpoint recreates the PayOS link and
 * overwrites GatewayTransactionId, so check-status never sees PAID.
 */
export type PaymentCheckoutSession = {
  orderCode: string;
  checkoutUrl?: string | null;
  qrCode?: string | null;
  amount?: number | null;
  ticketTypeName?: string | null;
  quantity?: number | null;
  paidBefore?: number;
};

let session: PaymentCheckoutSession | null = null;
let lockedOrderCode: string | null = null;

export function setPaymentCheckoutSession(
  next: PaymentCheckoutSession | null,
): void {
  session = next?.orderCode?.trim()
    ? {
        ...next,
        orderCode: next.orderCode.trim(),
      }
    : null;
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
} | null {
  if (!session?.orderCode) return null;
  if (!isPaymentCheckoutLocked(session.orderCode)) return null;
  return {
    orderCode: session.orderCode,
    checkoutUrl: session.checkoutUrl ?? null,
    qrCode: session.qrCode ?? null,
    ticketTypeName: session.ticketTypeName ?? undefined,
    quantity: session.quantity ?? undefined,
    totalAmount: session.amount ?? undefined,
    remainingSeconds: 15 * 60,
  };
}
