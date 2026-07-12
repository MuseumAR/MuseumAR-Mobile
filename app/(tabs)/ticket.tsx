import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CURRENT_MUSEUM } from '../../src/data/museums';
import { C } from '../../src/theme/colors';

const TICKET_TYPES = [
  { id: 'adult', label: 'Người lớn', desc: 'Từ 18 tuổi trở lên', multiplier: 1 },
  { id: 'student', label: 'Học sinh / SV', desc: 'Xuất trình thẻ học sinh', multiplier: 0.5 },
  { id: 'child', label: 'Trẻ em', desc: 'Dưới 15 tuổi', multiplier: 0 },
  { id: 'senior', label: 'Người cao tuổi', desc: 'Từ 60 tuổi trở lên', multiplier: 0.5 },
];

export default function TicketScreen() {
  const museum = CURRENT_MUSEUM;
  const [selectedType, setSelectedType] = useState(TICKET_TYPES[0]);
  const [quantity, setQuantity] = useState(1);

  const total = museum.ticketPriceVnd * selectedType.multiplier * quantity;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Mua vé</Text>
        <Text style={styles.pageSubtitle}>Đặt vé tham quan trực tuyến</Text>

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
            <Text style={styles.museumPrice}>
              {museum.ticketPriceVnd.toLocaleString('vi-VN')}đ
            </Text>
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
          <View style={styles.typeGrid}>
            {TICKET_TYPES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.typeCard, selectedType.id === t.id && styles.typeCardActive]}
                onPress={() => setSelectedType(t)}
              >
                <Text style={[styles.typeLabel, selectedType.id === t.id && styles.typeLabelActive]}>
                  {t.label}
                </Text>
                <Text style={[styles.typeDesc, selectedType.id === t.id && styles.typeDescActive]}>
                  {t.multiplier === 0
                    ? 'Miễn phí'
                    : t.multiplier === 1
                    ? 'Giá gốc'
                    : 'Giảm 50%'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
          <TouchableOpacity style={styles.dateBtn}>
            <MaterialCommunityIcons name="calendar-outline" size={20} color={C.textMuted} />
            <Text style={styles.dateBtnText}>Chọn ngày</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bảo tàng</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{museum.name}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Loại vé</Text>
            <Text style={styles.summaryValue}>{selectedType.label}</Text>
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

        <TouchableOpacity style={styles.buyBtn}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={22} color={C.onAccent} />
          <Text style={styles.buyBtnText}>Xác nhận đặt vé</Text>
        </TouchableOpacity>

        <Text style={styles.note}>
          * Vé điện tử sẽ được gửi qua email sau khi thanh toán thành công
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scroll: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: C.textPrimary },
  pageSubtitle: { fontSize: 14, color: C.textSecondary, marginTop: 4, marginBottom: 24 },

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
  museumPrice: { fontSize: 13, fontWeight: '700', color: C.accent },

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
  typeLabel: { fontSize: 13, fontWeight: '700', color: C.textSecondary },
  typeLabelActive: { color: C.accent },
  typeDesc: { fontSize: 11, color: C.textMuted, marginTop: 4 },
  typeDescActive: { color: C.accent },

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

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: C.bgElevated,
  },
  dateBtnText: { fontSize: 15, color: C.textMuted },

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
  },
  buyBtnText: { color: C.onAccent, fontSize: 17, fontWeight: '700' },
  note: { fontSize: 12, color: C.textMuted, textAlign: 'center', lineHeight: 18 },
});
