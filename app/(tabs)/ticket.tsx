import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateOrder, usePendingOrder, useTicketTypes } from '../../src/hooks/useTicketing';
import { useMuseumProfile } from '../../src/hooks/useMuseumProfile';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { TicketTypeDto } from '../../src/services/apiService';
import { setPaymentCheckoutSession, lockPaymentCheckoutSession } from '../../src/services/paymentCheckoutSession';
import { C } from '../../src/theme/colors';
import { museumLocationLabel } from '../../src/utils/museumLocation';

const WEEKDAYS_VI = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAYS_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type DayOption = { iso: string; weekday: string; dayMonth: string };

function nextDays(count: number, lang: 'vi' | 'en'): DayOption[] {
  const out: DayOption[] = [];
  const now = new Date();
  const weekdays = lang === 'en' ? WEEKDAYS_EN : WEEKDAYS_VI;
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      iso,
      weekday: i === 0 ? (lang === 'en' ? 'Today' : 'Hôm nay') : weekdays[d.getDay()],
      dayMonth: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }
  return out;
}

export default function TicketScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { museum } = useMuseumProfile();
  const { types, loading: typesLoading, error: typesError } = useTicketTypes();
  const { submit, submitting } = useCreateOrder();
  const { pending, refresh: refreshPending } = usePendingOrder();
  const { isOffline } = useNetworkStatus();

  const days = useMemo(() => nextDays(7, lang), [lang]);
  const [selectedType, setSelectedType] = useState<TicketTypeDto | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>(days[0].iso);

  useFocusEffect(
    useCallback(() => {
      void refreshPending();
    }, [refreshPending]),
  );

  useEffect(() => {
    if (types.length === 0) return;
    setSelectedType((current) => {
      if (!current) return types[0];
      return types.find((item) => item.id === current.id) ?? types[0];
    });
  }, [types]);

  const total = (selectedType?.price ?? 0) * quantity;

  const handleConfirm = async () => {
    if (isOffline) {
      Alert.alert(t('ticket.title'), t('ticket.offlineUnavailable'));
      return;
    }

    if (!selectedType) {
      Alert.alert(t('ticket.selectType'), t('ticket.selectTypeHint'));
      return;
    }

    // Newest BE: only one pending order (<15 min). Guide user instead of silent reuse.
    if (pending?.checkoutUrl || pending?.orderCode) {
      Alert.alert(t('ticket.statusPending'), t('ticket.pendingExists'), [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('ticket.continuePayment'),
          onPress: () =>
            router.push({
              pathname: '/payment-checkout',
              params: { orderCode: pending.orderCode ?? '' },
            }),
        },
        {
          text: t('ticket.myTickets'),
          onPress: () => router.push('/my-tickets'),
        },
      ]);
      return;
    }

    const result = await submit({
      ticketTypeId: selectedType.id,
      quantity,
    });

    if (result.ok) {
      const orderCode = result.order.orderCode ?? '';
      const checkoutUrl =
        result.order.checkoutUrl || result.order.paymentUrl || '';
      setPaymentCheckoutSession({
        orderCode,
        checkoutUrl,
        qrCode: result.order.qrCode ?? null,
        amount: result.order.amount ?? result.order.totalAmount ?? total,
        ticketTypeName: selectedType.name ?? '',
        quantity,
        paidBefore: result.paidCountBefore,
      });
      lockPaymentCheckoutSession(orderCode);
      router.push({
        pathname: '/payment-checkout',
        params: {
          orderCode,
          // Short fields only — VietQR is loaded from paymentCheckoutSession
          checkoutUrl,
          amount: String(result.order.amount ?? result.order.totalAmount ?? total),
          ticketTypeName: selectedType.name ?? '',
          quantity: String(quantity),
          paidBefore: String(result.paidCountBefore),
        },
      });
      return;
    }

    if (result.authRequired) {
      Alert.alert(t('auth.loginRequired'), result.message, [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('common.login'), onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    Alert.alert(t('exhibit.error'), result.message);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>{t('ticket.title')}</Text>
            <Text style={styles.pageSubtitle}>{t('ticket.onlineHint')}</Text>
          </View>
          <TouchableOpacity style={styles.myTicketsBtn} onPress={() => router.push('/my-tickets')}>
            <MaterialCommunityIcons name="ticket-account" size={18} color={C.accent} />
            <Text style={styles.myTicketsText}>{t('ticket.myTickets')}</Text>
          </TouchableOpacity>
        </View>

        {pending?.orderCode ? (
          <TouchableOpacity
            style={styles.pendingBanner}
            onPress={() => router.push('/my-tickets')}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="clock-outline" size={18} color={C.accent} />
            <Text style={styles.pendingBannerText}>{t('ticket.pendingExists')}</Text>
          </TouchableOpacity>
        ) : null}

        {isOffline ? (
          <View style={styles.offlineBanner}>
            <MaterialCommunityIcons name="wifi-off" size={18} color={C.danger} />
            <Text style={styles.offlineBannerText}>{t('ticket.offlineBanner')}</Text>
          </View>
        ) : null}

        {/* Museum (fixed) */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>{t('ticket.museum')}</Text>
          </View>
          <View style={styles.museumRow}>
            <View style={[styles.museumColorDot, { backgroundColor: museum.color }]} />
            <View style={styles.museumInfo}>
              <Text style={styles.museumName}>{museum.name}</Text>
              <Text style={styles.museumCity} numberOfLines={2}>
                {museumLocationLabel(museum)}
              </Text>
            </View>
          </View>
        </View>

        {/* Ticket type */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>{t('ticket.type')}</Text>
          </View>

          {typesLoading ? (
            <ActivityIndicator color={C.accent} style={{ paddingVertical: 20 }} />
          ) : typesError ? (
            <Text style={styles.errorText}>{typesError}</Text>
          ) : types.length === 0 ? (
            <Text style={styles.emptyText}>{t('ticket.emptyTypes')}</Text>
          ) : (
            <View style={styles.typeGrid}>
              {types.map((item) => {
                const active = selectedType?.id === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.typeCard, active && styles.typeCardActive]}
                    onPress={() => setSelectedType(item)}
                  >
                    <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{item.name}</Text>
                    {item.description ? (
                      <Text style={[styles.typeDesc, active && styles.typeDescActive]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    <Text style={[styles.typePrice, active && styles.typeLabelActive]}>
                      {item.price === 0
                        ? t('ticket.free')
                        : `${item.price.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}đ`}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* Quantity */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <Text style={styles.sectionTitle}>{t('ticket.quantity')}</Text>
          </View>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.max(1, q - 1))}
            >
              <MaterialCommunityIcons name="minus" size={20} color={C.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.min(10, q + 1))}
            >
              <MaterialCommunityIcons name="plus" size={20} color={C.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.qtyNote}>{t('ticket.maxQty')}</Text>
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>{t('ticket.visitDate')}</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayRow}>
            {days.map((d) => {
              const active = selectedDate === d.iso;
              return (
                <TouchableOpacity
                  key={d.iso}
                  style={[styles.dayChip, active && styles.dayChipActive]}
                  onPress={() => setSelectedDate(d.iso)}
                >
                  <Text style={[styles.dayWeekday, active && styles.dayTextActive]}>{d.weekday}</Text>
                  <Text style={[styles.dayNum, active && styles.dayTextActive]}>{d.dayMonth}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('ticket.museum')}</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{museum.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('ticket.type')}</Text>
            <Text style={styles.summaryValue}>{selectedType?.name ?? '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('ticket.qty')}</Text>
            <Text style={styles.summaryValue}>
              {quantity} {t('ticket.qtyUnit')}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>{t('ticket.total')}</Text>
            <Text style={styles.totalValue}>
              {total === 0
                ? t('ticket.free')
                : `${total.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}đ`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.buyBtn, (submitting || !selectedType || isOffline) && styles.buyBtnDisabled]}
          onPress={handleConfirm}
          disabled={submitting || !selectedType || isOffline}
        >
          {submitting ? (
            <ActivityIndicator color={C.onAccent} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="credit-card-outline" size={22} color={C.onAccent} />
              <Text style={styles.buyBtnText}>
                {submitting ? t('ticket.booking') : t('ticket.confirm')}
              </Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.note}>
          * Sau thanh toán, app mở màn hình kết quả và kiểm tra vé. Vé Paid chỉ xuất hiện khi webhook PayOS tới server.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scroll: { padding: 20, paddingBottom: 40 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.textPrimary },
  pageSubtitle: { fontSize: 14, color: C.textSecondary, marginTop: 4 },
  myTicketsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  myTicketsText: { color: C.accent, fontSize: 13, fontWeight: '700' },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.accent + '14',
    borderWidth: 1,
    borderColor: C.accent + '44',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  pendingBannerText: {
    flex: 1,
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
    fontWeight: '600',
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: C.danger + '12',
    borderWidth: 1,
    borderColor: C.danger + '40',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  offlineBannerText: {
    flex: 1,
    fontSize: 13,
    color: C.danger,
    lineHeight: 18,
    fontWeight: '600',
  },

  section: {
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: C.onAccent, fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textPrimary },

  museumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.accent,
    backgroundColor: C.accentMuted,
    gap: 10,
  },
  museumColorDot: { width: 10, height: 10, borderRadius: 5 },
  museumInfo: { flex: 1 },
  museumName: { fontSize: 13, fontWeight: '700', color: C.textPrimary },
  museumCity: { fontSize: 11, color: C.textMuted, marginTop: 2 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: C.border,
    padding: 12,
    alignItems: 'center',
  },
  typeCardActive: { borderColor: C.accent, backgroundColor: C.accentMuted },
  typeLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary, textAlign: 'center' },
  typeLabelActive: { color: C.accent },
  typeDesc: { fontSize: 11, color: C.textMuted, marginTop: 4, textAlign: 'center' },
  typeDescActive: { color: C.accent },
  typePrice: { fontSize: 13, fontWeight: '800', color: C.textPrimary, marginTop: 8 },

  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bgElevated,
  },
  qtyValue: { fontSize: 22, fontWeight: '800', color: C.textPrimary, minWidth: 30, textAlign: 'center' },
  qtyNote: { fontSize: 12, color: C.textMuted, flex: 1 },

  dayRow: { gap: 10, paddingVertical: 2 },
  dayChip: {
    minWidth: 64,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: C.bgElevated,
  },
  dayChipActive: { borderColor: C.accent, backgroundColor: C.accentMuted },
  dayWeekday: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  dayNum: { fontSize: 14, color: C.textPrimary, fontWeight: '700', marginTop: 4 },
  dayTextActive: { color: C.accent },

  errorText: { color: C.danger, fontSize: 13, paddingVertical: 8 },
  emptyText: { color: C.textMuted, fontSize: 13, paddingVertical: 8 },

  summary: {
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: C.textSecondary },
  summaryValue: { fontSize: 14, fontWeight: '600', color: C.textPrimary, maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: C.divider, marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: C.textPrimary },
  totalValue: { fontSize: 20, fontWeight: '800', color: C.accent },

  buyBtn: {
    flexDirection: 'row',
    backgroundColor: C.accent,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
    minHeight: 54,
  },
  buyBtnDisabled: { opacity: 0.5 },
  buyBtnText: { color: C.onAccent, fontSize: 17, fontWeight: '700' },
  note: { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18 },
});
