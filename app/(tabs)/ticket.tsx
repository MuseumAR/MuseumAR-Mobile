import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
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
import { useCreateOrder, useTicketTypes } from '../../src/hooks/useTicketing';
import { useMuseumProfile } from '../../src/hooks/useMuseumProfile';
import { TicketTypeDto } from '../../src/services/apiService';
import { C } from '../../src/theme/colors';

const WEEKDAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

type DayOption = { iso: string; weekday: string; dayMonth: string };

function nextDays(count: number): DayOption[] {
  const out: DayOption[] = [];
  const now = new Date();
  for (let i = 0; i < count; i += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    out.push({
      iso,
      weekday: i === 0 ? 'Hôm nay' : WEEKDAYS[d.getDay()],
      dayMonth: `${d.getDate()}/${d.getMonth() + 1}`,
    });
  }
  return out;
}

export default function TicketScreen() {
  const router = useRouter();
  const { museum } = useMuseumProfile();
  const { types, loading: typesLoading, error: typesError } = useTicketTypes();
  const { submit, submitting } = useCreateOrder();

  const days = useMemo(() => nextDays(7), []);
  const [selectedType, setSelectedType] = useState<TicketTypeDto | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedDate, setSelectedDate] = useState<string>(days[0].iso);

  useEffect(() => {
    if (!selectedType && types.length > 0) {
      setSelectedType(types[0]);
    }
  }, [types, selectedType]);

  const total = (selectedType?.price ?? 0) * quantity;

  const handleConfirm = async () => {
    if (!selectedType) {
      Alert.alert('Chọn loại vé', 'Vui lòng chọn loại vé trước khi đặt.');
      return;
    }
    const result = await submit({
      ticketTypeId: selectedType.id,
      quantity,
    });

    if (result.ok) {
      const status =
        result.browserOutcome === 'success'
          ? 'success'
          : result.browserOutcome === 'cancel'
            ? 'cancel'
            : 'pending';
      router.replace({
        pathname: '/payment-result',
        params: {
          status,
          orderCode: result.order.orderCode ?? '',
          paidBefore: String(result.paidCountBefore),
          checkoutUrl: result.order.checkoutUrl || result.order.paymentUrl || '',
        },
      });
      return;
    }

    if (result.authRequired) {
      Alert.alert('Đăng nhập cần thiết', result.message, [
        { text: 'Huỷ', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/(auth)/login') },
      ]);
      return;
    }

    Alert.alert('Lỗi', result.message);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>Mua vé</Text>
            <Text style={styles.pageSubtitle}>Đặt vé tham quan trực tuyến</Text>
          </View>
          <TouchableOpacity style={styles.myTicketsBtn} onPress={() => router.push('/my-tickets')}>
            <MaterialCommunityIcons name="ticket-account" size={18} color={C.accent} />
            <Text style={styles.myTicketsText}>Vé của tôi</Text>
          </TouchableOpacity>
        </View>

        {/* Museum (fixed) */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Bảo tàng</Text>
          </View>
          <View style={styles.museumRow}>
            <View style={[styles.museumColorDot, { backgroundColor: museum.color }]} />
            <View style={styles.museumInfo}>
              <Text style={styles.museumName}>{museum.name}</Text>
              <Text style={styles.museumCity}>{museum.city}</Text>
            </View>
          </View>
        </View>

        {/* Ticket type */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <Text style={styles.sectionTitle}>Loại vé</Text>
          </View>

          {typesLoading ? (
            <ActivityIndicator color={C.accent} style={{ paddingVertical: 20 }} />
          ) : typesError ? (
            <Text style={styles.errorText}>{typesError}</Text>
          ) : types.length === 0 ? (
            <Text style={styles.emptyText}>Chưa có loại vé nào.</Text>
          ) : (
            <View style={styles.typeGrid}>
              {types.map((t) => {
                const active = selectedType?.id === t.id;
                return (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.typeCard, active && styles.typeCardActive]}
                    onPress={() => setSelectedType(t)}
                  >
                    <Text style={[styles.typeLabel, active && styles.typeLabelActive]}>{t.name}</Text>
                    {t.description ? (
                      <Text style={[styles.typeDesc, active && styles.typeDescActive]} numberOfLines={2}>
                        {t.description}
                      </Text>
                    ) : null}
                    <Text style={[styles.typePrice, active && styles.typeLabelActive]}>
                      {t.price === 0 ? 'Miễn phí' : `${t.price.toLocaleString('vi-VN')}đ`}
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
            <Text style={styles.sectionTitle}>Số lượng vé</Text>
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
            <Text style={styles.qtyNote}>tối đa 10 vé / lần</Text>
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>Ngày tham quan</Text>
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
            <Text style={styles.summaryLabel}>Bảo tàng</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{museum.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Loại vé</Text>
            <Text style={styles.summaryValue}>{selectedType?.name ?? '—'}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Số lượng</Text>
            <Text style={styles.summaryValue}>{quantity} vé</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Tổng cộng</Text>
            <Text style={styles.totalValue}>
              {total === 0 ? 'Miễn phí' : `${total.toLocaleString('vi-VN')}đ`}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.buyBtn, (submitting || !selectedType) && styles.buyBtnDisabled]}
          onPress={handleConfirm}
          disabled={submitting || !selectedType}
        >
          {submitting ? (
            <ActivityIndicator color={C.onAccent} size="small" />
          ) : (
            <>
              <MaterialCommunityIcons name="credit-card-outline" size={22} color={C.onAccent} />
              <Text style={styles.buyBtnText}>Thanh toán với PayOS</Text>
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
