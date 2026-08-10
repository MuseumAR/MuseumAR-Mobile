import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  apiService,
  CreateOrderRequest,
  CreateOrderResponse,
  getAuthErrorMessage,
  MyTicketDto,
  PendingOrderDto,
  TicketTypeDto,
} from '../services/apiService';
import { useLanguage } from '../i18n/LanguageContext';
import { ensureVisitorSynced } from '../services/ensureVisitorSynced';
import { getToken } from '../services/tokenStorage';

// Required so openAuthSessionAsync can dismiss when redirected to our scheme.
WebBrowser.maybeCompleteAuthSession();

const MOCK_TICKET_TYPES: TicketTypeDto[] = [
  {
    id: 1,
    name: 'Vé người lớn',
    description: 'Áp dụng từ 16 tuổi trở lên',
    price: 50000,
    currency: 'VND',
    status: 'Approved',
    isActive: true,
  },
  {
    id: 2,
    name: 'Vé học sinh / sinh viên',
    description: 'Có thẻ học sinh / sinh viên',
    price: 25000,
    currency: 'VND',
    status: 'Approved',
    isActive: true,
  },
  {
    id: 3,
    name: 'Vé trẻ em',
    description: 'Dưới 16 tuổi',
    price: 0,
    currency: 'VND',
    status: 'Approved',
    isActive: true,
  },
];

export type PaymentBrowserOutcome = 'success' | 'cancel' | 'dismiss' | 'pending';

/** PayOS return URLs — use app scheme so Custom Tabs can hand off into the app. */
export function buildPayOsReturnUrls(orderCode?: string) {
  const redirectBase = 'museumar://payment-result';
  const q = orderCode ? `&orderCode=${encodeURIComponent(orderCode)}` : '';
  return {
    redirectBase,
    success: `${redirectBase}?status=success${q}`,
    cancel: `${redirectBase}?status=cancel${q}`,
  };
}

function parsePaymentUrl(url: string): PaymentBrowserOutcome {
  const u = url.toLowerCase();
  if (
    u.includes('status=cancel') ||
    u.includes('cancel=true') ||
    u.includes('status%3dcancel')
  ) {
    return 'cancel';
  }
  if (u.includes('status=success') || u.includes('status%3dsuccess')) {
    return 'success';
  }
  if (u.includes('payment-result')) {
    return 'success';
  }
  return 'dismiss';
}

/** Open PayOS checkout; returns success | cancel | pending (closed without pay/cancel). */
export async function openPayOsCheckout(
  checkoutUrl: string,
): Promise<PaymentBrowserOutcome> {
  const { redirectBase } = buildPayOsReturnUrls();
  let linkingOutcome: PaymentBrowserOutcome | null = null;
  const linkSub = Linking.addEventListener('url', ({ url }) => {
    const parsed = parsePaymentUrl(url);
    if (parsed === 'dismiss' || parsed === 'pending') return;
    linkingOutcome = parsed;
    try {
      WebBrowser.dismissBrowser();
    } catch {
      // ignore
    }
  });

  try {
    const authResult = await WebBrowser.openAuthSessionAsync(
      checkoutUrl,
      redirectBase,
    );
    if (linkingOutcome === 'success' || linkingOutcome === 'cancel') {
      return linkingOutcome;
    }
    if (authResult.type === 'success' && authResult.url) {
      const parsed = parsePaymentUrl(authResult.url);
      if (parsed === 'cancel') return 'cancel';
      if (parsed === 'success') return 'success';
    }
    // Closed browser without PayOS success/cancel redirect → keep Pending
    return 'pending';
  } finally {
    linkSub.remove();
  }
}

/** Lấy loại vé (GET /Ticketing/types?lang=), fallback mock nếu API lỗi. */
export function useTicketTypes() {
  const { lang } = useLanguage();
  const [types, setTypes] = useState<TicketTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getTicketTypes(lang);
      const list = (response.data ?? []).filter(
        (t) => !t.status || t.status.toLowerCase() === 'approved' || t.isActive !== false,
      );
      setTypes(list.length > 0 ? list : MOCK_TICKET_TYPES);
    } catch (err: unknown) {
      setTypes(MOCK_TICKET_TYPES);
      setError(getAuthErrorMessage(err, 'Đang dùng loại vé mẫu trên thiết bị'));
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { types, loading, error, refresh };
}

/** Vé của tôi — GET /Ticketing/my-tickets (JWT + Visitor đã sync). */
export function useMyTickets() {
  const [tickets, setTickets] = useState<MyTicketDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authRequired, setAuthRequired] = useState(false);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setTickets([]);
      setAuthRequired(true);
      return;
    }
    setAuthRequired(false);
    setLoading(true);
    setError(null);
    try {
      try {
        await ensureVisitorSynced();
      } catch {
        // Still try my-tickets; BE may already have the visitor from login sync.
      }
      const response = await apiService.getMyTickets();
      setTickets(response.data ?? []);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, 'Không thể tải vé của bạn'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tickets, loading, authRequired, error, refresh };
}

/** Active pending PayOS order — GET /Ticketing/pending-order. */
export function usePendingOrder() {
  const [pending, setPending] = useState<PendingOrderDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = await getToken();
    if (!token) {
      setPending(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await ensureVisitorSynced().catch(() => undefined);
      const response = await apiService.getPendingOrder();
      setPending(response.data ?? null);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, 'Không thể tải đơn chờ thanh toán'));
      setPending(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { pending, loading, error, refresh };
}

export type CreateOrderSubmitResult =
  | {
      ok: true;
      order: CreateOrderResponse;
      paymentOpened: boolean;
      browserOutcome: PaymentBrowserOutcome;
      paidCountBefore: number;
    }
  | { ok: false; authRequired?: boolean; message: string };

/**
 * Đặt vé + PayOS:
 * success → Paid screen | cancel → Payment/cancel | close → Pending (resume via pending-order)
 */
export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: CreateOrderRequest): Promise<CreateOrderSubmitResult> => {
      const token = await getToken();
      if (!token) {
        return { ok: false, authRequired: true, message: 'Vui lòng đăng nhập để đặt vé.' };
      }

      setSubmitting(true);
      setError(null);
      try {
        await ensureVisitorSynced();

        let paidCountBefore = 0;
        try {
          const before = await apiService.getMyTickets();
          paidCountBefore = countPaidTickets(before.data ?? []);
        } catch {
          paidCountBefore = 0;
        }

        const response = await apiService.createOrder(payload);
        const order = response.data;
        if (!order) {
          return { ok: false, message: response.message || 'Đặt vé thất bại.' };
        }

        const checkoutUrl = (order.checkoutUrl || order.paymentUrl || '').trim();
        if (!checkoutUrl) {
          return {
            ok: false,
            message:
              response.message ||
              'Đơn đã tạo nhưng không nhận được link thanh toán PayOS.',
          };
        }

        let browserOutcome = await openPayOsCheckout(checkoutUrl);

        // If closed without redirect, webhook may still have paid — quick probe.
        if (browserOutcome === 'pending') {
          const probe = await waitForPaidTickets({
            attempts: 4,
            intervalMs: 1200,
            minCountBefore: paidCountBefore,
          });
          if (probe.confirmed) browserOutcome = 'success';
        }

        if (browserOutcome === 'cancel' && order.orderCode) {
          try {
            await apiService.cancelOrder(order.orderCode);
          } catch (cancelErr) {
            console.warn('Payment/cancel failed:', cancelErr);
          }
        }

        return {
          ok: true,
          order,
          paymentOpened: true,
          browserOutcome,
          paidCountBefore,
        };
      } catch (err: unknown) {
        const message = getAuthErrorMessage(err, 'Đặt vé thất bại. Vui lòng thử lại.');
        setError(message);
        return { ok: false, message };
      } finally {
        setSubmitting(false);
      }
    },
    [],
  );

  return { submit, submitting, error };
}

export function countPaidTickets(tickets: MyTicketDto[]): number {
  return tickets.filter((t) => (t.status ?? '').toLowerCase() === 'paid').length;
}

/**
 * Resolve checkout URL for resume: prefer pending-order, optionally verify status.
 */
export async function resolveResumeCheckout(orderCode?: string): Promise<{
  orderCode?: string;
  checkoutUrl?: string;
  isPaid: boolean;
  isCancelled: boolean;
}> {
  if (orderCode) {
    try {
      const check = await apiService.checkPayment(orderCode);
      if (check.data?.isPaid) {
        return { orderCode, isPaid: true, isCancelled: false };
      }
      if (check.data?.isCancelled || check.data?.valid === false) {
        return { orderCode, isPaid: false, isCancelled: true };
      }
    } catch {
      // continue to pending-order
    }
  }

  try {
    const pendingRes = await apiService.getPendingOrder();
    const pending = pendingRes.data;
    if (pending?.checkoutUrl) {
      return {
        orderCode: pending.orderCode,
        checkoutUrl: pending.checkoutUrl,
        isPaid: false,
        isCancelled: false,
      };
    }
    if (pending && !pending.checkoutUrl) {
      return {
        orderCode: pending.orderCode,
        isPaid: false,
        isCancelled: false,
      };
    }
  } catch {
    // no pending
  }

  return {
    orderCode,
    isPaid: false,
    isCancelled: false,
  };
}

/** Resume an existing Pending PayOS checkout. */
export async function resumePayOsPayment(checkoutUrl: string): Promise<PaymentBrowserOutcome> {
  return openPayOsCheckout(checkoutUrl);
}

/**
 * Poll my-tickets until Paid count increases (webhook lag).
 */
export async function waitForPaidTickets(options?: {
  attempts?: number;
  intervalMs?: number;
  minCountBefore?: number;
}): Promise<{ tickets: MyTicketDto[]; confirmed: boolean }> {
  const attempts = options?.attempts ?? 8;
  const intervalMs = options?.intervalMs ?? 2000;
  const minCountBefore = options?.minCountBefore ?? 0;

  let tickets: MyTicketDto[] = [];
  for (let i = 0; i < attempts; i += 1) {
    try {
      await ensureVisitorSynced().catch(() => undefined);
      const res = await apiService.getMyTickets();
      tickets = res.data ?? [];
      if (countPaidTickets(tickets) > minCountBefore) {
        return { tickets, confirmed: true };
      }
    } catch {
      // keep polling
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return { tickets, confirmed: countPaidTickets(tickets) > minCountBefore };
}
