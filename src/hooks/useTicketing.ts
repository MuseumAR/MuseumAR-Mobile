import { useCallback, useEffect, useState } from 'react';
import {
  apiService,
  CreateOrderResponse,
  getAuthErrorMessage,
  MyTicketDto,
  TicketTypeDto,
} from '../services/apiService';
import {
  createLocalOrder,
  loadLocalTickets,
  LocalCreateTicketInput,
} from '../services/localTicketStore';

const MOCK_TICKET_TYPES: TicketTypeDto[] = [
  {
    id: 1,
    name: 'Vé người lớn',
    description: 'Áp dụng từ 16 tuổi trở lên',
    price: 50000,
    currency: 'VND',
    isActive: true,
  },
  {
    id: 2,
    name: 'Vé học sinh / sinh viên',
    description: 'Có thẻ học sinh / sinh viên',
    price: 25000,
    currency: 'VND',
    isActive: true,
  },
  {
    id: 3,
    name: 'Vé trẻ em',
    description: 'Dưới 16 tuổi',
    price: 0,
    currency: 'VND',
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
      const list = response.data ?? [];
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

/** Vé của tôi — mock lưu local trên thiết bị. */
export function useMyTickets() {
  const [tickets, setTickets] = useState<MyTicketDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await loadLocalTickets();
      setTickets(list);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Không thể tải vé local');
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { tickets, loading, authRequired: false, error, refresh };
}

type SubmitResult =
  | { ok: true; order: CreateOrderResponse }
  | { ok: false; authRequired?: boolean; message: string };

export type CreateOrderLocalPayload = LocalCreateTicketInput;

/** Đặt vé — ghi mock data lên thiết bị (không gọi API, không cần đăng nhập). */
export function useCreateOrder() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (payload: CreateOrderLocalPayload): Promise<SubmitResult> => {
    setSubmitting(true);
    setError(null);
    try {
      const { order } = await createLocalOrder(payload);
      return { ok: true, order };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Đặt vé thất bại. Vui lòng thử lại.';
      setError(message);
      return { ok: false, message };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error };
}
