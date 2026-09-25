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
import { ARPackCard } from '../../src/components/ARPackCard';
import { useLanguage } from '../../src/i18n/LanguageContext';
import { useARPacks } from '../../src/hooks/useARPacks';
import {
  apiService,
  TicketDetailDto,
  TicketRefundRequestInfo,
} from '../../src/services/apiService';
import type { ARPack } from '../../src/data/arPacks';
import { C } from '../../src/theme/colors';
import { formatVisitorDate } from '../../src/utils/visitorLists';
import { parseNumericId } from '../../src/utils/parseId';
import { MAX_ORDER_QUANTITY } from '../../src/utils/groupTicketPricing';

/** Same bank options as MuseumAR-Frontend refund modal. */
const REFUND_BANKS = [
  { value: 'Vietcombank', label: 'Vietcombank (VCB)' },
  { value: 'MBBank', label: 'MB Bank (Quân Đội)' },
  { value: 'Techcombank', label: 'Techcombank (TCB)' },
  { value: 'BIDV', label: 'BIDV' },
  { value: 'VietinBank', label: 'VietinBank' },
  { value: 'ACB', label: 'ACB (Á Châu)' },
  { value: 'VPBank', label: 'VPBank' },
  { value: 'TPBank', label: 'TPBank' },
  { value: 'Agribank', label: 'Agribank' },
  { value: 'MoMo', label: 'Ví điện tử MoMo' },
  { value: 'Khác', label: 'Ngân hàng khác' },
] as const;

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

function isRefundRejected(req?: TicketRefundRequestInfo | null): boolean {
  return (req?.status ?? '').toLowerCase() === 'rejected';
}

function refundRequestStatusLabel(
  status: string,
  t: (key: string) => string,
): string {
  const s = status.toLowerCase();
  if (s === 'approved') return t('ticket.refundStatusApproved');
  if (s === 'rejected') return t('ticket.refundStatusRejected');
  return t('ticket.refundStatusPending');
}

function refundRequestStatusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'approved') return C.success;
  if (s === 'rejected') return C.danger;
  return C.warning;
}

function statusColorFor(status: string): string {
  if (isUsedStatus(status)) return C.textMuted;
  if (isRefundPendingStatus(status)) return C.warning;
  if (isRefundedStatus(status)) return C.danger;
  if (isPaidOrActive(status)) return C.success;
  return C.accent;
}

function applyRefundFormFromRequest(req?: TicketRefundRequestInfo | null) {
  return {
    bankName: req?.bankName?.trim() || 'Vietcombank',
    accountNumber: req?.accountNumber ?? '',
    accountHolderName: (req?.accountHolderName ?? '').toUpperCase(),
    refundReason: req?.reason ?? '',
  };
}

export default function TicketDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const ticketId = parseNumericId(id);
  const { t, lang } = useLanguage();
  const { downloadPack, deletePack, getState, syncUpdateFlags } = useARPacks();
  const [detail, setDetail] = useState<TicketDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);
  const [packModalOpen, setPackModalOpen] = useState(false);
  const [packLoading, setPackLoading] = useState(false);
  const [ticketPack, setTicketPack] = useState<ARPack | null>(null);
  const [packError, setPackError] = useState<string | null>(null);
  const [checkInQty, setCheckInQty] = useState(1);
  const [groupRemaining, setGroupRemaining] = useState<number | null>(null);

  const [refundOpen, setRefundOpen] = useState(false);
  const [bankName, setBankName] = useState('Vietcombank');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountHolderName, setAccountHolderName] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundSuccess, setRefundSuccess] = useState(false);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);

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
        setCheckInQty(1);
        setGroupRemaining(null);
        const form = applyRefundFormFromRequest(res.data.latestRefundRequest);
        setBankName(form.bankName);
        setAccountNumber(form.accountNumber);
        setAccountHolderName(form.accountHolderName);
        setRefundReason(form.refundReason);
        if (res.data.isGroupOrder && res.data.ticketCode) {
          try {
            const v = await apiService.validateTicket(res.data.ticketCode);
            const remaining = v.data?.remainingTickets;
            if (remaining != null && remaining > 0) {
              setGroupRemaining(remaining);
              setCheckInQty(Math.min(1, remaining));
            }
          } catch {
            // validate is optional for UI; check-in still works with qty=1
          }
        }
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
      const qty =
        detail.isGroupOrder && groupRemaining != null && groupRemaining > 0
          ? Math.min(checkInQty, groupRemaining)
          : detail.isGroupOrder
            ? Math.max(1, checkInQty)
            : undefined;
      const res = await apiService.checkInTicket(detail.ticketCode, qty);
      const data = res.data;
      if (data?.isValid) {
        const extra =
          data.isGroupOrder && data.remainingTickets != null
            ? `\n${t('ticket.checkInRemaining').replace('{count}', String(data.remainingTickets))}`
            : '';
        Alert.alert(
          t('ticket.checkInTitle'),
          (data.message || t('ticket.checkInSuccess')) + extra,
        );
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
  }, [checkingIn, checkInQty, detail, groupRemaining, load, t]);

  const openPackForTicket = useCallback(async () => {
    if (!detail?.ticketCode) return;
    const isExhibition = Boolean(
      detail.exhibition?.id || detail.exhibition?.name?.trim(),
    );
    if (!isExhibition) return;
    setPackModalOpen(true);
    setPackLoading(true);
    setPackError(null);
    setTicketPack(null);
    try {
      const res = await apiService.getOfflinePackageByTicket(detail.ticketCode, lang);
      const pkg = res.data;
      if (!pkg?.packageUrl && !pkg?.downloadUrl) {
        setPackError(res.message || t('packs.byTicketFail'));
        return;
      }
      const sizeMB =
        pkg.sizeBytes != null
          ? Math.round(pkg.sizeBytes / (1024 * 1024))
          : pkg.packageSizeBytes != null
            ? Math.round(pkg.packageSizeBytes / (1024 * 1024))
            : 0;
      const pack: ARPack = {
        id: String(pkg.id),
        museumId: String(pkg.museumId ?? detail.museum.id ?? ''),
        name:
          pkg.packageName?.trim() ||
          pkg.name?.trim() ||
          pkg.exhibitionTitle?.trim() ||
          `Gói #${pkg.id}`,
        description:
          pkg.exhibitionTitle?.trim() ||
          detail.exhibition?.name ||
          t('packs.scopeMuseum'),
        sizeMB,
        artifactCount: pkg.arassetCount ?? pkg.exhibitCount ?? 0,
        category:
          pkg.exhibitionId != null
            ? t('packs.scopeExhibition')
            : t('packs.scopeMuseum'),
        color: C.accent,
        artifacts: [],
        packageUrl: pkg.packageUrl ?? pkg.downloadUrl,
        checksum: pkg.checksum,
        versionId: pkg.versionId,
        exhibitionId: pkg.exhibitionId ?? null,
        exhibitionTitle: pkg.exhibitionTitle ?? detail.exhibition?.name ?? null,
        packageName: pkg.packageName ?? null,
      };
      setTicketPack(pack);
      syncUpdateFlags([pack]);
    } catch (err: unknown) {
      setPackError(
        err instanceof Error ? err.message : t('packs.byTicketFail'),
      );
    } finally {
      setPackLoading(false);
    }
  }, [detail, lang, syncUpdateFlags, t]);

  const closePackModal = useCallback(() => {
    setPackModalOpen(false);
    setPackError(null);
    setTicketPack(null);
  }, []);

  const openRefund = useCallback(() => {
    setRefundError(null);
    const form = applyRefundFormFromRequest(detail?.latestRefundRequest);
    setBankName(form.bankName);
    setAccountNumber(form.accountNumber);
    setAccountHolderName(form.accountHolderName);
    setRefundReason(form.refundReason);
    setBankPickerOpen(false);
    setRefundOpen(true);
  }, [detail?.latestRefundRequest]);

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
      const amount = detail.price ?? detail.ticketType.price ?? 0;
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              status: 'Refund_Pending',
              latestRefundRequest: {
                id: prev.latestRefundRequest?.id ?? 0,
                amount,
                reason: refundReason.trim(),
                bankName: bankName.trim(),
                accountNumber: accountNumber.trim(),
                accountHolderName: accountHolderName.trim(),
                status: 'Pending',
                rejectReason: null,
                createdAt: new Date().toISOString(),
                processedAt: null,
              },
            }
          : prev,
      );
      setRefundOpen(false);
      setRefundSuccess(true);
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
  const hasRejectedRefund =
    isRefundRejected(detail.latestRefundRequest) && !refundPending && !refunded;
  const canSelfCheckIn = paidActive && Boolean(detail.ticketCode);
  const canRefund = paidActive;
  const showQr = Boolean(qrUri) && paidActive;
  const statusColor = statusColorFor(detail.status);
  /** Exhibition tickets only — standard tickets use museum-wide packs via AR Packs. */
  const isExhibitionTicket = Boolean(
    detail.exhibition?.id || detail.exhibition?.name?.trim(),
  );
  const showPackByTicket = (paidActive || used) && isExhibitionTicket;

  const unitPrice = detail.price ?? detail.ticketType.price ?? 0;
  const dash = '—';
  const dateLocale = lang === 'en' ? 'en-US' : 'vi-VN';
  const bankLabel =
    REFUND_BANKS.find((b) => b.value === bankName)?.label ?? bankName;
  const latestRefund = detail.latestRefundRequest;

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

        {hasRejectedRefund ? (
          <View style={[styles.banner, styles.bannerDanger]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={18} color={C.danger} />
            <View style={{ flex: 1, gap: 8 }}>
              <Text style={[styles.bannerText, { color: C.danger }]}>
                {t('ticket.refundRejectedTitle')}
              </Text>
              <View style={styles.rejectBox}>
                <Text style={styles.rejectReason}>
                  <Text style={styles.rejectReasonStrong}>
                    {t('ticket.refundRejectedReason')}{' '}
                  </Text>
                  {detail.latestRefundRequest?.rejectReason?.trim() ||
                    t('ticket.refundRejectedFallback')}
                </Text>
                {detail.latestRefundRequest?.processedAt ? (
                  <Text style={styles.rejectMeta}>
                    {t('ticket.refundRejectedAt').replace(
                      '{date}',
                      formatVisitorDate(
                        detail.latestRefundRequest.processedAt,
                        dateLocale,
                      ),
                    )}
                  </Text>
                ) : null}
              </View>
              <Text style={styles.rejectHint}>{t('ticket.refundRejectedHint')}</Text>
            </View>
          </View>
        ) : null}

        {refundSuccess ? (
          <View style={[styles.banner, styles.bannerSuccess]}>
            <MaterialCommunityIcons name="check-circle" size={18} color={C.success} />
            <Text style={[styles.bannerText, { color: C.success }]}>
              {t('ticket.refundSuccess')}
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
          {detail.isGroupOrder || detail.isFoc ? (
            <Row
              icon="account-group"
              label={t('ticket.groupBadge')}
              value={detail.isFoc ? t('ticket.focBadge') : '✓'}
            />
          ) : null}
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

        {latestRefund ? (
          <Section title={t('ticket.refundSection')}>
            <View style={styles.refundStatusRow}>
              <View
                style={[
                  styles.statusPill,
                  {
                    borderColor:
                      refundRequestStatusColor(latestRefund.status) + '55',
                    backgroundColor:
                      refundRequestStatusColor(latestRefund.status) + '18',
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    { color: refundRequestStatusColor(latestRefund.status) },
                  ]}
                >
                  {refundRequestStatusLabel(latestRefund.status, t)}
                </Text>
              </View>
            </View>
            <Row
              icon="cash"
              label={t('ticket.refundRequestAmount')}
              value={formatMoney(latestRefund.amount, lang, detail.order.currency)}
            />
            <Row
              icon="bank"
              label={t('ticket.refundBankAccount')}
              value={`${latestRefund.bankName} - ${latestRefund.accountNumber}`}
            />
            <Row
              icon="account"
              label={t('ticket.refundHolder')}
              value={latestRefund.accountHolderName || dash}
            />
            <Row
              icon="clock-outline"
              label={t('ticket.refundRequestedAt')}
              value={
                latestRefund.createdAt
                  ? formatVisitorDate(latestRefund.createdAt, dateLocale)
                  : dash
              }
            />
            <Row
              icon="text"
              label={t('ticket.refundYourReason')}
              value={latestRefund.reason?.trim() || dash}
            />
            {isRefundRejected(latestRefund) ? (
              <View style={styles.rejectBox}>
                <Text style={styles.rejectReasonStrong}>
                  {t('ticket.refundAdminRejectTitle')}
                </Text>
                <Text style={styles.rejectReason}>
                  {latestRefund.rejectReason?.trim() ||
                    t('ticket.refundAdminRejectFallback')}
                </Text>
                {latestRefund.processedAt ? (
                  <Text style={styles.rejectMeta}>
                    {t('ticket.refundRejectedProcessedAt').replace(
                      '{date}',
                      formatVisitorDate(latestRefund.processedAt, dateLocale),
                    )}
                  </Text>
                ) : null}
              </View>
            ) : null}
          </Section>
        ) : null}

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
                {detail.isGroupOrder ? (
                  <View style={styles.checkInQtyBlock}>
                    {groupRemaining != null ? (
                      <Text style={styles.checkInRemaining}>
                        {t('ticket.checkInRemaining').replace(
                          '{count}',
                          String(groupRemaining),
                        )}
                      </Text>
                    ) : null}
                    <Text style={styles.checkInQtyLabel}>{t('ticket.checkInQty')}</Text>
                    <View style={styles.checkInQtyRow}>
                      <TouchableOpacity
                        style={styles.checkInQtyBtn}
                        onPress={() =>
                          setCheckInQty((q) => Math.max(1, q - 1))
                        }
                      >
                        <MaterialCommunityIcons
                          name="minus"
                          size={18}
                          color={C.textSecondary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.checkInQtyValue}>{checkInQty}</Text>
                      <TouchableOpacity
                        style={styles.checkInQtyBtn}
                        onPress={() =>
                          setCheckInQty((q) =>
                            Math.min(groupRemaining ?? MAX_ORDER_QUANTITY, q + 1),
                          )
                        }
                      >
                        <MaterialCommunityIcons
                          name="plus"
                          size={18}
                          color={C.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : null}
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

        {showPackByTicket ? (
          <TouchableOpacity
            style={styles.packBtn}
            onPress={() => void openPackForTicket()}
          >
            <MaterialCommunityIcons
              name="package-variant"
              size={20}
              color={C.accent}
            />
            <Text style={styles.packBtnText}>{t('packs.byTicketAction')}</Text>
          </TouchableOpacity>
        ) : null}

        {canRefund ? (
          <TouchableOpacity style={styles.refundLink} onPress={openRefund}>
            <MaterialCommunityIcons name="cash-refund" size={18} color={C.warning} />
            <Text style={styles.refundLinkText}>
              {hasRejectedRefund
                ? t('ticket.refundActionRetry')
                : t('ticket.refundAction')}
            </Text>
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
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.modalHeader}>
                <View style={styles.modalIconWrap}>
                  <MaterialCommunityIcons
                    name="cash-refund"
                    size={22}
                    color={C.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalTitle}>{t('ticket.refundTitle')}</Text>
                  <Text style={styles.modalAmount}>
                    {t('ticket.refundAmountLine').replace(
                      '{amount}',
                      formatMoney(unitPrice, lang, detail.order.currency),
                    )}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => !refundLoading && setRefundOpen(false)}
                  hitSlop={10}
                  disabled={refundLoading}
                >
                  <MaterialCommunityIcons
                    name="close"
                    size={22}
                    color={C.textMuted}
                  />
                </TouchableOpacity>
              </View>

              {refundError ? (
                <View style={styles.modalErrorBox}>
                  <Text style={styles.modalError}>{refundError}</Text>
                </View>
              ) : null}

              <Text style={styles.inputLabel}>{t('ticket.refundBankName')}</Text>
              <TouchableOpacity
                style={styles.bankSelect}
                onPress={() => setBankPickerOpen((o) => !o)}
                disabled={refundLoading}
              >
                <Text style={styles.bankSelectText}>{bankLabel}</Text>
                <MaterialCommunityIcons
                  name={bankPickerOpen ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={C.textMuted}
                />
              </TouchableOpacity>
              {bankPickerOpen ? (
                <View style={styles.bankList}>
                  {REFUND_BANKS.map((bank) => {
                    const active = bank.value === bankName;
                    return (
                      <TouchableOpacity
                        key={bank.value}
                        style={[
                          styles.bankOption,
                          active && styles.bankOptionActive,
                        ]}
                        onPress={() => {
                          setBankName(bank.value);
                          setBankPickerOpen(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.bankOptionText,
                            active && styles.bankOptionTextActive,
                          ]}
                        >
                          {bank.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : null}

              <Text style={styles.inputLabel}>{t('ticket.refundAccountNumber')}</Text>
              <TextInput
                style={[styles.input, styles.inputMono]}
                value={accountNumber}
                onChangeText={setAccountNumber}
                placeholder={t('ticket.refundAccountNumberPlaceholder')}
                placeholderTextColor={C.textPlaceholder}
                keyboardType="number-pad"
                editable={!refundLoading}
              />

              <Text style={styles.inputLabel}>{t('ticket.refundAccountHolder')}</Text>
              <TextInput
                style={[styles.input, styles.inputMono]}
                value={accountHolderName}
                onChangeText={(text) => setAccountHolderName(text.toUpperCase())}
                placeholder={t('ticket.refundAccountHolderPlaceholder')}
                placeholderTextColor={C.textPlaceholder}
                autoCapitalize="characters"
                editable={!refundLoading}
              />

              <Text style={styles.inputLabel}>{t('ticket.refundReason')}</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                value={refundReason}
                onChangeText={setRefundReason}
                placeholder={t('ticket.refundReasonPlaceholder')}
                placeholderTextColor={C.textPlaceholder}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                editable={!refundLoading}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancel}
                  onPress={() => setRefundOpen(false)}
                  disabled={refundLoading}
                >
                  <Text style={styles.modalCancelText}>{t('ticket.refundCancel')}</Text>
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
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal
        visible={packModalOpen}
        animationType="slide"
        transparent
        onRequestClose={closePackModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalIconWrap}>
                <MaterialCommunityIcons
                  name="package-variant"
                  size={22}
                  color={C.accent}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle}>{t('packs.byTicketModalTitle')}</Text>
                <Text style={styles.modalAmount}>
                  {detail?.ticketCode
                    ? `${t('ticket.ticketCode')}: ${detail.ticketCode}`
                    : t('packs.byTicketModalHint')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={closePackModal}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel={t('common.close')}
              >
                <MaterialCommunityIcons name="close" size={22} color={C.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalHint}>{t('packs.byTicketModalHint')}</Text>

            {packLoading ? (
              <View style={styles.packModalLoading}>
                <ActivityIndicator color={C.accent} />
                <Text style={styles.packModalLoadingText}>
                  {t('packs.byTicketLoading')}
                </Text>
              </View>
            ) : packError ? (
              <Text style={styles.packModalError}>{packError}</Text>
            ) : ticketPack ? (
              <ARPackCard
                pack={ticketPack}
                state={getState(ticketPack.id)}
                onDownload={() => downloadPack(ticketPack)}
                onDelete={() => deletePack(ticketPack.id)}
              />
            ) : (
              <Text style={styles.packModalError}>{t('packs.byTicketFail')}</Text>
            )}
          </View>
        </View>
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
  bannerSuccess: {
    backgroundColor: C.success + '14',
    borderColor: C.success + '44',
  },
  bannerText: { flex: 1, fontSize: 13, fontWeight: '600', lineHeight: 18 },
  rejectBox: {
    borderRadius: 12,
    padding: 10,
    backgroundColor: C.danger + '12',
    borderWidth: 1,
    borderColor: C.danger + '33',
    gap: 4,
  },
  rejectReason: { fontSize: 12, color: C.danger, lineHeight: 17, fontWeight: '500' },
  rejectReasonStrong: { fontSize: 12, color: C.danger, fontWeight: '800' },
  rejectMeta: { fontSize: 11, color: C.danger, opacity: 0.8, marginTop: 2 },
  rejectHint: {
    fontSize: 12,
    color: C.textSecondary,
    fontWeight: '500',
    lineHeight: 17,
  },
  refundStatusRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 4,
  },
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
  checkInQtyBlock: {
    marginTop: 4,
    marginBottom: 4,
    gap: 8,
  },
  checkInRemaining: {
    fontSize: 12,
    fontWeight: '600',
    color: C.accent,
  },
  checkInQtyLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.textMuted,
  },
  checkInQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  checkInQtyBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bgElevated,
  },
  checkInQtyValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    minWidth: 28,
    textAlign: 'center',
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
  packBtn: {
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.accent,
    backgroundColor: C.accentMuted,
    paddingHorizontal: 16,
  },
  packBtnText: { color: C.accent, fontSize: 14, fontWeight: '700' },
  packModalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 32,
  },
  packModalLoadingText: {
    fontSize: 13,
    color: C.textMuted,
    fontWeight: '600',
  },
  packModalError: {
    fontSize: 14,
    color: C.danger,
    fontWeight: '600',
    lineHeight: 20,
    paddingVertical: 16,
    textAlign: 'center',
  },
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  modalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: C.accent + '22',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: C.textPrimary },
  modalAmount: {
    marginTop: 4,
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '600',
  },
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
  bankSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  bankSelectText: { flex: 1, fontSize: 14, color: C.textPrimary, fontWeight: '600' },
  bankList: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.bgElevated,
    overflow: 'hidden',
  },
  bankOption: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.border,
  },
  bankOptionActive: { backgroundColor: C.accentMuted },
  bankOptionText: { fontSize: 13, color: C.textPrimary, fontWeight: '500' },
  bankOptionTextActive: { color: C.accent, fontWeight: '700' },
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
  inputMono: { fontVariant: ['tabular-nums'] },
  inputMultiline: { minHeight: 80 },
  modalErrorBox: {
    marginBottom: 8,
    borderRadius: 12,
    padding: 10,
    backgroundColor: C.danger + '14',
    borderWidth: 1,
    borderColor: C.danger + '33',
  },
  modalError: { color: C.danger, fontSize: 13, fontWeight: '600' },
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
    flex: 1.2,
    minHeight: 48,
    borderRadius: 14,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSubmitText: { color: C.onAccent, fontWeight: '700', fontSize: 14 },
});
