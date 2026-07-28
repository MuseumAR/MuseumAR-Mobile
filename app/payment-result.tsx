import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { waitForPaidTickets } from '../src/hooks/useTicketing';
import { apiService, MyTicketDto } from '../src/services/apiService';
import { C } from '../src/theme/colors';

type UiStatus = 'checking' | 'paid' | 'pending' | 'cancel';

/**
 * Shown after PayOS browser closes (or via museumar://payment-result deep link).
 * Polls my-tickets — Paid appears only after BE webhook (not controlled by mobile).
 */
export default function PaymentResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    status?: string | string[];
    orderCode?: string | string[];
  }>();

  const statusParam = useMemo(() => {
    const raw = Array.isArray(params.status) ? params.status[0] : params.status;
    return (raw ?? 'dismiss').toLowerCase();
  }, [params.status]);

  const orderCode = useMemo(() => {
    const raw = Array.isArray(params.orderCode) ? params.orderCode[0] : params.orderCode;
    return (raw ?? '').trim();
  }, [params.orderCode]);

  const [uiStatus, setUiStatus] = useState<UiStatus>(
    statusParam === 'cancel' ? 'cancel' : 'checking',
  );
  const [tickets, setTickets] = useState<MyTicketDto[]>([]);
  const [hint, setHint] = useState('');
  const started = useRef(false);

  useEffect(() => {
    if (statusParam === 'cancel') {
      setUiStatus('cancel');
      setHint('Bạn đã huỷ thanh toán. Đơn vẫn Pending trên hệ thống cho đến khi hết hạn / xử lý phía BE.');
      return;
    }

    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      setUiStatus('checking');
      setHint('Đang kiểm tra vé đã thanh toán…');

      let beforeCount = 0;
      try {
        const before = await apiService.getMyTickets();
        beforeCount = before.data?.length ?? 0;
      } catch {
        beforeCount = 0;
      }

      const { tickets: list, confirmed } = await waitForPaidTickets({
        attempts: 10,
        intervalMs: 2000,
        minCountBefore: beforeCount,
      });

      if (cancelled) return;
      setTickets(list);

      if (confirmed) {
        setUiStatus('paid');
        setHint('Thanh toán thành công — vé đã sẵn sàng.');
      } else {
        setUiStatus('pending');
        setHint(
          'Chưa thấy vé Paid. Nếu bạn đã chuyển khoản, webhook PayOS có thể chưa tới server (cần URL public). Kéo lại “Vé của tôi” sau vài phút.',
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [statusParam]);

  const icon =
    uiStatus === 'paid'
      ? 'check-circle'
      : uiStatus === 'cancel'
        ? 'close-circle'
        : uiStatus === 'pending'
          ? 'clock-outline'
          : 'timer-sand';

  const iconColor =
    uiStatus === 'paid'
      ? C.success
      : uiStatus === 'cancel'
        ? C.danger
        : uiStatus === 'pending'
          ? C.accent
          : C.textMuted;

  const title =
    uiStatus === 'paid'
      ? 'Thanh toán thành công'
      : uiStatus === 'cancel'
        ? 'Đã huỷ thanh toán'
        : uiStatus === 'pending'
          ? 'Đang chờ xác nhận'
          : 'Đang kiểm tra…';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        {uiStatus === 'checking' ? (
          <ActivityIndicator size="large" color={C.accent} />
        ) : (
          <MaterialCommunityIcons name={icon as 'check-circle'} size={64} color={iconColor} />
        )}

        <Text style={styles.title}>{title}</Text>
        {orderCode ? <Text style={styles.orderCode}>Mã đơn: {orderCode}</Text> : null}
        <Text style={styles.hint}>{hint}</Text>

        {uiStatus === 'paid' && tickets.length > 0 ? (
          <Text style={styles.meta}>{tickets.length} vé trong tài khoản</Text>
        ) : null}

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => router.replace('/my-tickets')}
          >
            <Text style={styles.primaryText}>Vé của tôi</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)/ticket')}
          >
            <Text style={styles.secondaryText}>Về mua vé</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  body: {
    flex: 1,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '800',
    color: C.textPrimary,
    textAlign: 'center',
  },
  orderCode: { fontSize: 13, color: C.textMuted, fontWeight: '600' },
  hint: {
    fontSize: 14,
    color: C.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 4,
  },
  meta: { fontSize: 13, color: C.success, fontWeight: '700', marginTop: 4 },
  actions: { width: '100%', gap: 10, marginTop: 28 },
  primaryBtn: {
    backgroundColor: C.accent,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryText: { color: C.onAccent, fontWeight: '700', fontSize: 15 },
  secondaryBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bgSurface,
  },
  secondaryText: { color: C.textSecondary, fontWeight: '600', fontSize: 15 },
});
