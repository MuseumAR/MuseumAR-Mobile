import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { apiService, TicketDetailDto } from '../../src/services/apiService';
import { C } from '../../src/theme/colors';
import { formatVisitorDate } from '../../src/utils/visitorLists';
import { parseNumericId } from '../../src/utils/parseId';

function qrImageUrl(data: string): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data)}`;
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = parseNumericId(id);
  const { t } = useLanguage();
  const [detail, setDetail] = useState<TicketDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (ticketId == null) {
      setError(t('ticket.loadError'));
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await apiService.getTicketDetail(ticketId);
      if (!res.data) {
        setError(res.message || t('ticket.loadError'));
        setDetail(null);
      } else {
        setDetail(res.data);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('ticket.loadError'));
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [ticketId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const qrPayload = useMemo(() => {
    if (!detail) return '';
    return (detail.qrCodeData || detail.ticketCode || '').trim();
  }, [detail]);

  const qrUri = useMemo(() => {
    if (!detail) return null;
    if (detail.qrCodeImageUrl) return detail.qrCodeImageUrl;
    if (!qrPayload) return null;
    return qrImageUrl(qrPayload);
  }, [detail, qrPayload]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <ActivityIndicator color={C.accent} />
        </View>
      </SafeAreaView>
    );
  }

  if (!detail) {
    return (
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? t('ticket.loadError')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const paid =
    detail.status.toLowerCase() === 'paid' ||
    detail.order.paymentStatus.toLowerCase() === 'completed';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Text style={styles.typeName}>{detail.ticketType.name}</Text>
          <View
            style={[
              styles.statusPill,
              {
                borderColor: (paid ? C.success : C.accent) + '55',
                backgroundColor: (paid ? C.success : C.accent) + '18',
              },
            ]}
          >
            <Text style={[styles.statusText, { color: paid ? C.success : C.accent }]}>
              {paid ? t('ticket.statusPaid') : detail.status}
            </Text>
          </View>
        </View>

        <Text style={styles.codeLabel}>{t('ticket.ticketCode')}</Text>
        <Text style={styles.codeValue}>{detail.ticketCode}</Text>

        {qrUri && paid ? (
          <View style={styles.qrBox}>
            <Image source={{ uri: qrUri }} style={styles.qr} resizeMode="contain" />
            <Text style={styles.qrHint}>{t('ticket.checkInQrHint')}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Row
            icon="domain"
            label={t('ticket.museum')}
            value={detail.museum.name}
          />
          {detail.museum.address ? (
            <Row icon="map-marker-outline" label={t('ticket.address')} value={detail.museum.address} />
          ) : null}
          {detail.exhibition ? (
            <Row
              icon="palette-outline"
              label={t('ticket.exhibition')}
              value={detail.exhibition.name}
            />
          ) : null}
          <Row
            icon="receipt"
            label={t('ticket.orderCode')}
            value={detail.order.orderCode}
          />
          <Row
            icon="cash"
            label={t('ticket.total')}
            value={`${Number(detail.order.totalAmount).toLocaleString('vi-VN')} ${detail.order.currency || 'VND'}`}
          />
          <Row
            icon="credit-card-outline"
            label={t('ticket.paymentMethod')}
            value={detail.order.paymentMethod || 'PayOS'}
          />
          <Row
            icon="calendar-outline"
            label={t('ticket.purchaseDate')}
            value={formatVisitorDate(detail.purchaseDate)}
          />
          {detail.validDate ? (
            <Row
              icon="calendar-check"
              label={t('ticket.validDate')}
              value={formatVisitorDate(detail.validDate)}
            />
          ) : null}
        </View>

        {detail.ticketType.description ? (
          <Text style={styles.desc}>{detail.ticketType.description}</Text>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: ComponentProps<typeof MaterialCommunityIcons>['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name={icon} size={18} color={C.textMuted} />
      <View style={{ flex: 1 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bgPrimary },
  scroll: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.danger, textAlign: 'center', fontSize: 15 },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  typeName: { flex: 1, fontSize: 22, fontWeight: '800', color: C.textPrimary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  codeLabel: { fontSize: 12, color: C.textMuted, fontWeight: '600' },
  codeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    marginTop: 4,
    letterSpacing: 0.3,
  },
  qrBox: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 20,
  },
  qr: { width: 220, height: 220 },
  qrHint: {
    marginTop: 12,
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  section: {
    marginTop: 20,
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    gap: 14,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  rowValue: { fontSize: 14, color: C.textPrimary, fontWeight: '600', marginTop: 2 },
  desc: {
    marginTop: 16,
    fontSize: 14,
    color: C.textSecondary,
    lineHeight: 22,
  },
});
