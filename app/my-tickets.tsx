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
import {
  openPayOsCheckout,
  useMyTickets,
  usePendingOrder,
} from '../src/hooks/useTicketing';
import { useLanguage } from '../src/i18n/LanguageContext';
import { apiService, MyTicketDto, PendingOrderDto } from '../src/services/apiService';
import { C } from '../src/theme/colors';
import { formatVisitorDate } from '../src/utils/visitorLists';

function statusStyle(
  status: string | undefined,
  t: (key: string) => string,
): { color: string; label: string } {
  const s = (status ?? '').toLowerCase();
  if (s === 'pending') return { color: C.accent, label: t('ticket.statusPending') };
  if (s === 'paid') return { color: C.success, label: t('ticket.statusPaid') };
  if (s.includes('cancel')) return { color: C.danger, label: t('ticket.statusCancelled') };
  if (s.includes('used') || s.includes('đã dùng')) {
    return { color: C.textMuted, label: status ?? '—' };
  }
  return { color: C.textMuted, label: status ?? '—' };
}

function PendingOrderCard({
  pending,
  onResume,
  busy,
}: {
  pending: PendingOrderDto;
  onResume: () => void;
  busy: boolean;
}) {
  const { t } = useLanguage();
  const canResume = Boolean(pending.checkoutUrl);

  return (
    <View style={[styles.card, styles.pendingCard]}>
      <View style={[styles.accent, { backgroundColor: C.accent }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.ticketName}>
            {pending.ticketTypeName ?? t('ticket.defaultName')}
          </Text>
          <View
            style={[
              styles.statusPill,
              { borderColor: C.accent + '55', backgroundColor: C.accent + '18' },
            ]}
          >
            <Text style={[styles.statusText, { color: C.accent }]}>
              {t('ticket.statusPending')}
            </Text>
          </View>
        </View>

        <Text style={styles.orderCode}>
          {t('ticket.title')}: {pending.orderCode}
        </Text>
        {pending.quantity != null ? (
          <Text style={styles.museum}>
            ×{pending.quantity}
            {pending.remainingSeconds != null && pending.remainingSeconds > 0
              ? ` · ${Math.ceil(pending.remainingSeconds / 60)} ${t('ticket.minutesLeft')}`
              : ''}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          <Text style={styles.price}>
            {pending.totalAmount != null
              ? `${Number(pending.totalAmount).toLocaleString('vi-VN')}đ`
              : ''}
          </Text>
        </View>

        {canResume ? (
          <TouchableOpacity
            style={styles.resumeBtn}
            onPress={onResume}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color={C.onAccent} />
            ) : (
              <>
                <MaterialCommunityIcons name="qrcode" size={16} color={C.onAccent} />
                <Text style={styles.resumeBtnText}>{t('ticket.resumePayos')}</Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function TicketCard({ ticket }: { ticket: MyTicketDto }) {
  const { t } = useLanguage();
  const st = statusStyle(ticket.status, t);

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: st.color }]} />
      <View style={styles.cardBody}>
        <View style={styles.cardHeader}>
          <Text style={styles.ticketName}>
            {ticket.ticketTypeName ?? t('ticket.defaultName')}
          </Text>
          <View
            style={[
              styles.statusPill,
              { borderColor: st.color + '55', backgroundColor: st.color + '18' },
            ]}
          >
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
          {ticket.validDate || ticket.visitDate ? (
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
                ? '—'
                : `${Number(ticket.price).toLocaleString('vi-VN')}đ`
              : ''}
          </Text>
          {ticket.purchaseDate || ticket.purchasedAt ? (
            <Text style={styles.purchased}>
              {formatVisitorDate(ticket.purchaseDate || ticket.purchasedAt || '')}
            </Text>
          ) : null}
        </View>

        {ticket.qrCodeUrl && (ticket.status ?? '').toLowerCase() === 'paid' ? (
          <Image source={{ uri: ticket.qrCodeUrl }} style={styles.qr} resizeMode="contain" />
        ) : null}
      </View>
    </View>
  );
}

export default function MyTicketsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { tickets, loading, error, refresh } = useMyTickets();
  const {
    pending,
    loading: pendingLoading,
    refresh: refreshPending,
  } = usePendingOrder();
  const [resuming, setResuming] = useState(false);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), refreshPending()]);
  }, [refresh, refreshPending]);

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  const handleResumePending = async () => {
    if (!pending?.checkoutUrl) return;
    const orderCode = pending.orderCode;
    const checkoutUrl = pending.checkoutUrl;
    const paidBefore = tickets.filter(
      (item) => (item.status ?? '').toLowerCase() === 'paid',
    ).length;

    setResuming(true);
    try {
      // Sync PayOS status before opening (may already be paid/cancelled).
      try {
        const check = await apiService.checkPayment(orderCode);
        if (check.data?.isPaid) {
          await refreshAll();
          router.push({
            pathname: '/payment-result',
            params: {
              status: 'success',
              orderCode,
              paidBefore: String(Math.max(0, paidBefore - 1)),
            },
          });
          return;
        }
        if (check.data?.isCancelled) {
          await refreshAll();
          return;
        }
      } catch {
        // still try checkout
      }

      const outcome = await openPayOsCheckout(checkoutUrl);

      if (outcome === 'cancel') {
        try {
          await apiService.cancelOrder(orderCode);
        } catch {
          // ignore
        }
        await refreshAll();
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
            checkoutUrl,
          },
        });
        return;
      }

      await refreshAll();
      router.push({
        pathname: '/payment-result',
        params: {
          status: 'pending',
          orderCode,
          paidBefore: String(paidBefore),
          checkoutUrl,
        },
      });
    } finally {
      setResuming(false);
    }
  };

  const listRefreshing = loading || pendingLoading;
  const empty = tickets.length === 0 && !pending;

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <FlatList
        data={tickets}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        onRefresh={refreshAll}
        refreshing={listRefreshing}
        ListHeaderComponent={
          <>
            {pending ? (
              <PendingOrderCard
                pending={pending}
                onResume={handleResumePending}
                busy={resuming}
              />
            ) : null}
            {tickets.length > 0 ? (
              <Text style={styles.headerHint}>
                {tickets.length} · {t('ticket.statusPaid')}
              </Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          listRefreshing && empty ? (
            <View style={styles.center}>
              <ActivityIndicator color={C.accent} />
            </View>
          ) : empty ? (
            <View style={styles.center}>
              <Text style={styles.emptyTitle}>
                {error ? t('ticket.loadError') : t('ticket.empty')}
              </Text>
              <Text style={styles.emptyText}>{error ?? t('ticket.emptyHint')}</Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => router.push('/(tabs)/ticket')}
              >
                <Text style={styles.emptyBtnText}>{t('ticket.buyMore')}</Text>
              </TouchableOpacity>
            </View>
          ) : null
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
  pendingCard: { marginBottom: 16 },
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
