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
  resolveResumeCheckout,
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

  const orderCodeParam = useMemo(() => {
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
  const [orderCode, setOrderCode] = useState(orderCodeParam);
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
        'Bạn đã đóng PayOS chưa thanh toán. Đơn vẫn Pending — có thể mở lại PayOS hoặc xem Vé của tôi.',
      );
      void resolveResumeCheckout(orderCodeParam || undefined).then((res) => {
        if (res.isPaid) {
          setUiStatus('paid');
          setHint('Thanh toán thành công — vé đã sẵn sàng.');
          return;
        }
        if (res.isCancelled) {
          setCheckoutUrl('');
          setUiStatus('cancel');
          setHint('Link PayOS đã hết hạn hoặc đơn đã huỷ.');
          return;
        }
        if (res.orderCode) setOrderCode(res.orderCode);
        if (res.checkoutUrl) setCheckoutUrl(res.checkoutUrl);
      });
      return;
    }

    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      setUiStatus('checking');
      setHint('Đang kiểm tra vé đã thanh toán…');

      if (orderCodeParam) {
        try {
          const check = await apiService.checkPayment(orderCodeParam);
          if (check.data?.isPaid) {
            const list = (await apiService.getMyTickets()).data ?? [];
            if (cancelled) return;
            setTickets(list);
            setUiStatus('paid');
            setHint('Thanh toán thành công — vé đã sẵn sàng.');
            return;
          }
          if (check.data?.isCancelled) {
            if (cancelled) return;
            setUiStatus('cancel');
            setHint('Thanh toán đã huỷ hoặc hết hạn.');
            return;
          }
        } catch {
          // fall through to poll my-tickets
        }
      }

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
        const resume = await resolveResumeCheckout(orderCodeParam || undefined);
        if (resume.isCancelled) {
          setCheckoutUrl('');
          setUiStatus('cancel');
          setHint('Link PayOS đã hết hạn hoặc đơn đã huỷ.');
        } else {
          if (resume.orderCode) setOrderCode(resume.orderCode);
          if (resume.checkoutUrl) setCheckoutUrl(resume.checkoutUrl);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [statusParam, paidBefore, orderCodeParam]);

  const handleResume = async () => {
    setResuming(true);
    try {
      const resume = await resolveResumeCheckout(orderCode || undefined);
      if (resume.isPaid) {
        const list = (await apiService.getMyTickets()).data ?? [];
        setTickets(list);
        setUiStatus('paid');
        setHint('Thanh toán thành công — vé đã sẵn sàng.');
        return;
      }
      if (resume.isCancelled) {
        setCheckoutUrl('');
        setUiStatus('cancel');
        setHint('Link PayOS đã hết hạn hoặc đơn đã huỷ.');
        return;
      }

      const url = resume.checkoutUrl || checkoutUrl;
      if (resume.orderCode) setOrderCode(resume.orderCode);
      if (resume.checkoutUrl) setCheckoutUrl(resume.checkoutUrl);
      if (!url) return;

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
        const code = resume.orderCode || orderCode;
        if (code) {
          try {
            await apiService.cancelOrder(code);
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

  const canResume = uiStatus === 'pending' && Boolean(checkoutUrl);

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
          {canResume ? (
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleResume}
              disabled={resuming}
            >
              <Text style={styles.primaryText}>Tiếp tục thanh toán PayOS</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={canResume ? styles.secondaryBtn : styles.primaryBtn}
            onPress={() => router.replace('/my-tickets')}
          >
            <Text style={canResume ? styles.secondaryText : styles.primaryText}>
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
