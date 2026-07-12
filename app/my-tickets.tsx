import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMyTickets } from '../src/hooks/useTicketing';
import { MyTicketDto } from '../src/services/apiService';
import { C } from '../src/theme/colors';
import { formatVisitorDate } from '../src/utils/visitorLists';

function statusStyle(status?: string): { color: string; label: string } {
  const s = (status ?? '').toLowerCase();
  if (s.includes('used') || s.includes('đã dùng')) return { color: C.textMuted, label: status ?? 'Đã dùng' };
  if (s.includes('expire') || s.includes('cancel') || s.includes('hết') || s.includes('huỷ')) {
    return { color: C.danger, label: status ?? 'Hết hạn' };
  }
  return { color: C.success, label: status ?? 'Hợp lệ' };
}

function TicketCard({ ticket }: { ticket: MyTicketDto }) {
  const st = statusStyle(ticket.status);
  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: st.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.ticketName}>{ticket.ticketTypeName ?? 'Vé tham quan'}</Text>
          <View style={[styles.statusPill, { borderColor: st.color + '55', backgroundColor: st.color + '18' }]}>
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        {ticket.museumName ? <Text style={styles.museum}>{ticket.museumName}</Text> : null}

        <View style={styles.metaRow}>
          {ticket.ticketCode ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="barcode" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>{ticket.ticketCode}</Text>
            </View>
          ) : null}
          {ticket.visitDate ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>{ticket.visitDate}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.price}>
            {ticket.price != null
              ? ticket.price === 0
                ? 'Miễn phí'
                : `${ticket.price.toLocaleString('vi-VN')}đ`
              : ''}
          </Text>
          {ticket.purchasedAt ? (
            <Text style={styles.purchased}>Mua: {formatVisitorDate(ticket.purchasedAt)}</Text>
          ) : null}
        </View>

        {ticket.qrCodeUrl ? (
          <Image source={{ uri: ticket.qrCodeUrl }} style={styles.qr} resizeMode="contain" />
        ) : null}
      </View>
    </View>
  );
}

export default function MyTicketsScreen() {
  const router = useRouter();
  const { tickets, loading, authRequired, error, refresh } = useMyTickets();

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (authRequired) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.emptyTitle}>Cần đăng nhập</Text>
          <Text style={styles.emptyText}>Đăng nhập để xem vé đã đặt của bạn.</Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.emptyBtnText}>Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={loading}
        ListHeaderComponent={
          tickets.length > 0 ? <Text style={styles.headerHint}>{tickets.length} vé</Text> : null
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>{error ? 'Không tải được vé' : 'Chưa có vé nào'}</Text>
              <Text style={styles.emptyText}>
                {error ?? 'Đặt vé tham quan để nhận vé điện tử ở đây.'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/ticket')}>
                <Text style={styles.emptyBtnText}>Mua vé ngay</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => <TicketCard ticket={item} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  list: { padding: 20, paddingBottom: 32, flexGrow: 1 },
  headerHint: { fontSize: 13, color: C.textMuted, marginBottom: 16 },
  card: {
    flexDirection: 'row',
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  accent: { width: 5 },
  cardBody: { flex: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ticketName: { fontSize: 16, fontWeight: '800', color: C.textPrimary, flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  museum: { fontSize: 13, color: C.textSecondary, marginTop: 6 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: C.textMuted },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  price: { fontSize: 16, fontWeight: '800', color: C.accent },
  purchased: { fontSize: 11, color: C.textMuted },
  qr: { width: 120, height: 120, alignSelf: 'center', marginTop: 14 },

  center: { alignItems: 'center', paddingTop: 48, paddingHorizontal: 24 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginBottom: 8 },
  emptyText: { fontSize: 14, color: C.textMuted, textAlign: 'center', lineHeight: 22 },
  emptyBtn: {
    marginTop: 20,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  emptyBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 14 },
});
