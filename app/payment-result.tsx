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
import {
  countPaidTickets,
  openPayOsCheckout,
  waitForPaidTickets,
} from '../src/hooks/useTicketing';
import { apiService, MyTicketDto } from '../src/services/apiService';
import { C } from '../src/theme/colors';

type UiStatus = 'checking' | 'paid' | 'pending' | 'cancel';

export default function PaymentResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    status?: string | string[];
    orderCode?: string | string[];
    paidBefore?: string | string[];
    checkoutUrl?: string | string[];
  }>();

  const statusParam = useMemo(() => {
    const raw = Array.isArray(params.status) ? params.status[0] : params.status;
    return (raw ?? 'pending').toLowerCase();
  }, [params.status]);

  const orderCode = useMemo(() => {
    const raw = Array.isArray(params.orderCode) ? params.orderCode[0] : params.orderCode;
    return (raw ?? '').trim();
  }, [params.orderCode]);

  const paidBefore = useMemo(() => {
    const raw = Array.isArray(params.paidBefore) ? params.paidBefore[0] : params.paidBefore;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }, [params.paidBefore]);

  const initialCheckout = useMemo(() => {
    const raw = Array.isArray(params.checkoutUrl) ? params.checkoutUrl[0] : params.checkoutUrl;
    return (raw ?? '').trim();
  }, [params.checkoutUrl]);

  const [uiStatus, setUiStatus] = useState<UiStatus>(
    statusParam === 'cancel'
      ? 'cancel'
      : statusParam === 'pending'
        ? 'pending'
        : 'checking',
  );
  const [tickets, setTickets] = useState<MyTicketDto[]>([]);
  const [hint, setHint] = useState('');
  const [checkoutUrl, setCheckoutUrl] = useState(initialCheckout);
  const [resuming, setResuming] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (statusParam === 'cancel') {
      setUiStatus('cancel');
      setHint('Bạn đã huỷ thanh toán. Vé được đánh dấu Cancelled.');
      return;
    }

    if (statusParam === 'pending') {
      setUiStatus('pending');
      setHint(
        'Bạn đã đóng PayOS chưa thanh toán. Vé vẫn Pending — có thể mở lại PayOS hoặc xem Vé của tôi.',
      );
      if (orderCode) {
        apiService
          .checkPayment(orderCode)
          .then((res) => {
            const data = res.data;
            if (data?.checkoutUrl) setCheckoutUrl(data.checkoutUrl);
            if (data && data.valid === false) {
              setCheckoutUrl('');
              setHint('Link PayOS đã hết hạn. Vé đã được huỷ (Cancelled).');
              setUiStatus('cancel');
            }
          })
          .catch(() => undefined);
      }
      return;
    }

    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      setUiStatus('checking');
      setHint('Đang kiểm tra vé đã thanh toán…');

      const { tickets: list, confirmed } = await waitForPaidTickets({
        attempts: 20,
        intervalMs: 1500,
        minCountBefore: paidBefore,
      });

      if (cancelled) return;
      setTickets(list);

      if (confirmed || countPaidTickets(list) > paidBefore) {
        setUiStatus('paid');
        setHint('Thanh toán thành công — vé đã sẵn sàng.');
      } else {
        setUiStatus('pending');
        setHint(
          'Chưa xác nhận Paid. Bạn có thể mở lại PayOS hoặc kiểm tra Vé của tôi sau vài giây.',
        );
        if (orderCode) {
          try {
            const check = await apiService.checkPayment(orderCode);
            if (check.data?.checkoutUrl) setCheckoutUrl(check.data.checkoutUrl);
            if (check.data && check.data.valid === false) {
              setCheckoutUrl('');
              setUiStatus('cancel');
              setHint('Link PayOS đã hết hạn. Vé đã được huỷ (Cancelled).');
            }
          } catch {
            // keep pending
          }
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [statusParam, paidBefore, orderCode]);

  const handleResume = async () => {
    let url = checkoutUrl;
    if (orderCode) {
      try {
        const check = await apiService.checkPayment(orderCode);
        if (check.data && check.data.valid === false) {
          setCheckoutUrl('');
          setUiStatus('cancel');
          setHint('Link PayOS đã hết hạn. Vé đã được huỷ (Cancelled).');
          return;
        }
        if (check.data?.checkoutUrl) {
          url = check.data.checkoutUrl;
          setCheckoutUrl(url);
        }
      } catch {
        // use cached url
      }
    }
    if (!url) return;

    setResuming(true);
    try {
      const before = countPaidTickets(tickets);
      const outcome = await openPayOsCheckout(url);
      if (outcome === 'success') {
        const probe = await waitForPaidTickets({
          attempts: 12,
          intervalMs: 1500,
          minCountBefore: before,
        });
        setTickets(probe.tickets);
        setUiStatus(probe.confirmed ? 'paid' : 'pending');
        setHint(
          probe.confirmed
            ? 'Thanh toán thành công — vé đã sẵn sàng.'
            : 'Đang chờ xác nhận thanh toán…',
        );
      } else if (outcome === 'cancel') {
        if (orderCode) {
          try {
            await apiService.cancelOrder(orderCode);
          } catch {
            // ignore
          }
        }
        setUiStatus('cancel');
        setHint('Bạn đã huỷ thanh toán. Vé được đánh dấu Cancelled.');
        setCheckoutUrl('');
      } else {
        setUiStatus('pending');
        setHint('Vẫn chưa thanh toán. Bạn có thể mở lại PayOS hoặc vào Vé của tôi.');
      }
    } finally {
      setResuming(false);
    }
  };

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
        ? 'Thanh toán đã huỷ'
        : uiStatus === 'pending'
          ? 'Chờ thanh toán'
          : 'Đang kiểm tra…';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        {uiStatus === 'checking' || resuming ? (
          <ActivityIndicator size="large" color={C.accent} />
        ) : (
          <MaterialCommunityIcons name={icon as 'check-circle'} size={64} color={iconColor} />
        )}

        <Text style={styles.title}>{title}</Text>
        {orderCode ? <Text style={styles.orderCode}>Mã đơn: {orderCode}</Text> : null}
        <Text style={styles.hint}>{hint}</Text>

        {uiStatus === 'paid' && tickets.length > 0 ? (
          <Text style={styles.meta}>{countPaidTickets(tickets)} vé đã thanh toán</Text>
        ) : null}

        <View style={styles.actions}>
          {uiStatus === 'pending' && checkoutUrl ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleResume}
              disabled={resuming}
            >
              <Text style={styles.primaryText}>Tiếp tục thanh toán PayOS</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={
              uiStatus === 'pending' && checkoutUrl ? styles.secondaryBtn : styles.primaryBtn
            }
            onPress={() => router.replace('/my-tickets')}
          >
            <Text
              style={
                uiStatus === 'pending' && checkoutUrl
                  ? styles.secondaryText
                  : styles.primaryText
              }
            >
              Vé của tôi
            </Text>
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
