import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiService, MuseumProfileDto } from '../services/apiService';
import { setCachedMuseumId } from '../services/museumContext';
import { notifyMuseumReadyForAnalytics } from '../services/trackAnalytics';
import { type MuseumRecord } from '../data/museums';
import { useLanguage } from '../i18n/LanguageContext';
import type { AppLanguage } from '../services/languagePrefs';
import { C } from '../theme/colors';

/** Brand accent only — not mock museum content. */
const UI_ACCENT = C.accent;

type ProfileExtras = {
  exhibitCount: number;
  ticketPriceVnd: number;
};

/**
 * Map BE museum profile → UI record.
 * Does not merge National History Museum mock content.
 */
function formatTicketPrice(amount: number, lang: AppLanguage): string {
  if (!(amount > 0)) {
    return lang === 'en' ? 'Contact for price' : 'Liên hệ';
  }
  if (lang === 'en') {
    return `${amount.toLocaleString('en-US')} VND/person`;
  }
  return `${amount.toLocaleString('vi-VN')} đ/người`;
}

function mapProfileFromApi(
  profile: MuseumProfileDto,
  extras: Partial<ProfileExtras> | undefined,
  lang: AppLanguage,
): MuseumRecord {
  const ticketPriceVnd =
    extras?.ticketPriceVnd ??
    (profile.ticketPrice != null && profile.ticketPrice > 0 ? profile.ticketPrice : 0);

  const cityParts = [profile.city, profile.province].filter(Boolean);
  const city = cityParts.join(', ');

  const hoursFromLang = profile.translations
    ?.find((row) => row.languageCode?.toLowerCase() === lang)
    ?.openingHours?.trim();
  const hoursFromVi = profile.translations
    ?.find((row) => row.languageCode?.toLowerCase() === 'vi')
    ?.openingHours?.trim();
  const openHours = (
    (lang === 'en'
      ? hoursFromLang || profile.openingHoursEn || profile.openingHours || profile.openHours || hoursFromVi
      : profile.openingHours || profile.openHours || hoursFromVi || hoursFromLang) || ''
  ).trim();

  const addressFromLang = profile.translations
    ?.find((row) => row.languageCode?.toLowerCase() === lang)
    ?.address?.trim();
  const addressFromVi = profile.translations
    ?.find((row) => row.languageCode?.toLowerCase() === 'vi')
    ?.address?.trim();
  const address = (
    (lang === 'en'
      ? addressFromLang || profile.addressEn || profile.address || addressFromVi
      : profile.address || addressFromVi || addressFromLang || profile.addressEn) || ''
  ).trim();

  const phone = (profile.contactPhone || profile.phone || '').trim();
  const founded =
    profile.foundedYear != null && String(profile.foundedYear).trim()
      ? String(profile.foundedYear).trim()
      : '';

  return {
    id: String(profile.id),
    name: profile.name?.trim() || (lang === 'en' ? 'Museum' : 'Bảo tàng'),
    city: city || '—',
    tag: '',
    color: UI_ACCENT,
    address: address || city || '—',
    latitude:
      profile.latitude != null && Number.isFinite(profile.latitude)
        ? profile.latitude
        : undefined,
    longitude:
      profile.longitude != null && Number.isFinite(profile.longitude)
        ? profile.longitude
        : undefined,
    phone: phone || '—',
    openHours: openHours || '—',
    closedDay: profile.closedDay?.trim() || '',
    ticketPriceVnd,
    ticketPrice: formatTicketPrice(ticketPriceVnd, lang),
    exhibits: extras?.exhibitCount ?? profile.exhibitCount ?? 0,
    founded,
    description: profile.description?.trim() || '',
    // BE MuseumDto does not provide these — leave empty (UI hides empty sections).
    highlights: [],
    zones: [],
    thumbnailUrl: profile.thumbnailUrl || profile.logoUrl,
  };
}

/** Minimal placeholder while loading / on error — not the old mock museum. */
const EMPTY_MUSEUM: MuseumRecord = {
  id: '0',
  name: 'Đang tải…',
  city: '—',
  tag: '',
  color: UI_ACCENT,
  address: '—',
  phone: '—',
  openHours: '—',
  closedDay: '',
  ticketPrice: '—',
  ticketPriceVnd: 0,
  exhibits: 0,
  founded: '',
  description: '',
  highlights: [],
  zones: [],
};

/**
 * Lấy hồ sơ bảo tàng thật từ GET /Admin/museum-profile.
 * Bổ sung số hiện vật (Content/exhibits) và giá vé thấp nhất (Ticketing/types).
 */
export function useMuseumProfile() {
  const { lang } = useLanguage();
  const [profile, setProfile] = useState<MuseumProfileDto | null>(null);
  const [extras, setExtras] = useState<ProfileExtras>({
    exhibitCount: 0,
    ticketPriceVnd: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiService.getMuseumProfile(lang);
      let data = response.data ?? null;

      // EN translation may overwrite hours with empty; refill from canonical profile.
      const hasHours = Boolean(
        data?.openingHours?.trim() ||
          data?.openHours?.trim() ||
          data?.openingHoursEn?.trim() ||
          data?.translations?.some((row) => row.openingHours?.trim()),
      );
      const hasAddress = Boolean(
        data?.address?.trim() ||
          data?.addressEn?.trim() ||
          data?.translations?.some((row) => row.address?.trim()),
      );
      if (data && (!hasHours || !hasAddress)) {
        const fallback = await apiService.getMuseumProfile();
        const hours =
          fallback.data?.openingHours?.trim() ||
          fallback.data?.openHours?.trim() ||
          '';
        const address =
          fallback.data?.address?.trim() ||
          fallback.data?.addressEn?.trim() ||
          '';
        if (hours || address) {
          data = {
            ...data,
            ...(hours
              ? { openingHours: data.openingHours || hours, openHours: data.openHours || hours }
              : {}),
            ...(address ? { address: data.address?.trim() || address } : {}),
            latitude: data.latitude ?? fallback.data?.latitude,
            longitude: data.longitude ?? fallback.data?.longitude,
            city: data.city?.trim() || fallback.data?.city,
            province: data.province?.trim() || fallback.data?.province,
          };
        }
      }

      setProfile(data);

      if (data?.id != null) {
        setCachedMuseumId(data.id);
        notifyMuseumReadyForAnalytics();

        const [exhibitsResult, ticketsResult] = await Promise.allSettled([
          apiService.getExhibits(data.id),
          apiService.getTicketTypes(lang),
        ]);

        let exhibitCount = data.exhibitCount ?? 0;
        if (exhibitsResult.status === 'fulfilled') {
          exhibitCount = exhibitsResult.value.data?.length ?? exhibitCount;
        }

        let ticketPriceVnd = data.ticketPrice ?? 0;
        if (ticketsResult.status === 'fulfilled') {
          const prices = (ticketsResult.value.data ?? [])
            .map((t) => Number(t.price))
            .filter((p) => Number.isFinite(p) && p > 0);
          if (prices.length > 0) {
            ticketPriceVnd = Math.min(...prices);
          }
        }

        setExtras({ exhibitCount, ticketPriceVnd });
      } else {
        setExtras({ exhibitCount: 0, ticketPriceVnd: 0 });
      }
    } catch (err: unknown) {
      setProfile(null);
      setExtras({ exhibitCount: 0, ticketPriceVnd: 0 });
      setError(err instanceof Error ? err.message : 'Không thể tải hồ sơ bảo tàng');
    } finally {
      setLoading(false);
    }
  }, [lang]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const museum = useMemo(() => {
    if (!profile) return EMPTY_MUSEUM;
    return mapProfileFromApi(profile, extras, lang);
  }, [profile, extras, lang]);

  return { profile, museum, loading, error, refresh };
}
