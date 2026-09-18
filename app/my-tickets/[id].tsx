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
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

function statusLabel(status: string, t: (key: string) => string): string {
  const s = status.toLowerCase();
  if (s === 'paid' || s === 'completed' || s === 'active') return t('ticket.statusPaid');
  if (s === 'pending') return t('ticket.statusPending');
  if (s === 'used' || s.includes('used')) return t('ticket.statusUsed');
  if (s === 'refund_pending') return t('ticket.statusRefundPending');
  if (s === 'refunded') return t('ticket.statusRefunded');
  if (s.includes('cancel')) return t('ticket.statusCancelled');
  return status || '—';
}

function isPaidOrActive(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'paid' || s === 'active';
}

function isUsedStatus(status: string): boolean {
  const s = status.toLowerCase();
  return s === 'used' || s.includes('used');
}

function isRefundPendingStatus(status: string): boolean {
  return status.toLowerCase() === 'refund_pending';
}

function isRefundedStatus(status: string): boolean {
  return status.toLowerCase() === 'refunded';
}

function statusColorFor(status: string): string {
  if (isUsedStatus(status)) return C.textMuted;
  if (isRefundPendingStatus(status)) return C.warning;
  if (isRefundedStatus(status)) return C.danger;
  if (isPaidOrActive(status)) return C.success;
  return C.accent;
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = parseNumericId(id);
  const { t, lang } = useLanguage();
  const [detail, setDetail] = useState<TicketDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  const [refundOpen, setRefundOpen] = useState(false);
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);

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

  const handleCheckIn = useCallback(async () => {
    if (!detail?.ticketCode || checkingIn) return;
    setCheckingIn(true);
    try {
      const res = await apiService.checkInTicket(detail.ticketCode);
      const data = res.data;
      if (data?.isValid) {
        Alert.alert(t('ticket.checkInTitle'), t('ticket.checkInSuccess'));
        await load();
        return;
      }
      const msg = (data?.message || res.message || '').toLowerCase();
      if (msg.includes('already') || msg.includes('đã') || msg.includes('used')) {
        Alert.alert(t('ticket.checkInTitle'), t('ticket.checkInAlready'));
        await load();
        return;
      }
      Alert.alert(
        t('ticket.checkInTitle'),
        data?.message || res.message || t('ticket.checkInFail'),
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : t('ticket.checkInFail');
      Alert.alert(t('ticket.checkInTitle'), message);
    } finally {
      setCheckingIn(false);
    }
  }, [checkingIn, detail?.ticketCode, load, t]);

  const openRefund = useCallback(() => {
    setRefundError(null);
    setRefundOpen(true);
  }, []);

  const handleRefund = useCallback(async () => {
    if (!detail || refundLoading) return;
    if (
      !bankName.trim() ||
      !accountNumber.trim() ||
      !accountHolderName.trim() ||
      !refundReason.trim()
    ) {
      setRefundError(t('ticket.refundIncomplete'));
      return;
    }

    setRefundLoading(true);
    setRefundError(null);
    try {
      const res = await apiService.requestTicketRefund(detail.id, {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountHolderName: accountHolderName.trim(),
        reason: refundReason.trim(),
      });
      if (res.statusCode && res.statusCode >= 400) {
        throw new Error(res.message || t('ticket.refundFail'));
      }
      setDetail((prev) => (prev ? { ...prev, status: 'Refund_Pending' } : prev));
      setRefundOpen(false);
      setBankName('');
      setAccountNumber('');
      setAccountHolderName('');
      setRefundReason('');
      Alert.alert(t('ticket.refundTitle'), t('ticket.refundSuccess'));
      await load();
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : t('ticket.refundFail'));
    } finally {
      setRefundLoading(false);
    }
  }, [
    accountHolderName,
    accountNumber,
    bankName,
    detail,
    load,
    refundLoading,
    refundReason,
    t,
  ]);

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

  const paidActive = isPaidOrActive(detail.status);
  const used = isUsedStatus(detail.status);
  const refundPending = isRefundPendingStatus(detail.status);
  const refunded = isRefundedStatus(detail.status);
  const canSelfCheckIn = paidActive && Boolean(detail.ticketCode);
  const canRefund = paidActive;
  const showQr = Boolean(qrUri) && paidActive;
  const statusColor = statusColorFor(detail.status);

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
                borderColor: statusColor + '55',
                backgroundColor: statusColor + '18',
              },
            ]}
          >
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel(detail.status, t)}
            </Text>
          </View>
        </View>

        {refundPending ? (
          <View style={[styles.banner, styles.bannerWarning]}>
            <MaterialCommunityIcons name="clock-outline" size={18} color={C.warning} />
            <Text style={[styles.bannerText, { color: C.warning }]}>
              {t('ticket.refundPendingBanner')}
            </Text>
          </View>
        ) : null}

        {refunded ? (
          <View style={[styles.banner, styles.bannerDanger]}>
            <MaterialCommunityIcons name="cash-refund" size={18} color={C.danger} />
            <Text style={[styles.bannerText, { color: C.danger }]}>
              {t('ticket.refundedBanner')}
            </Text>
          </View>
        ) : null}

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

        {showQr ? (
          <Section title={t('ticket.sectionQr')}>
            <View style={styles.qrBox}>
              <Image source={{ uri: qrUri! }} style={styles.qr} resizeMode="contain" />
              <Text style={styles.qrHint}>{t('ticket.checkInQrHint')}</Text>
            </View>
          </Section>
        ) : null}

        {canSelfCheckIn || used ? (
          <Section title={t('ticket.checkInTitle')}>
            {used ? (
              <View style={styles.checkInDone}>
                <MaterialCommunityIcons name="check-circle" size={22} color={C.success} />
                <Text style={styles.checkInDoneText}>{t('ticket.checkInAlready')}</Text>
              </View>
            ) : (
              <>
                <Text style={styles.checkInHint}>{t('ticket.checkInHint')}</Text>
                <TouchableOpacity
                  style={[styles.checkInBtn, checkingIn && styles.checkInBtnDisabled]}
                  onPress={() => void handleCheckIn()}
                  disabled={checkingIn}
                >
                  {checkingIn ? (
                    <ActivityIndicator color={C.onAccent} />
                  ) : (
                    <>
                      <MaterialCommunityIcons name="login" size={20} color={C.onAccent} />
                      <Text style={styles.checkInBtnText}>{t('ticket.checkInAction')}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </Section>
        ) : null}

        {canRefund ? (
          <TouchableOpacity style={styles.refundLink} onPress={openRefund}>
            <MaterialCommunityIcons name="cash-refund" size={18} color={C.warning} />
            <Text style={styles.refundLinkText}>{t('ticket.refundAction')}</Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>

      <Modal
        visible={refundOpen}
        animationType="slide"
        transparent
        onRequestClose={() => !refundLoading && setRefundOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('ticket.refundTitle')}</Text>
            <Text style={styles.modalHint}>{t('ticket.refundHint')}</Text>

            <Text style={styles.inputLabel}>{t('ticket.refundBankName')}</Text>
            <TextInput
              style={styles.input}
              value={bankName}
              onChangeText={setBankName}
              placeholder={t('ticket.refundBankName')}
              placeholderTextColor={C.textPlaceholder}
              editable={!refundLoading}
            />

            <Text style={styles.inputLabel}>{t('ticket.refundAccountNumber')}</Text>
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              placeholder={t('ticket.refundAccountNumber')}
              placeholderTextColor={C.textPlaceholder}
              keyboardType="number-pad"
              editable={!refundLoading}
            />

            <Text style={styles.inputLabel}>{t('ticket.refundAccountHolder')}</Text>
            <TextInput
              style={styles.input}
              value={accountHolderName}
              onChangeText={setAccountHolderName}
              placeholder={t('ticket.refundAccountHolder')}
              placeholderTextColor={C.textPlaceholder}
              editable={!refundLoading}
            />

            <Text style={styles.inputLabel}>{t('ticket.refundReason')}</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={refundReason}
              onChangeText={setRefundReason}
              placeholder={t('ticket.refundReason')}
              placeholderTextColor={C.textPlaceholder}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              editable={!refundLoading}
            />

            {refundError ? <Text style={styles.modalError}>{refundError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setRefundOpen(false)}
                disabled={refundLoading}
              >
                <Text style={styles.modalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmit, refundLoading && styles.checkInBtnDisabled]}
                onPress={() => void handleRefund()}
                disabled={refundLoading}
              >
                {refundLoading ? (
                  <ActivityIndicator color={C.onAccent} />
                ) : (
                  <Text style={styles.modalSubmitText}>{t('ticket.refundSubmit')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  bannerWarning: {
    backgroundColor: C.warning + '14',
    borderColor: C.warning + '44',
  },
  bannerDanger: {
    backgroundColor: C.danger + '14',
    borderColor: C.danger + '44',
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
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
  checkInHint: {
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
  },
  checkInBtn: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 14,
    minHeight: 48,
    paddingHorizontal: 16,
  },
  checkInBtnDisabled: { opacity: 0.6 },
  checkInBtnText: { color: C.onAccent, fontSize: 15, fontWeight: '700' },
  checkInDone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: C.success + '14',
    borderRadius: 12,
    padding: 12,
  },
  checkInDoneText: {
    flex: 1,
    fontSize: 13,
    color: C.success,
    fontWeight: '600',
    lineHeight: 18,
  },
  refundLink: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  refundLinkText: { fontSize: 14, fontWeight: '700', color: C.warning },
  modalOverlay: {
    flex: 1,
    backgroundColor: C.bgOverlay,
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: C.bgSurface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 28,
    borderWidth: 1,
    borderColor: C.border,
    maxHeight: '92%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: C.textPrimary },
  modalHint: {
    marginTop: 6,
    marginBottom: 14,
    fontSize: 13,
    color: C.textSecondary,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.textMuted,
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: C.textPrimary,
  },
  inputMultiline: { minHeight: 80 },
  modalError: { marginTop: 10, color: C.danger, fontSize: 13, fontWeight: '600' },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 18,
  },
  modalCancel: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: { color: C.textSecondary, fontWeight: '700', fontSize: 14 },
  modalSubmit: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: C.warning,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: { color: C.onAccent, fontWeight: '700', fontSize: 14 },
});
