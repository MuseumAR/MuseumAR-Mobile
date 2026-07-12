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

/** Lấy loại vé (GET /Ticketing/types). */
export function useTicketTypes() {
  const [types, setTypes] = useState<TicketTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getTicketTypes();
      setTypes(response.data ?? []);
    } catch (err: unknown) {
      setError(getAuthErrorMessage(err, 'Không thể tải loại vé'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { types, loading, error, refresh };
}

/** Danh sách vé của tôi (GET /Ticketing/my-tickets) — yêu cầu đăng nhập. */
export function useMyTickets() {
  const [tickets, setTickets] = useState<MyTicketDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [authRequired, setAuthRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setError(getAuthErrorMessage(err, 'Không thể tải danh sách vé'));
    } finally {
      setLoading(false);
    }
  }, []);

  return { tickets, loading, authRequired, error, refresh };
}

type SubmitResult =
  | { ok: true; order: CreateOrderResponse }
  | { ok: false; authRequired?: boolean; message: string };

/** Đặt vé (POST /Ticketing/create-order) — yêu cầu đăng nhập. */
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
      return { ok: true, order: response.data };
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
