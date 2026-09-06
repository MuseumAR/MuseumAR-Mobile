import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  confirmOrderPayment,
  countPaidTickets,
} from '../src/hooks/useTicketing';
import { useLanguage } from '../src/i18n/LanguageContext';
import { apiService, PendingOrderDto } from '../src/services/apiService';
import {
  clearPaymentCheckoutSession,
  getPaymentCheckoutSession,
  lockPaymentCheckoutSession,
  setPaymentCheckoutSession,
  unlockPaymentCheckoutSession,
} from '../src/services/paymentCheckoutSession';
import { C } from '../src/theme/colors';

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

/** PayOS returns VietQR EMV string; render via public QR image API (no native QR dep). */
function resolveQrImageUri(qrCode: string | null | undefined): string | null {
  const raw = (qrCode ?? '').trim();
  if (!raw) return null;
  if (raw.startsWith('data:') || /^https?:\/\//i.test(raw)) return raw;
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=8&data=${encodeURIComponent(raw)}`;
}

function paramOne(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? '';
  return v ?? '';
}

/**
 * In-app PayOS / VietQR checkout — matches FE payment modal:
 * order summary + QR + open PayOS link + close / cancel.
 */
export default function PaymentCheckoutScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const params = useLocalSearchParams<{
    orderCode?: string | string[];
    checkoutUrl?: string | string[];
    qrCode?: string | string[];
    amount?: string | string[];
    ticketTypeName?: string | string[];
    quantity?: string | string[];
    paidBefore?: string | string[];
  }>();

  const initialOrderCode = paramOne(params.orderCode);
  const paidBeforeParam = Number(paramOne(params.paidBefore) || '');
  const seeded = getPaymentCheckoutSession(initialOrderCode || undefined);
  const paidBefore =
    (Number.isFinite(paidBeforeParam) ? paidBeforeParam : undefined) ??
    seeded?.paidBefore ??
    0;

  const [orderCode, setOrderCode] = useState(
    initialOrderCode || seeded?.orderCode || '',
  );
  const [checkoutUrl, setCheckoutUrl] = useState(
    paramOne(params.checkoutUrl) || seeded?.checkoutUrl || '',
  );
  const [qrCode, setQrCode] = useState(
    paramOne(params.qrCode) || seeded?.qrCode || '',
  );
  const [ticketTypeName, setTicketTypeName] = useState(
    paramOne(params.ticketTypeName) || seeded?.ticketTypeName || '',
  );
  const [quantity, setQuantity] = useState(
    Number(paramOne(params.quantity) || '') || seeded?.quantity || 1,
  );
  const [amount, setAmount] = useState(
    Number(paramOne(params.amount) || '') || seeded?.amount || 0,
  );
  const [secondsLeft, setSecondsLeft] = useState(15 * 60);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const navigatingRef = useRef(false);
  const orderCodeRef = useRef(orderCode);
  orderCodeRef.current = orderCode;

  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const qrUri = useMemo(() => resolveQrImageUri(qrCode), [qrCode]);

  const applyPending = useCallback((pending: PendingOrderDto) => {
    setOrderCode(pending.orderCode);
    if (pending.checkoutUrl) setCheckoutUrl(pending.checkoutUrl);
    if (pending.qrCode) setQrCode(pending.qrCode);
    if (pending.ticketTypeName) setTicketTypeName(pending.ticketTypeName);
    if (pending.quantity != null) setQuantity(pending.quantity);
    if (pending.totalAmount != null) setAmount(Number(pending.totalAmount));
    setSecondsLeft(Math.max(0, pending.remainingSeconds ?? 0));
    setPaymentCheckoutSession({
      orderCode: pending.orderCode,
      checkoutUrl: pending.checkoutUrl,
      qrCode: pending.qrCode,
      amount: pending.totalAmount,
      ticketTypeName: pending.ticketTypeName,
      quantity: pending.quantity,
      paidBefore,
    });
  }, [paidBefore]);

  const refreshPending = useCallback(async () => {
    try {
      const res = await apiService.getPendingOrder(lang);
      if (res.data) {
        applyPending(res.data);
        return res.data;
      }
    } catch {
      // keep seeded params
    }
    return null;
  }, [applyPending, lang]);

  const goResult = useCallback(
    (status: 'success' | 'cancel' | 'pending') => {
      if (navigatingRef.current) return;
      navigatingRef.current = true;
      const code = orderCodeRef.current;
      unlockPaymentCheckoutSession(code);
      if (status === 'success' || status === 'cancel') {
        clearPaymentCheckoutSession(code);
      }
      router.replace({
        pathname: '/payment-result',
        params: {
          status,
          orderCode: code || '',
          paidBefore: String(paidBefore),
          checkoutUrl: checkoutUrl || '',
        },
      });
    },
    [checkoutUrl, paidBefore, router],
  );

  const probePaid = useCallback(async (): Promise<'paid' | 'cancel' | 'pending'> => {
    const code = orderCodeRef.current;
    if (!code) return 'pending';
    const status = await confirmOrderPayment(code);
    if (status.isPaid) return 'paid';
    if (status.isCancelled) return 'cancel';
    // Fallback: webhook may mark tickets Paid even if check-status lags.
    if (paidBefore >= 0) {
      try {
        const list = (await apiService.getMyTickets(lang)).data ?? [];
        if (countPaidTickets(list) > paidBefore) return 'paid';
      } catch {
        // ignore
      }
    }
    return 'pending';
  }, [lang, paidBefore]);

  // Lock so other screens do not regenerate the PayOS link mid-payment.
  useEffect(() => {
    const code = initialOrderCode || seeded?.orderCode || '';
    if (code) lockPaymentCheckoutSession(code);
    return () => {
      unlockPaymentCheckoutSession(code);
    };
  }, [initialOrderCode, seeded?.orderCode]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (initialOrderCode) {
          lockPaymentCheckoutSession(initialOrderCode);
          const status = await confirmOrderPayment(initialOrderCode);
          if (cancelled) return;
          if (status.isPaid) {
            goResult('success');
            return;
          }
          if (status.isCancelled) {
            goResult('cancel');
            return;
          }
        }
        const hasQr = Boolean(
          (qrCode || getPaymentCheckoutSession(initialOrderCode)?.qrCode || '').trim(),
        );
        // Only regenerate PayOS link when we truly have no QR (resume path).
        if (!hasQr) {
          unlockPaymentCheckoutSession(initialOrderCode);
          await refreshPending();
          if (initialOrderCode || orderCodeRef.current) {
            lockPaymentCheckoutSession(initialOrderCode || orderCodeRef.current);
          }
        } else {
          const cached = getPaymentCheckoutSession(initialOrderCode);
          if (cached?.qrCode && !qrCode) setQrCode(cached.qrCode);
          if (cached?.checkoutUrl && !checkoutUrl) {
            setCheckoutUrl(cached.checkoutUrl);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialOrderCode]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft > 0, orderCode]);

  // Poll PayOS + my-tickets until this order is paid.
  useEffect(() => {
    if (!orderCode || loading) return;
    let stopped = false;

    const tick = async () => {
      if (stopped || navigatingRef.current) return;
      const result = await probePaid();
      if (stopped || navigatingRef.current) return;
      if (result === 'paid') goResult('success');
      else if (result === 'cancel') goResult('cancel');
    };

    void tick();
    const id = setInterval(() => {
      void tick();
    }, 2500);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, [goResult, loading, orderCode, probePaid]);

  // When returning from banking / PayOS app, re-check immediately.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' || !orderCodeRef.current || navigatingRef.current) {
        return;
      }
      void (async () => {
        const result = await probePaid();
        if (result === 'paid') goResult('success');
        else if (result === 'cancel') goResult('cancel');
      })();
    });
    return () => sub.remove();
  }, [goResult, probePaid]);

  const handleClose = async () => {
    if (orderCode) {
      setBusy(true);
      try {
        const result = await probePaid();
        if (result === 'paid') {
          goResult('success');
          return;
        }
        if (result === 'cancel') {
          goResult('cancel');
          return;
        }
      } finally {
        setBusy(false);
      }
    }
    goResult('pending');
  };

  const handleCancelOrder = () => {
    if (!orderCode) return;
    Alert.alert(t('ticket.cancelOrder'), t('ticket.cancelOrderConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('ticket.cancelOrder'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await apiService.cancelOrder(orderCode);
            goResult('cancel');
          } catch (err: unknown) {
            Alert.alert(
              t('exhibit.error'),
              err instanceof Error ? err.message : t('ticket.cancelOrderFail'),
            );
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleReloadOrder = async () => {
    setBusy(true);
    try {
      unlockPaymentCheckoutSession(orderCode);
      const pending = await refreshPending();
      if (pending?.orderCode) lockPaymentCheckoutSession(pending.orderCode);
      if (!pending?.qrCode && !pending?.checkoutUrl) {
        Alert.alert(t('exhibit.error'), t('payment.qrMissing'));
      }
    } finally {
      setBusy(false);
    }
  };

  const expired = secondsLeft <= 0;
  const amountLabel =
    amount > 0
      ? `${Number(amount).toLocaleString(locale)} đ`
      : '—';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.headerTextCol}>
          <Text style={styles.title}>{t('payment.checkoutTitle')}</Text>
          {orderCode ? (
            <Text style={styles.orderLine}>
              {t('ticket.orderCode')}: <Text style={styles.orderCode}>{orderCode}</Text>
            </Text>
          ) : null}
        </View>
        <TouchableOpacity
          onPress={handleClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
        >
          <MaterialCommunityIcons name="close" size={24} color={C.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.headerRule} />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={C.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.timerBox}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={C.bronze} />
            <Text style={styles.timerText}>
              {expired
                ? t('payment.orderExpiredBanner')
                : `${t('payment.orderHoldPrefix')} ${formatCountdown(secondsLeft)}. ${t('payment.orderHoldSuffix')}`}
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.label}>{t('ticket.typeLabel')}</Text>
              <Text style={styles.value}>
                {ticketTypeName || t('ticket.defaultName')}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.label}>{t('ticket.qtyLabel')}</Text>
              <Text style={styles.value}>
                {quantity} {t('ticket.ticketUnit')}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.label}>{t('ticket.totalPay')}</Text>
              <Text style={styles.total}>{amountLabel}</Text>
            </View>
          </View>

          <View style={[styles.card, styles.qrCard]}>
            <View style={styles.qrHeader}>
              <MaterialCommunityIcons name="qrcode" size={18} color={C.accent} />
              <Text style={styles.qrHeaderText}>{t('payment.qrSectionTitle')}</Text>
            </View>

            <View style={styles.qrFrame}>
              {qrUri && !expired ? (
                <Image
                  source={{ uri: qrUri }}
                  style={styles.qrImage}
                  resizeMode="contain"
                  accessibilityLabel="PayOS VietQR"
                />
              ) : (
                <View style={styles.qrPlaceholder}>
                  <Text style={styles.qrPlaceholderText}>
                    {expired ? t('payment.qrExpired') : t('payment.qrMissing')}
                  </Text>
                  {!expired ? (
                    <TouchableOpacity
                      style={styles.reloadBtn}
                      onPress={() => void handleReloadOrder()}
                      disabled={busy}
                    >
                      <Text style={styles.reloadBtnText}>{t('payment.reloadOrder')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>

            <Text style={styles.qrHint}>{t('payment.qrHint')}</Text>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btn, styles.btnOutline]}
              onPress={handleClose}
              disabled={busy}
            >
              <Text style={styles.btnOutlineText}>{t('common.close')}</Text>
            </TouchableOpacity>
            {!expired ? (
              <TouchableOpacity
                style={[styles.btn, styles.btnDangerOutline]}
                onPress={handleCancelOrder}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator size="small" color={C.danger} />
                ) : (
                  <Text style={styles.btnDangerText}>{t('ticket.cancelOrderThis')}</Text>
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  headerTextCol: { flex: 1, paddingRight: 12 },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: C.textPrimary,
  },
  orderLine: {
    marginTop: 4,
    fontSize: 14,
    color: C.textSecondary,
  },
  orderCode: {
    color: C.accent,
    fontWeight: '700',
  },
  headerRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: 20,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: {
    padding: 20,
    paddingBottom: 40,
    gap: 14,
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.accentDark,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  timerText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    color: C.textPrimary,
  },
  card: {
    backgroundColor: C.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  label: { fontSize: 14, color: C.textSecondary },
  value: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    color: C.textPrimary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginVertical: 2,
  },
  total: {
    fontSize: 18,
    fontWeight: '800',
    color: C.accent,
  },
  qrCard: {
    backgroundColor: '#F3E8D4',
    alignItems: 'center',
  },
  qrHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'stretch',
  },
  qrHeaderText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    color: C.accent,
  },
  qrFrame: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  qrImage: { width: 240, height: 240 },
  qrPlaceholder: {
    width: 240,
    height: 240,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  qrPlaceholderText: {
    textAlign: 'center',
    color: C.textMuted,
    fontSize: 13,
  },
  qrHint: {
    marginTop: 10,
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    color: C.textSecondary,
  },
  reloadBtn: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.accent + '66',
    backgroundColor: C.accent + '14',
  },
  reloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.accent,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  btn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  btnOutline: {
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bgSurface,
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.textPrimary,
  },
  btnDangerOutline: {
    borderWidth: 1.5,
    borderColor: C.danger + '66',
    backgroundColor: C.bgSurface,
  },
  btnDangerText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.danger,
    textAlign: 'center',
  },
});
