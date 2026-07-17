import { useCallback, useEffect, useState } from 'react';
import {
  apiService,
  CreateOrderRequest,
  CreateOrderResponse,
  getAuthErrorMessage,
  MyTicketDto,
  TicketTypeDto,
} from '../services/apiService';
import { getToken } from '../services/tokenStorage';

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

/** Vé của tôi — GET /Ticketing/my-tickets (JWT Visitor). */
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

type SubmitResult =
  | { ok: true; order: CreateOrderResponse }
  | { ok: false; authRequired?: boolean; message: string };

/** Đặt vé — POST /Ticketing/create-order (JWT Visitor). */
export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (payload: CreateOrderRequest): Promise<SubmitResult> => {
    const token = await getToken();
    if (!token) {
      return { ok: false, authRequired: true, message: 'Vui lòng đăng nhập để đặt vé.' };
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await apiService.createOrder(payload);
      const order = response.data;
      if (!order) {
        return { ok: false, message: response.message || 'Đặt vé thất bại.' };
      }

      // Mock payment confirm when BE returns orderCode (dev flow)
      if (order.orderCode) {
        try {
          await apiService.mockConfirmPayment(order.orderCode);
        } catch (confirmErr) {
          console.warn('mock-confirm failed (order may still be pending):', confirmErr);
        }
      }

      return { ok: true, order };
    } catch (err: unknown) {
      const message = getAuthErrorMessage(err, 'Đặt vé thất bại. Vui lòng thử lại.');
      setError(message);
      return { ok: false, message };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error };
}
