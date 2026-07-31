import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
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
import { openPayOsCheckout, useMyTickets } from '../src/hooks/useTicketing';
import { apiService, MyTicketDto } from '../src/services/apiService';
import { C } from '../src/theme/colors';
import { formatVisitorDate } from '../src/utils/visitorLists';

function statusStyle(status?: string): { color: string; label: string } {
  const s = (status ?? '').toLowerCase();
  if (s === 'pending') return { color: C.accent, label: 'Pending' };
  if (s === 'paid') return { color: C.success, label: 'Paid' };
  if (s.includes('cancel')) return { color: C.danger, label: 'Cancelled' };
  if (s.includes('used') || s.includes('đã dùng')) {
    return { color: C.textMuted, label: status ?? 'Đã dùng' };
  }
  return { color: C.textMuted, label: status ?? '—' };
}

function TicketCard({
  ticket,
  onResume,
  resumingId,
}: {
  ticket: MyTicketDto;
  onResume: (ticket: MyTicketDto) => void;
  resumingId: number | null;
}) {
  const st = statusStyle(ticket.status);
  const showResume =
    (ticket.status ?? '').toLowerCase() === 'pending' &&
    Boolean(ticket.canResumePayment && ticket.checkoutUrl);
  const busy = resumingId === ticket.id;

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: st.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.ticketName}>{ticket.ticketTypeName ?? 'Vé tham quan'}</Text>
          <View
            style={[
              styles.statusPill,
              { borderColor: st.color + '55', backgroundColor: st.color + '18' },
            ]}
          >
            <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>

        {ticket.orderCode ? (
          <Text style={styles.orderCode}>Đơn: {ticket.orderCode}</Text>
        ) : null}
        {ticket.museumName ? <Text style={styles.museum}>{ticket.museumName}</Text> : null}

        <View style={styles.metaRow}>
          {ticket.ticketCode ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="barcode" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>{ticket.ticketCode}</Text>
            </View>
          ) : null}
          {(ticket.validDate || ticket.visitDate) ? (
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="calendar-outline" size={14} color={C.textMuted} />
              <Text style={styles.metaText}>{ticket.validDate || ticket.visitDate}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.price}>
            {ticket.price != null
              ? ticket.price === 0
                ? 'Miễn phí'
                : `${Number(ticket.price).toLocaleString('vi-VN')}đ`
              : ''}
          </Text>
          {(ticket.purchaseDate || ticket.purchasedAt) ? (
            <Text style={styles.purchased}>
              Mua: {formatVisitorDate(ticket.purchaseDate || ticket.purchasedAt || '')}
            </Text>
          ) : null}
        </View>

        {ticket.qrCodeUrl && (ticket.status ?? '').toLowerCase() === 'paid' ? (
          <Image source={{ uri: ticket.qrCodeUrl }} style={styles.qr} resizeMode="contain" />
        ) : null}

        {showResume ? (
          <TouchableOpacity
            style={styles.resumeBtn}
            onPress={() => onResume(ticket)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={C.onAccent} />
            ) : (
              <>
                <MaterialCommunityIcons name="qrcode" size={16} color={C.onAccent} />
                <Text style={styles.resumeBtnText}>Tiếp tục PayOS</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

export default function MyTicketsScreen() {
  const router = useRouter();
  const { tickets, loading, error, refresh } = useMyTickets();
  const [resumingId, setResumingId] = useState<number | null>(null);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const handleResume = async (ticket: MyTicketDto) => {
    const orderCode = ticket.orderCode;
    if (!orderCode) return;

    setResumingId(ticket.id);
    try {
      const check = await apiService.checkPayment(orderCode);
      const data = check.data;
      if (!data?.valid || !data.checkoutUrl) {
        await refresh();
        return;
      }

      const paidBefore = tickets.filter(
        (t) => (t.status ?? '').toLowerCase() === 'paid',
      ).length;
      const outcome = await openPayOsCheckout(data.checkoutUrl);

      if (outcome === 'cancel') {
        try {
          await apiService.cancelOrder(orderCode);
        } catch {
          // ignore
        }
        await refresh();
        router.push({
          pathname: '/payment-result',
          params: { status: 'cancel', orderCode, paidBefore: String(paidBefore) },
        });
        return;
      }

      if (outcome === 'success') {
        router.push({
          pathname: '/payment-result',
          params: {
            status: 'success',
            orderCode,
            paidBefore: String(paidBefore),
            checkoutUrl: data.checkoutUrl,
          },
        });
        return;
      }

      // pending — stayed unpaid
      await refresh();
      router.push({
        pathname: '/payment-result',
        params: {
          status: 'pending',
          orderCode,
          paidBefore: String(paidBefore),
          checkoutUrl: data.checkoutUrl,
        },
      });
    } finally {
      setResumingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={loading}
        ListHeaderComponent={
          tickets.length > 0 ? (
            <Text style={styles.headerHint}>{tickets.length} vé (Paid / Pending / Cancelled)</Text>
          ) : null
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
                {error ?? 'Đăng nhập và đặt vé tham quan để xem vé điện tử tại đây.'}
              </Text>
              <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/ticket')}>
                <Text style={styles.emptyBtnText}>Mua vé ngay</Text>
              </TouchableOpacity>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TicketCard ticket={item} onResume={handleResume} resumingId={resumingId} />
        )}
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
  ticketName: { fontSize: 16, fontWeight: '800', color: C.textPrimary, flex: 1, marginRight: 8 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  orderCode: { fontSize: 12, color: C.textMuted, marginTop: 6 },
  museum: { fontSize: 13, color: C.textSecondary, marginTop: 4 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12, color: C.textMuted },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  price: { fontSize: 16, fontWeight: '800', color: C.accent },
  purchased: { fontSize: 11, color: C.textMuted },
  qr: { width: 120, height: 120, alignSelf: 'center', marginTop: 14 },
  resumeBtn: {
    marginTop: 14,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resumeBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 13 },

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
