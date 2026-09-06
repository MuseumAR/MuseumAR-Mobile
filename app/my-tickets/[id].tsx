import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
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

function formatMoney(amount: number, lang: string, currency?: string): string {
  const locale = lang === 'en' ? 'en-US' : 'vi-VN';
  const formatted = Number(amount).toLocaleString(locale);
  const cur = (currency || 'VND').toUpperCase();
  if (cur === 'VND' || cur === 'Đ') return `${formatted}đ`;
  return `${formatted} ${cur}`;
}

function statusLabel(
  status: string,
  t: (key: string) => string,
): string {
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'completed' || s === 'active') return t('ticket.statusPaid');
  if (s === 'pending') return t('ticket.statusPending');
  if (s.includes('cancel')) return t('ticket.statusCancelled');
  return status || '—';
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = parseNumericId(id);
  const { t, lang } = useLanguage();
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
      const res = await apiService.getTicketDetail(ticketId, lang);
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
  }, [ticketId, t, lang]);

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
    detail.status.toLowerCase() === 'active' ||
    detail.order.paymentStatus.toLowerCase() === 'completed';

  const unitPrice = detail.price ?? detail.ticketType.price ?? 0;
  const dash = '—';

  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>{t('ticket.detailTitle')}</Text>
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
              {statusLabel(detail.status, t)}
            </Text>
          </View>
        </View>

        {/* Vé — matches FE */}
        <Section title={t('ticket.sectionTicket')}>
          <Row icon="barcode" label={t('ticket.ticketCode')} value={detail.ticketCode} />
          <Row
            icon="information-outline"
            label={t('ticket.statusLabel')}
            value={statusLabel(detail.status, t)}
          />
          <Row
            icon="calendar-outline"
            label={t('ticket.purchaseDate')}
            value={formatVisitorDate(detail.purchaseDate, lang === 'en' ? 'en-US' : 'vi-VN')}
          />
          <Row
            icon="calendar-check"
            label={t('ticket.validDate')}
            value={
              detail.validDate
                ? formatVisitorDate(detail.validDate, lang === 'en' ? 'en-US' : 'vi-VN')
                : t('ticket.validUnset')
            }
          />
        </Section>

        {/* Loại vé — unit price like FE "Giá" */}
        <Section title={t('ticket.sectionType')}>
          <Row icon="ticket-confirmation-outline" label={t('ticket.type')} value={detail.ticketType.name} />
          <Row
            icon="tag-outline"
            label={t('ticket.unitPrice')}
            value={formatMoney(unitPrice, lang, detail.order.currency)}
          />
          <Row
            icon="text"
            label={t('ticket.description')}
            value={detail.ticketType.description?.trim() || dash}
          />
        </Section>

        {/* Bảo tàng / Triển lãm */}
        <Section title={t('ticket.sectionVenue')}>
          <Row icon="domain" label={t('ticket.museum')} value={detail.museum.name} />
          <Row
            icon="map-marker-outline"
            label={t('ticket.address')}
            value={detail.museum.address?.trim() || dash}
          />
          <Row
            icon="palette-outline"
            label={t('ticket.exhibition')}
            value={detail.exhibition?.name?.trim() || dash}
          />
        </Section>

        {/* Đơn hàng / Thanh toán — keep order total */}
        <Section title={t('ticket.sectionOrder')}>
          <Row icon="receipt" label={t('ticket.orderCode')} value={detail.order.orderCode} />
          <Row
            icon="cash"
            label={t('ticket.orderTotal')}
            value={formatMoney(detail.order.totalAmount, lang, detail.order.currency)}
          />
          <Row
            icon="check-decagram-outline"
            label={t('ticket.paymentStatus')}
            value={statusLabel(detail.order.paymentStatus, t)}
          />
          <Row
            icon="credit-card-outline"
            label={t('ticket.paymentMethod')}
            value={t('ticket.payos')}
          />
          <Row
            icon="clock-outline"
            label={t('ticket.paidAt')}
            value={
              detail.order.paidAt
                ? formatVisitorDate(detail.order.paidAt, lang === 'en' ? 'en-US' : 'vi-VN')
                : dash
            }
          />
        </Section>

        {/* QR */}
        {qrUri && paid ? (
          <Section title={t('ticket.sectionQr')}>
            <View style={styles.qrBox}>
              <Image source={{ uri: qrUri }} style={styles.qr} resizeMode="contain" />
              <Text style={styles.qrHint}>{t('ticket.checkInQrHint')}</Text>
            </View>
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
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
  eyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: C.accent,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  typeName: { flex: 1, fontSize: 22, fontWeight: '800', color: C.textPrimary },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1 },
  statusText: { fontSize: 11, fontWeight: '700' },
  section: {
    marginTop: 16,
    backgroundColor: C.bgSurface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textPrimary,
    marginBottom: 12,
  },
  sectionBody: { gap: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowLabel: { fontSize: 11, color: C.textMuted, fontWeight: '600' },
  rowValue: { fontSize: 14, color: C.textPrimary, fontWeight: '600', marginTop: 2 },
  qrBox: {
    alignItems: 'center',
    backgroundColor: C.bgElevated,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
  },
  qr: { width: 220, height: 220 },
  qrHint: {
    marginTop: 12,
    fontSize: 13,
    color: C.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
});
