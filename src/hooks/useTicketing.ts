import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useState } from 'react';
import {
  apiService,
  CreateOrderRequest,
  CreateOrderResponse,
  getAuthErrorMessage,
  MyTicketDto,
  TicketTypeDto,
} from '../services/apiService';
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

/** Deep links PayOS should redirect to (needs BE PAYOS_RETURN_URL / create-order support). */
export function buildPayOsReturnUrls(orderCode?: string) {
  const success = Linking.createURL('payment-result', {
    queryParams: {
      status: 'success',
      ...(orderCode ? { orderCode } : {}),
    },
  });
  const cancel = Linking.createURL('payment-result', {
    queryParams: {
      status: 'cancel',
      ...(orderCode ? { orderCode } : {}),
    },
  });
  return { success, cancel };
}

/** Lấy loại vé (GET /Ticketing/types), fallback mock nếu API lỗi. */
export function useTicketTypes() {
  const [types, setTypes] = useState<TicketTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getTicketTypes();
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
  }, []);

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

export type PaymentBrowserOutcome = 'success' | 'cancel' | 'dismiss';

export type CreateOrderSubmitResult =
  | {
      ok: true;
      order: CreateOrderResponse;
      paymentOpened: boolean;
      browserOutcome: PaymentBrowserOutcome;
    }
  | { ok: false; authRequired?: boolean; message: string };

/**
 * Đặt vé + PayOS:
 * 1) POST /Visitor/sync
 * 2) POST /Ticketing/create-order (sends return/cancel deep links when BE supports them)
 * 3) openAuthSessionAsync — closes back into app when redirected to museumar://…
 */
export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (
      payload: Omit<CreateOrderRequest, 'returnUrl' | 'cancelUrl'>,
    ): Promise<CreateOrderSubmitResult> => {
      const token = await getToken();
      if (!token) {
        return { ok: false, authRequired: true, message: 'Vui lòng đăng nhập để đặt vé.' };
      }

      setSubmitting(true);
      setError(null);
      try {
        await ensureVisitorSynced();

        // Placeholder orderCode in URL; real code comes back from create-order.
        // First create without deep-link orderCode, then we open browser with known code on result screen.
        const provisionalUrls = buildPayOsReturnUrls();

        const response = await apiService.createOrder({
          ...payload,
          returnUrl: provisionalUrls.success,
          cancelUrl: provisionalUrls.cancel,
        });
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

        // Prefer URLs that include the real orderCode (works once BE forwards returnUrl).
        const { success: returnUrl, cancel: cancelUrl } = buildPayOsReturnUrls(order.orderCode);

        // Re-send is not possible without recreating the PayOS link; openAuthSession
        // watches for returnUrl. If BE still uses localhost, session ends when user closes browser.
        const authResult = await WebBrowser.openAuthSessionAsync(checkoutUrl, returnUrl);

        let browserOutcome: PaymentBrowserOutcome = 'dismiss';
        if (authResult.type === 'success') {
          const returned = authResult.url ?? '';
          if (returned.includes('status=cancel') || returned.includes(cancelUrl)) {
            browserOutcome = 'cancel';
          } else {
            browserOutcome = 'success';
          }
        } else if (authResult.type === 'cancel' || authResult.type === 'dismiss') {
          browserOutcome = 'dismiss';
        }

        return { ok: true, order, paymentOpened: true, browserOutcome };
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

/**
 * Poll my-tickets until paid tickets appear or timeout.
 * Webhook may lag; this only reads API — does not mark tickets paid.
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
      if (tickets.length > minCountBefore) {
        return { tickets, confirmed: true };
      }
    } catch {
      // keep polling
    }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return { tickets, confirmed: tickets.length > minCountBefore };
}
