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
  confirmOrderPayment,
  countPaidTickets,
  resolveResumeCheckout,
  waitForPaidTickets,
} from '../src/hooks/useTicketing';
import { useLanguage } from '../src/i18n/LanguageContext';
import { apiService, MyTicketDto } from '../src/services/apiService';
import { C } from '../src/theme/colors';

type UiStatus = 'checking' | 'paid' | 'pending' | 'cancel';

type HintKey =
  | 'payment.cancelHint'
  | 'payment.pendingHint'
  | 'payment.successHint'
  | 'payment.expiredHint'
  | 'payment.checkingHint'
  | 'payment.notConfirmed'
  | 'payment.cancelOrExpiredHint';

export default function PaymentResultScreen() {
  const router = useRouter();
  const { t } = useLanguage();
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
  const [hintKey, setHintKey] = useState<HintKey>(
    statusParam === 'cancel'
      ? 'payment.cancelHint'
      : statusParam === 'pending'
        ? 'payment.pendingHint'
        : 'payment.checkingHint',
  );
  const [orderCode, setOrderCode] = useState(orderCodeParam);
  const [checkoutUrl, setCheckoutUrl] = useState(initialCheckout);
  const started = useRef(false);

  useEffect(() => {
    if (statusParam === 'cancel') {
      setUiStatus('cancel');
      setHintKey('payment.cancelHint');
      return;
    }

    if (statusParam === 'pending') {
      setUiStatus('pending');
      setHintKey('payment.pendingHint');
      void (async () => {
        if (orderCodeParam) {
          const status = await confirmOrderPayment(orderCodeParam);
          if (status.isPaid) {
            const list = (await apiService.getMyTickets()).data ?? [];
            setTickets(list);
            setUiStatus('paid');
            setHintKey('payment.successHint');
            return;
          }
          if (status.isCancelled) {
            setCheckoutUrl('');
            setUiStatus('cancel');
            setHintKey('payment.expiredHint');
            return;
          }
        }
        const res = await resolveResumeCheckout(orderCodeParam || undefined);
        if (res.isPaid) {
          setUiStatus('paid');
          setHintKey('payment.successHint');
          return;
        }
        if (res.isCancelled) {
          setCheckoutUrl('');
          setUiStatus('cancel');
          setHintKey('payment.expiredHint');
          return;
        }
        if (res.orderCode) setOrderCode(res.orderCode);
        if (res.checkoutUrl) setCheckoutUrl(res.checkoutUrl);
      })();
      return;
    }

    if (started.current) return;
    started.current = true;

    let cancelled = false;
    (async () => {
      setUiStatus('checking');
      setHintKey('payment.checkingHint');

      if (orderCodeParam) {
        // Poll this order specifically (updates BE Pending → Completed).
        for (let i = 0; i < 12; i += 1) {
          const status = await confirmOrderPayment(orderCodeParam);
          if (cancelled) return;
          if (status.isPaid) {
            const list = (await apiService.getMyTickets()).data ?? [];
            if (cancelled) return;
            setTickets(list);
            setUiStatus('paid');
            setHintKey('payment.successHint');
            return;
          }
          if (status.isCancelled) {
            setUiStatus('cancel');
            setHintKey('payment.cancelOrExpiredHint');
            return;
          }
          if (i < 11) {
            await new Promise((r) => setTimeout(r, 1500));
          }
        }
      } else {
        // No order code — fall back to paid-count increase only.
        const { tickets: list, confirmed } = await waitForPaidTickets({
          attempts: 20,
          intervalMs: 1500,
          minCountBefore: paidBefore,
        });
        if (cancelled) return;
        setTickets(list);
        if (confirmed || countPaidTickets(list) > paidBefore) {
          setUiStatus('paid');
          setHintKey('payment.successHint');
          return;
        }
      }

      if (cancelled) return;
      setUiStatus('pending');
      setHintKey('payment.notConfirmed');
      const resume = await resolveResumeCheckout(orderCodeParam || undefined);
      if (resume.isCancelled) {
        setCheckoutUrl('');
        setUiStatus('cancel');
        setHintKey('payment.expiredHint');
      } else {
        if (resume.orderCode) setOrderCode(resume.orderCode);
        if (resume.checkoutUrl) setCheckoutUrl(resume.checkoutUrl);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [statusParam, paidBefore, orderCodeParam]);

  // Poll Payment/check-status while pending (matches WebBE 15-min window + webhook lag).
  useEffect(() => {
    if (uiStatus !== 'pending') return;
    const code = orderCode || orderCodeParam;
    if (!code) return;

    let cancelled = false;
    const tick = async () => {
      const status = await confirmOrderPayment(code);
      if (cancelled) return;
      if (status.isPaid) {
        const list = (await apiService.getMyTickets()).data ?? [];
        if (cancelled) return;
        setTickets(list);
        setUiStatus('paid');
        setHintKey('payment.successHint');
        return;
      }
      if (status.isCancelled) {
        setCheckoutUrl('');
        setUiStatus('cancel');
        setHintKey('payment.expiredHint');
      }
    };

    void tick();
    const id = setInterval(() => {
      void tick();
    }, 3000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [uiStatus, orderCode, orderCodeParam]);

  const handleResume = () => {
    const code = orderCode || orderCodeParam;
    if (!code) return;
    router.push({
      pathname: '/payment-checkout',
      params: {
        orderCode: code,
        checkoutUrl: checkoutUrl || '',
        paidBefore: String(paidBefore),
      },
    });
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
      ? t('payment.success')
      : uiStatus === 'cancel'
        ? t('payment.cancelled')
        : uiStatus === 'pending'
          ? t('payment.pending')
          : t('payment.checking');

  const canResume = uiStatus === 'pending' && Boolean(orderCode || orderCodeParam);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.body}>
        {uiStatus === 'checking' ? (
          <ActivityIndicator size="large" color={C.accent} />
        ) : (
          <MaterialCommunityIcons name={icon as 'check-circle'} size={64} color={iconColor} />
        )}

        <Text style={styles.title}>{title}</Text>
        {orderCode ? (
          <Text style={styles.orderCode}>
            {t('payment.orderCodeLine').replace('{code}', orderCode)}
          </Text>
        ) : null}
        <Text style={styles.hint}>{t(hintKey)}</Text>

        {uiStatus === 'paid' && tickets.length > 0 ? (
          <Text style={styles.meta}>
            {t('payment.paidCount').replace(
              '{count}',
              String(countPaidTickets(tickets)),
            )}
          </Text>
        ) : null}

        <View style={styles.actions}>
          {canResume ? (
            <TouchableOpacity style={styles.primaryBtn} onPress={handleResume}>
              <Text style={styles.primaryText}>{t('payment.resume')}</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={canResume ? styles.secondaryBtn : styles.primaryBtn}
            onPress={() => router.replace('/my-tickets')}
          >
            <Text style={canResume ? styles.secondaryText : styles.primaryText}>
              {t('payment.myTickets')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)/ticket')}
          >
            <Text style={styles.secondaryText}>{t('payment.backToBuy')}</Text>
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
