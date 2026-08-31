import NetInfo from '@react-native-community/netinfo';
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

async function isNetworkOffline(): Promise<boolean> {
  const net = await NetInfo.fetch();
  return net.isConnected === false || net.isInternetReachable === false;
}

// Required so openAuthSessionAsync can dismiss when redirected to our scheme.
WebBrowser.maybeCompleteAuthSession();

const MOCK_TICKET_TYPES: TicketTypeDto[] = [
  {
    id: 1,
    name: 'Vé người lớn',
    nameEn: 'Adult ticket',
    description: 'Áp dụng từ 16 tuổi trở lên',
    descriptionEn: 'Ages 16 and up',
    price: 50000,
    currency: 'VND',
    status: 'Approved',
    isActive: true,
  },
  {
    id: 2,
    name: 'Vé học sinh / sinh viên',
    nameEn: 'Student ticket',
    description: 'Có thẻ học sinh / sinh viên',
    descriptionEn: 'Valid student ID required',
    price: 25000,
    currency: 'VND',
    status: 'Approved',
    isActive: true,
  },
  {
    id: 3,
    name: 'Vé trẻ em',
    nameEn: 'Child ticket',
    description: 'Dưới 16 tuổi',
    descriptionEn: 'Under 16',
    price: 0,
    currency: 'VND',
    status: 'Approved',
    isActive: true,
  },
];

function localizeTicketTypes(types: TicketTypeDto[], lang: string): TicketTypeDto[] {
  if (lang !== 'en') return types;
  return types.map((item) => ({
    ...item,
    name: item.nameEn?.trim() || item.name,
    description: item.descriptionEn?.trim() || item.description,
  }));
}

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
  const { lang, t } = useLanguage();
  const [types, setTypes] = useState<TicketTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    if (await isNetworkOffline()) {
      setTypes([]);
      setError(t('ticket.offlineUnavailable'));
      setLoading(false);
      return;
    }
    try {
      const response = await apiService.getTicketTypes(lang);
      const list = (response.data ?? []).filter(
        (t) => !t.status || t.status.toLowerCase() === 'approved' || t.isActive !== false,
      );
      setTypes(
        localizeTicketTypes(list.length > 0 ? list : MOCK_TICKET_TYPES, lang),
      );
    } catch (err: unknown) {
      setTypes(localizeTicketTypes(MOCK_TICKET_TYPES, lang));
      setError(getAuthErrorMessage(err, 'Đang dùng loại vé mẫu trên thiết bị'));
    } finally {
      setLoading(false);
    }
  }, [lang, t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { types, loading, error, refresh };
}

/** Vé của tôi — GET /Ticketing/my-tickets (JWT + Visitor đã sync). */
export function useMyTickets() {
  const { lang } = useLanguage();
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
      const response = await apiService.getMyTickets(lang);
      setTickets(response.data ?? []);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, 'Không thể tải vé của bạn'));
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  return { tickets, loading, authRequired, error, refresh };
}

/** Active pending PayOS order — GET /Ticketing/pending-order. */
export function usePendingOrder() {
  const { lang } = useLanguage();
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
      const response = await apiService.getPendingOrder(lang);
      setPending(response.data ?? null);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, 'Không thể tải đơn chờ thanh toán'));
      setPending(null);
    } finally {
      setLoading(false);
    }
  }, [lang]);

  return { pending, loading, error, refresh };
}

export type CreateOrderSubmitResult =
  | {
      ok: true;
      order: CreateOrderResponse;
      paidCountBefore: number;
    }
  | { ok: false; authRequired?: boolean; message: string };

/**
 * Create ticket order — does NOT open PayOS browser.
 * Caller navigates to in-app payment-checkout with the order / pending data.
 */
export function useCreateOrder() {
  const { lang, t } = useLanguage();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (payload: CreateOrderRequest): Promise<CreateOrderSubmitResult> => {
      if (await isNetworkOffline()) {
        const message = t('ticket.offlineUnavailable');
        setError(message);
        return { ok: false, message };
      }

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
          const before = await apiService.getMyTickets(lang);
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
        if (!checkoutUrl && !order.qrCode) {
          return {
            ok: false,
            message:
              response.message ||
              'Đơn đã tạo nhưng không nhận được link / QR thanh toán PayOS.',
          };
        }

        return {
          ok: true,
          order,
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
    [lang, t],
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
