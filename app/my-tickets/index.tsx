import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  useMyTickets,
  usePendingOrder,
} from '../../src/hooks/useTicketing';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { apiService, MyTicketDto, PendingOrderDto } from '../../src/services/apiService';
import { C } from '../../src/theme/colors';
import { formatVisitorDate } from '../../src/utils/visitorLists';

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

function formatCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

function PendingOrderCard({
  pending,
  onResume,
  onCancel,
  busy,
}: {
  pending: PendingOrderDto;
  onResume: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const { t, lang } = useLanguage();
  const [secondsLeft, setSecondsLeft] = useState(
    Math.max(0, pending.remainingSeconds ?? 0),
  );

  useEffect(() => {
    setSecondsLeft(Math.max(0, pending.remainingSeconds ?? 0));
  }, [pending.orderCode, pending.remainingSeconds, pending.expiresAt]);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft > 0, pending.orderCode]);

  const canResume = Boolean(pending.orderCode) && secondsLeft > 0;
  const expired = secondsLeft <= 0;

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
              {expired ? t('ticket.statusCancelled') : t('ticket.statusPending')}
            </Text>
          </View>
        </View>

        <Text style={styles.orderCode}>
          {t('ticket.orderCode')}: {pending.orderCode}
        </Text>
        <Text style={styles.museum}>
          ×{pending.quantity ?? 1}
          {!expired
            ? ` · ${t('ticket.expiresIn')} ${formatCountdown(secondsLeft)}`
            : ` · ${t('ticket.expiredHint')}`}
        </Text>

        <View style={styles.footerRow}>
          <Text style={styles.price}>
            {pending.totalAmount != null
              ? `${Number(pending.totalAmount).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN')}đ`
              : ''}
          </Text>
        </View>

        <View style={styles.pendingActions}>
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
                  <MaterialCommunityIcons name="credit-card-outline" size={16} color={C.onAccent} />
                  <Text style={styles.resumeBtnText}>{t('ticket.continuePayment')}</Text>
                </>
              )}
            </TouchableOpacity>
          ) : null}

          {!expired ? (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              disabled={busy}
            >
              <Text style={styles.cancelBtnText}>{t('ticket.cancelOrder')}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

function TicketCard({
  ticket,
  onPress,
}: {
  ticket: MyTicketDto;
  onPress: () => void;
}) {
  const { t, lang } = useLanguage();
  const st = statusStyle(ticket.status, t);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
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
          <Text style={styles.purchased}>
            {ticket.purchaseDate || ticket.purchasedAt
              ? formatVisitorDate(
                  ticket.purchaseDate || ticket.purchasedAt || '',
                  lang === 'en' ? 'en-US' : 'vi-VN',
                )
              : ''}
          </Text>
          <View style={styles.openRow}>
            <Text style={styles.openText}>{t('ticket.viewDetail')}</Text>
            <MaterialCommunityIcons name="chevron-right" size={18} color={C.accent} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
  const [busy, setBusy] = useState(false);

  const refreshAll = useCallback(async () => {
    await Promise.all([refresh(), refreshPending()]);
  }, [refresh, refreshPending]);

  useFocusEffect(
    useCallback(() => {
      void refreshAll();
    }, [refreshAll]),
  );

  // When countdown hits 0, re-sync so BE can expire the order.
  useEffect(() => {
    if (!pending) return;
    const sec = pending.remainingSeconds ?? 0;
    if (sec <= 0) return;
    const timer = setTimeout(() => {
      void refreshAll();
    }, (sec + 1) * 1000);
    return () => clearTimeout(timer);
  }, [pending?.orderCode, pending?.remainingSeconds, refreshAll]);

  const handleResumePending = async () => {
    if (!pending?.orderCode) return;
    const paidBefore = tickets.filter(
      (item) => (item.status ?? '').toLowerCase() === 'paid',
    ).length;
    // Re-check before opening QR — clears the loop when order is already paid.
    setBusy(true);
    try {
      const status = await apiService.checkPayment(pending.orderCode);
      if (status.data?.isPaid) {
        await refreshAll();
        router.push({
          pathname: '/payment-result',
          params: {
            status: 'success',
            orderCode: pending.orderCode,
            paidBefore: String(paidBefore),
          },
        });
        return;
      }
      if (status.data?.isCancelled) {
        await refreshAll();
        return;
      }
    } catch {
      // still open checkout
    } finally {
      setBusy(false);
    }
    router.push({
      pathname: '/payment-checkout',
      params: {
        orderCode: pending.orderCode,
        paidBefore: String(paidBefore),
      },
    });
  };

  const handleCancelPending = () => {
    if (!pending?.orderCode) return;
    Alert.alert(t('ticket.cancelOrder'), t('ticket.cancelOrderConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('ticket.cancelOrder'),
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await apiService.cancelOrder(pending.orderCode);
            await refreshAll();
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
                onCancel={handleCancelPending}
                busy={busy}
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
        renderItem={({ item }) => (
          <TicketCard
            ticket={item}
            onPress={() => router.push(`/my-tickets/${item.id}`)}
          />
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
  openRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  openText: { fontSize: 13, color: C.accent, fontWeight: '600' },
  pendingActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
  resumeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resumeBtnText: { color: C.onAccent, fontWeight: '700', fontSize: 13 },
  cancelBtn: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: C.danger + '66',
    backgroundColor: C.danger + '12',
  },
  cancelBtnText: { color: C.danger, fontWeight: '700', fontSize: 13 },

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
