import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const MUSEUMS = [
  { id: 'm1', name: 'Bảo tàng Lịch sử Quốc gia', city: 'Hà Nội', price: 30000, color: '#1A6FA8' },
  { id: 'm2', name: 'Bảo tàng Chứng tích Chiến tranh', city: 'TP. Hồ Chí Minh', price: 40000, color: '#DC2626' },
  { id: 'm3', name: 'Bảo tàng Dân tộc học Việt Nam', city: 'Hà Nội', price: 40000, color: '#059669' },
  { id: 'm4', name: 'Bảo tàng Điêu khắc Chăm', city: 'Đà Nẵng', price: 60000, color: '#D97706' },
  { id: 'm5', name: 'Bảo tàng Mỹ thuật Việt Nam', city: 'Hà Nội', price: 40000, color: '#7C3AED' },
];

const TICKET_TYPES = [
  { id: 'adult', label: 'Người lớn', desc: 'Từ 18 tuổi trở lên', multiplier: 1 },
  { id: 'student', label: 'Học sinh / SV', desc: 'Xuất trình thẻ học sinh', multiplier: 0.5 },
  { id: 'child', label: 'Trẻ em', desc: 'Dưới 15 tuổi', multiplier: 0 },
  { id: 'senior', label: 'Người cao tuổi', desc: 'Từ 60 tuổi trở lên', multiplier: 0.5 },
];

export default function TicketScreen() {
  const router = useRouter();
  const [selectedMuseum, setSelectedMuseum] = useState(MUSEUMS[0]);
  const [selectedType, setSelectedType] = useState(TICKET_TYPES[0]);
  const [quantity, setQuantity] = useState(1);
  const [date, setDate] = useState('');

  const total = selectedMuseum.price * selectedType.multiplier * quantity;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.pageTitle}>Mua vé</Text>
        <Text style={styles.pageSubtitle}>Đặt vé tham quan trực tuyến</Text>

        {/* Step 1: Chọn bảo tàng */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <Text style={styles.sectionTitle}>Chọn bảo tàng</Text>
          </View>
          {MUSEUMS.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={[styles.museumRow, selectedMuseum.id === m.id && styles.museumRowActive]}
              onPress={() => setSelectedMuseum(m)}
            >
              <View style={[styles.museumColorDot, { backgroundColor: m.color }]} />
              <View style={styles.museumInfo}>
                <Text style={styles.museumName}>{m.name}</Text>
                <Text style={styles.museumCity}>{m.city}</Text>
              </View>
              <Text style={styles.museumPrice}>
                {m.price.toLocaleString('vi-VN')}đ
              </Text>
              {selectedMuseum.id === m.id && (
                <MaterialCommunityIcons name="check-circle" size={20} color="#1A6FA8" style={styles.checkIcon} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Step 2: Loại vé */}
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

        {/* Step 3: Số lượng */}
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
              <MaterialCommunityIcons name="minus" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.qtyValue}>{quantity}</Text>
            <TouchableOpacity
              style={styles.qtyBtn}
              onPress={() => setQuantity((q) => Math.min(10, q + 1))}
            >
              <MaterialCommunityIcons name="plus" size={20} color="#374151" />
            </TouchableOpacity>
            <Text style={styles.qtyNote}>tối đa 10 vé / lần</Text>
          </View>
        </View>

        {/* Step 4: Ngày tham quan */}
        <View style={styles.section}>
          <View style={styles.stepRow}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepNum}>4</Text>
            </View>
            <Text style={styles.sectionTitle}>Ngày tham quan</Text>
          </View>
          <TouchableOpacity style={styles.dateBtn}>
            <MaterialCommunityIcons name="calendar-outline" size={20} color="#6B7280" />
            <Text style={styles.dateBtnText}>Chọn ngày</Text>
          </TouchableOpacity>
        </View>

        {/* Summary */}
        <View style={styles.summary}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Bảo tàng</Text>
            <Text style={styles.summaryValue} numberOfLines={1}>{selectedMuseum.name}</Text>
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

        {/* CTA */}
        <TouchableOpacity style={styles.buyBtn}>
          <MaterialCommunityIcons name="ticket-confirmation-outline" size={22} color="#FFFFFF" />
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
  safe: { flex: 1, backgroundColor: '#F8FAFF' },
  scroll: { padding: 20, paddingBottom: 40 },
  pageTitle: { fontSize: 28, fontWeight: '800', color: '#111827' },
  pageSubtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 24 },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 2,
  },
  stepRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1A6FA8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111827' },

  museumRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#F3F4F6',
    marginBottom: 8,
    gap: 10,
  },
  museumRowActive: { borderColor: '#1A6FA8', backgroundColor: '#F0F7FF' },
  museumColorDot: { width: 10, height: 10, borderRadius: 5 },
  museumInfo: { flex: 1 },
  museumName: { fontSize: 13, fontWeight: '700', color: '#111827' },
  museumCity: { fontSize: 11, color: '#9CA3AF', marginTop: 2 },
  museumPrice: { fontSize: 13, fontWeight: '700', color: '#1A6FA8' },
  checkIcon: { marginLeft: 4 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  typeCard: {
    width: '47%',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    padding: 12,
    alignItems: 'center',
  },
  typeCardActive: { borderColor: '#1A6FA8', backgroundColor: '#F0F7FF' },
  typeLabel: { fontSize: 13, fontWeight: '700', color: '#374151' },
  typeLabelActive: { color: '#1A6FA8' },
  typeDesc: { fontSize: 11, color: '#9CA3AF', marginTop: 4 },
  typeDescActive: { color: '#1A6FA8' },

  quantityRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
  },
  qtyValue: { fontSize: 22, fontWeight: '800', color: '#111827', minWidth: 30, textAlign: 'center' },
  qtyNote: { fontSize: 12, color: '#9CA3AF', flex: 1 },

  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
  },
  dateBtnText: { fontSize: 15, color: '#9CA3AF' },

  summary: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 6,
    elevation: 2,
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 14, color: '#6B7280' },
  summaryValue: { fontSize: 14, fontWeight: '600', color: '#111827', maxWidth: '60%', textAlign: 'right' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 8 },
  totalLabel: { fontSize: 16, fontWeight: '700', color: '#111827' },
  totalValue: { fontSize: 20, fontWeight: '800', color: '#1A6FA8' },

  buyBtn: {
    flexDirection: 'row',
    backgroundColor: '#1A6FA8',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 14,
  },
  buyBtnText: { color: '#FFFFFF', fontSize: 17, fontWeight: '700' },
  note: { fontSize: 12, color: '#9CA3AF', textAlign: 'center', lineHeight: 18 },
});
