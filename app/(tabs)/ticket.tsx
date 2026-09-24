import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useCreateOrder, usePendingOrder, useTicketTypes } from '../../src/hooks/useTicketing';
import { useMuseumProfile } from '../../src/hooks/useMuseumProfile';
import { useNetworkStatus } from '../../src/hooks/useNetworkStatus';
import { useLanguage } from '../../src/i18n/LanguageContext';
import {
  TicketTypeDto,
  unitPriceWithPromotion,
} from '../../src/services/apiService';
import { setPaymentCheckoutSession, lockPaymentCheckoutSession } from '../../src/services/paymentCheckoutSession';
import { getSession } from '../../src/services/sessionStorage';
import { C } from '../../src/theme/colors';
import {
  computeGroupPricing,
  GROUP_TIER_30,
  MAX_ORDER_QUANTITY,
} from '../../src/utils/groupTicketPricing';
import { museumLocationLabel } from '../../src/utils/museumLocation';

/** Standard tickets: book up to this many years ahead. */
const STANDARD_MAX_YEARS_AHEAD = 3;
const TYPE_CARD_WIDTH = 200;

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function toIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseIsoDate(value?: string | null): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(d.getTime()) ? null : startOfDay(d);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return startOfDay(d);
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function clampDate(d: Date, min: Date, max: Date): Date {
  if (d < min) return new Date(min);
  if (d > max) return new Date(max);
  return d;
}

function formatExhibitionDate(value?: string | null, lang: 'vi' | 'en' = 'vi'): string {
  if (!value) return '—';
  const d = parseIsoDate(value) ?? new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(lang === 'en' ? 'en-US' : 'vi-VN');
}

function exhibitionPhase(
  startDate?: string | null,
): 'presale' | 'ongoing' | null {
  if (!startDate) return null;
  const start = parseIsoDate(startDate);
  if (!start) return null;
  const today = startOfDay(new Date());
  return start > today ? 'presale' : 'ongoing';
}

function isExhibitionTicket(item: TicketTypeDto | null): boolean {
  if (!item) return false;
  return Boolean(item.exhibitionName || item.exhibitionId);
}

/** Inclusive visit-date window for the selected ticket type. */
function visitDateBounds(type: TicketTypeDto | null): { min: Date; max: Date } | null {
  const today = startOfDay(new Date());
  if (!type) {
    const max = new Date(today);
    max.setFullYear(max.getFullYear() + STANDARD_MAX_YEARS_AHEAD);
    return { min: today, max };
  }

  if (isExhibitionTicket(type)) {
    const start = parseIsoDate(type.exhibitionStartDate);
    const end = parseIsoDate(type.exhibitionEndDate);
    if (!start && !end) {
      const max = new Date(today);
      max.setFullYear(max.getFullYear() + STANDARD_MAX_YEARS_AHEAD);
      return { min: today, max };
    }
    const min = start ? (start > today ? start : today) : today;
    const max = end ?? (() => {
      const d = new Date(min);
      d.setFullYear(d.getFullYear() + 1);
      return d;
    })();
    if (max < min) return null;
    return { min, max };
  }

  const max = new Date(today);
  max.setFullYear(max.getFullYear() + STANDARD_MAX_YEARS_AHEAD);
  return { min: today, max };
}

function rangeYears(min: Date, max: Date): number[] {
  const out: number[] = [];
  for (let y = min.getFullYear(); y <= max.getFullYear(); y += 1) out.push(y);
  return out;
}

function rangeMonths(min: Date, max: Date, year: number): number[] {
  const out: number[] = [];
  const from = year === min.getFullYear() ? min.getMonth() + 1 : 1;
  const to = year === max.getFullYear() ? max.getMonth() + 1 : 12;
  for (let m = from; m <= to; m += 1) out.push(m);
  return out;
}

function rangeDays(min: Date, max: Date, year: number, month: number): number[] {
  const out: number[] = [];
  const dim = daysInMonth(year, month);
  let from = 1;
  let to = dim;
  if (year === min.getFullYear() && month === min.getMonth() + 1) from = min.getDate();
  if (year === max.getFullYear() && month === max.getMonth() + 1) to = max.getDate();
  for (let d = from; d <= to; d += 1) out.push(d);
  return out;
}

function DateChipRow({
  values,
  selected,
  onSelect,
  formatLabel,
}: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
  formatLabel?: (v: number) => string;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.dateChipRow}
    >
      {values.map((v) => {
        const active = v === selected;
        return (
          <TouchableOpacity
            key={v}
            style={[styles.dateChip, active && styles.dateChipActive]}
            onPress={() => onSelect(v)}
          >
            <Text style={[styles.dateChipText, active && styles.dateChipTextActive]}>
              {formatLabel ? formatLabel(v) : String(v)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

export default function TicketScreen() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const { museum } = useMuseumProfile();
  const { types, loading: typesLoading, error: typesError } = useTicketTypes();
  const { submit, submitting } = useCreateOrder();
  const { pending, refresh: refreshPending } = usePendingOrder();
  const { isOffline } = useNetworkStatus();

  const [selectedType, setSelectedType] = useState<TicketTypeDto | null>(null);
  const [selectedPromoId, setSelectedPromoId] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [qtyDraft, setQtyDraft] = useState('1');
  const [selectedDate, setSelectedDate] = useState<string>(() => toIsoDate(startOfDay(new Date())));

  const dateBounds = useMemo(() => visitDateBounds(selectedType), [selectedType]);

  const selectedParts = useMemo(() => {
    const d = parseIsoDate(selectedDate) ?? startOfDay(new Date());
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }, [selectedDate]);

  const yearOptions = useMemo(
    () => (dateBounds ? rangeYears(dateBounds.min, dateBounds.max) : []),
    [dateBounds],
  );
  const monthOptions = useMemo(
    () =>
      dateBounds
        ? rangeMonths(dateBounds.min, dateBounds.max, selectedParts.year)
        : [],
    [dateBounds, selectedParts.year],
  );
  const dayOptions = useMemo(
    () =>
      dateBounds
        ? rangeDays(dateBounds.min, dateBounds.max, selectedParts.year, selectedParts.month)
        : [],
    [dateBounds, selectedParts.year, selectedParts.month],
  );

  const setVisitParts = useCallback(
    (next: { year?: number; month?: number; day?: number }) => {
      if (!dateBounds) return;
      const year = next.year ?? selectedParts.year;
      let month = next.month ?? selectedParts.month;
      let day = next.day ?? selectedParts.day;
      const months = rangeMonths(dateBounds.min, dateBounds.max, year);
      if (!months.includes(month)) month = months[0] ?? 1;
      const days = rangeDays(dateBounds.min, dateBounds.max, year, month);
      if (!days.includes(day)) day = days[0] ?? 1;
      const candidate = new Date(year, month - 1, day);
      const clamped = clampDate(startOfDay(candidate), dateBounds.min, dateBounds.max);
      setSelectedDate(toIsoDate(clamped));
    },
    [dateBounds, selectedParts],
  );

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

  useEffect(() => {
    setSelectedPromoId(null);
  }, [selectedType?.id]);

  // Keep visit date inside the allowed window when type (or bounds) change.
  useEffect(() => {
    if (!dateBounds) return;
    setSelectedDate((prev) => {
      const current = parseIsoDate(prev) ?? dateBounds.min;
      return toIsoDate(clampDate(current, dateBounds.min, dateBounds.max));
    });
  }, [dateBounds]);

  // Group orders (≥30) ignore promotions on BE — clear selection.
  useEffect(() => {
    if (quantity >= GROUP_TIER_30 && selectedPromoId != null) {
      setSelectedPromoId(null);
    }
  }, [quantity, selectedPromoId]);

  useEffect(() => {
    setQtyDraft(String(quantity));
  }, [quantity]);

  const applyQuantity = (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    setQtyDraft(digits);
    if (digits === '') return;
    const n = Number.parseInt(digits, 10);
    if (Number.isNaN(n) || n < 1) return;
    setQuantity(Math.min(MAX_ORDER_QUANTITY, n));
  };

  const commitQuantity = () => {
    const n = Number.parseInt(qtyDraft.replace(/\D/g, ''), 10);
    const next = Number.isNaN(n)
      ? 1
      : Math.min(MAX_ORDER_QUANTITY, Math.max(1, n));
    setQuantity(next);
    setQtyDraft(String(next));
  };

  const basePrice = selectedType ? Number(selectedType.price) || 0 : 0;
  const isGroup = quantity >= GROUP_TIER_30;
  const groupPricing = useMemo(
    () => computeGroupPricing(basePrice, quantity),
    [basePrice, quantity],
  );
  const unitPrice = isGroup
    ? groupPricing.unitPrice
    : selectedType
      ? unitPriceWithPromotion(selectedType, selectedPromoId)
      : 0;
  const total = isGroup ? groupPricing.totalAmount : unitPrice * quantity;
  const promos = !isGroup ? (selectedType?.activePromotions ?? []) : [];
  const exhibitionSelected = isExhibitionTicket(selectedType);
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
      promotionId: isGroup ? null : selectedPromoId,
    });

    if (result.ok) {
      const orderCode = result.order.orderCode ?? '';
      const checkoutUrl =
        result.order.checkoutUrl || result.order.paymentUrl || '';
      const amount = result.order.amount ?? result.order.totalAmount ?? total;
      setPaymentCheckoutSession({
        orderCode,
        checkoutUrl,
        qrCode: result.order.qrCode ?? null,
        amount,
        ticketTypeName: selectedType.name ?? '',
        quantity,
        paidBefore: result.paidCountBefore,
        // Fresh create-order window; reopen uses this absolute deadline.
        expiresAtMs: Date.now() + 15 * 60 * 1000,
      });
      lockPaymentCheckoutSession(orderCode);
      router.push({
        pathname: '/payment-checkout',
        params: {
          orderCode,
          checkoutUrl,
          amount: String(amount),
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

    if (result.emailVerifyRequired) {
      const session = await getSession();
      Alert.alert(t('auth.verifyNeededTitle'), result.message, [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.verifyNeededAction'),
          onPress: () =>
            router.push({
              pathname: '/(auth)/verify-email',
              params: {
                email: session?.email ?? '',
                next: '/(tabs)/ticket',
              },
            }),
        },
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
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.typeRow}
              decelerationRate="fast"
              snapToInterval={TYPE_CARD_WIDTH + 10}
              snapToAlignment="start"
            >
              {types.map((item) => {
                const active = selectedType?.id === item.id;
                const isExhibition = Boolean(item.exhibitionName || item.exhibitionId);
                const phase = exhibitionPhase(item.exhibitionStartDate);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.typeCard, active && styles.typeCardActive]}
                    onPress={() => setSelectedType(item)}
                  >
                    {isExhibition ? (
                      <View style={styles.exhibitionMeta}>
                        <Text
                          style={[styles.exhibitionBadge, active && styles.typeDescActive]}
                          numberOfLines={2}
                        >
                          {t('ticket.exhibitionBadge')}:{' '}
                          {item.exhibitionName?.trim() ||
                            `#${item.exhibitionId}`}
                        </Text>
                        {phase === 'presale' ? (
                          <Text style={[styles.phasePresale, active && styles.typeDescActive]}>
                            {t('ticket.exhibitionPresale')}
                          </Text>
                        ) : phase === 'ongoing' ? (
                          <Text style={[styles.phaseOngoing, active && styles.typeDescActive]}>
                            {t('ticket.exhibitionOngoing')}
                          </Text>
                        ) : null}
                      </View>
                    ) : null}
                    <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{item.name}</Text>
                    {item.description ? (
                      <Text style={[styles.typeDesc, active && styles.typeDescActive]} numberOfLines={2}>
                        {item.description}
                      </Text>
                    ) : null}
                    {isExhibition && (item.exhibitionStartDate || item.exhibitionEndDate) ? (
                      <Text style={[styles.typeDesc, active && styles.typeDescActive]} numberOfLines={2}>
                        {t('ticket.exhibitionRange')}:{' '}
                        {formatExhibitionDate(item.exhibitionStartDate, lang)} –{' '}
                        {formatExhibitionDate(item.exhibitionEndDate, lang)}
                      </Text>
                    ) : null}
                    {phase === 'presale' && item.exhibitionStartDate ? (
                      <Text style={[styles.presaleHint, active && styles.typeDescActive]} numberOfLines={3}>
                        {t('ticket.exhibitionPresaleHint').replace(
                          '{date}',
                          formatExhibitionDate(item.exhibitionStartDate, lang),
                        )}
                      </Text>
                    ) : null}
                    <Text style={[styles.typePrice, active && styles.typeLabelActive]}>
                      {item.price === 0
                        ? t('ticket.free')
                        : `${item.price.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}đ`}
                    </Text>
                    {(item.activePromotions?.length ?? 0) > 0 ? (
                      <Text style={[styles.typePromoBadge, active && styles.typeDescActive]}>
                        {item.activePromotions!.length} KM
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Promotions */}
        {selectedType ? (
          <View style={styles.section}>
            <View style={styles.stepRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepNum}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>{t('ticket.promoSection')}</Text>
            </View>
            {isGroup ? (
              <Text style={styles.emptyText}>{t('ticket.promoDisabledGroup')}</Text>
            ) : promos.length === 0 ? (
              <Text style={styles.emptyText}>{t('ticket.promoEmpty')}</Text>
            ) : (
              <View style={styles.promoList}>
                <TouchableOpacity
                  style={[
                    styles.promoCard,
                    selectedPromoId === null && styles.promoCardActive,
                  ]}
                  onPress={() => setSelectedPromoId(null)}
                >
                  <Text style={styles.promoName}>{t('ticket.promoNone')}</Text>
                  <Text style={styles.promoMeta}>{t('ticket.promoNoneHint')}</Text>
                </TouchableOpacity>
                {promos.map((promo) => {
                  const discountText =
                    promo.discountType === 'Percentage'
                      ? `-${promo.discountValue}%`
                      : `-${Number(promo.discountValue).toLocaleString(
                          lang === 'en' ? 'en-US' : 'vi-VN',
                        )}đ`;
                  const active = selectedPromoId === promo.id;
                  return (
                    <TouchableOpacity
                      key={promo.id}
                      style={[styles.promoCard, active && styles.promoCardHot]}
                      onPress={() => setSelectedPromoId(promo.id)}
                    >
                      <View style={{ flex: 1, paddingRight: 8 }}>
                        <Text style={styles.promoName}>{promo.name}</Text>
                        {promo.description ? (
                          <Text style={styles.promoMeta} numberOfLines={2}>
                            {promo.description}
                          </Text>
                        ) : null}
                      </View>
                      <Text style={styles.promoDiscount}>{discountText}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        ) : null}

        {/* Quantity */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>4</Text>
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
            <TextInput
              style={styles.qtyValue}
              value={qtyDraft}
              onChangeText={applyQuantity}
              onBlur={commitQuantity}
              onSubmitEditing={commitQuantity}
              keyboardType="number-pad"
              selectTextOnFocus
              maxLength={3}
              returnKeyType="done"
              accessibilityLabel={t('ticket.quantity')}
            />
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() =>
                setQuantity((q) => Math.min(MAX_ORDER_QUANTITY, q + 1))
              }
            >
              <MaterialCommunityIcons name="plus" size={20} color={C.textSecondary} />
            </TouchableOpacity>
            <Text style={styles.qtyNote}>{t('ticket.maxQty')}</Text>
          </View>
          {isGroup ? (
            <View style={styles.groupBanner}>
              <MaterialCommunityIcons name="account-group" size={18} color={C.accent} />
              <Text style={styles.groupBannerText}>
                {t('ticket.groupDiscount').replace(
                  '{percent}',
                  String(groupPricing.discountPercent),
                )}
                {groupPricing.focCount > 0
                  ? ` · ${t('ticket.groupFoc').replace('{count}', String(groupPricing.focCount))}`
                  : ''}
              </Text>
            </View>
          ) : (
            <Text style={styles.groupHint}>{t('ticket.groupHint')}</Text>
          )}
        </View>

        {/* Date */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>5</Text>
            </View>
            <Text style={styles.sectionTitle}>{t('ticket.visitDate')}</Text>
          </View>
          {!dateBounds ? (
            <Text style={styles.emptyText}>{t('ticket.dateUnavailable')}</Text>
          ) : (
            <View style={styles.datePicker}>
              {exhibitionSelected ? (
                <Text style={styles.dateHint}>
                  {t('ticket.dateExhibitionHint')
                    .replace(
                      '{start}',
                      formatExhibitionDate(selectedType?.exhibitionStartDate, lang),
                    )
                    .replace(
                      '{end}',
                      formatExhibitionDate(selectedType?.exhibitionEndDate, lang),
                    )}
                </Text>
              ) : null}
              <Text style={styles.dateFieldLabel}>{t('ticket.dateYear')}</Text>
              <DateChipRow
                values={yearOptions}
                selected={selectedParts.year}
                onSelect={(year) => setVisitParts({ year })}
              />
              <Text style={styles.dateFieldLabel}>{t('ticket.dateMonth')}</Text>
              <DateChipRow
                values={monthOptions}
                selected={selectedParts.month}
                onSelect={(month) => setVisitParts({ month })}
                formatLabel={(m) => String(m).padStart(2, '0')}
              />
              <Text style={styles.dateFieldLabel}>{t('ticket.dateDay')}</Text>
              <DateChipRow
                values={dayOptions}
                selected={selectedParts.day}
                onSelect={(day) => setVisitParts({ day })}
                formatLabel={(d) => String(d).padStart(2, '0')}
              />
            </View>
          )}
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
            <Text style={styles.summaryLabel}>
              {isGroup ? t('ticket.unitGroup') : t('ticket.unitAfterPromo')}
            </Text>
            <Text style={styles.summaryValue}>
              {unitPrice === 0
                ? t('ticket.free')
                : `${unitPrice.toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}đ`}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('ticket.qty')}</Text>
            <Text style={styles.summaryValue}>
              {quantity} {t('ticket.qtyUnit')}
              {isGroup && groupPricing.focCount > 0
                ? ` (+${groupPricing.focCount} FOC)`
                : ''}
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>{t('ticket.visitDate')}</Text>
            <Text style={styles.summaryValue}>
              {formatExhibitionDate(selectedDate, lang)}
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

  typeRow: { gap: 10, paddingVertical: 2, paddingRight: 8 },
  typeCard: {
    width: TYPE_CARD_WIDTH,
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
  typePromoBadge: {
    marginTop: 6,
    alignSelf: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: C.danger,
  },
  exhibitionMeta: {
    width: '100%',
    gap: 4,
    marginBottom: 6,
    alignItems: 'center',
  },
  exhibitionBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: C.bronze,
    textAlign: 'center',
  },
  phasePresale: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1D4ED8',
    textAlign: 'center',
  },
  phaseOngoing: {
    fontSize: 10,
    fontWeight: '700',
    color: C.success,
    textAlign: 'center',
  },
  presaleHint: {
    fontSize: 10,
    color: '#1D4ED8',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 14,
  },
  promoList: { gap: 8 },
  promoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 12,
    backgroundColor: C.bgSurface,
  },
  promoCardActive: {
    borderColor: C.accent,
    backgroundColor: C.accent + '12',
  },
  promoCardHot: {
    borderColor: C.danger + '99',
    backgroundColor: C.danger + '10',
  },
  promoName: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
  promoMeta: { fontSize: 12, color: C.textMuted, marginTop: 2 },
  promoDiscount: { fontSize: 14, fontWeight: '800', color: C.danger },

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
  qtyValue: {
    fontSize: 22,
    fontWeight: '800',
    color: C.textPrimary,
    minWidth: 48,
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  qtyNote: { fontSize: 12, color: C.textMuted, flex: 1 },
  groupHint: {
    marginTop: 10,
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
  },
  groupBanner: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: C.accent + '14',
    borderWidth: 1,
    borderColor: C.accent + '44',
  },
  groupBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    lineHeight: 19,
  },

  datePicker: { gap: 8 },
  dateHint: {
    fontSize: 12,
    color: C.textMuted,
    lineHeight: 18,
    marginBottom: 4,
  },
  dateFieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textSecondary,
    marginTop: 4,
  },
  dateChipRow: { gap: 8, paddingVertical: 2 },
  dateChip: {
    minWidth: 52,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    backgroundColor: C.bgElevated,
  },
  dateChipActive: { borderColor: C.accent, backgroundColor: C.accentMuted },
  dateChipText: { fontSize: 14, color: C.textPrimary, fontWeight: '700' },
  dateChipTextActive: { color: C.accent },

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
});
