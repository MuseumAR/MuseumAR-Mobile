import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/apiConfig';
import { getRefreshToken, getToken, saveTokens } from './tokenStorage';

// Giao diện dữ liệu phản hồi chung từ API
export interface ApiResponse<T> {
  statusCode: number;
  status: string;
  message: string;
  data: T;
}

export interface LoginResponse {
  userId: number;
  fullName: string;
  email: string;
  roleName: string;
  accessToken: string;
  /** Token dùng để lấy accessToken mới khi hết hạn (nếu backend hỗ trợ) */
  refreshToken?: string;
  /**
   * Id visitor gắn với tài khoản (nếu BE trả về).
   * Role Visitor sẽ fallback client-side về 1 nếu thiếu.
   */
  visitorId?: number | null;
}

export interface MuseumDto {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  status: string;
  thumbnailUrl?: string;
}

export interface ExhibitTranslationDto {
  id?: number;
  exhibitId: number;
  languageCode: string;
  title: string;
  description?: string;
  audioUrl?: string;
  audioDuration?: number;
}

export interface ExhibitMetadataDto {
  ageGroupId?: number;
  era?: string;
  historicalEvent?: string;
}

export interface ExhibitDto {
  id: number;
  museumId: number;
  categoryId?: number;
  themeId?: number;
  tagIds?: number[];
  exhibitCode?: string;
  qrCodeData?: string;
  qrCodeImageUrl?: string;
  thumbnailUrl?: string;
  arOverlayUrl?: string;
  arMarkerUrl?: string;
  status: string;
  publishedAt?: string;
  exhibitMetadata?: ExhibitMetadataDto | null;
  translations: ExhibitTranslationDto[];
}

export interface TrackActionRequest {
  museumId?: number | null;
  exhibitId?: number | null;
  actionType: string;
  languageUsed?: string | null;
  deviceType?: string | null;
  searchQuery?: string | null;
}

/** POST /Visitor/sync — upsert visitor by device; JWT links userId. */
export interface VisitorSyncRequest {
  deviceId: string;
  displayName?: string;
  email?: string;
  preferredLang?: string;
  deviceType?: string;
  deviceModel?: string;
  appVersion?: string;
}

export interface VisitorProfileDto {
  id: number;
  deviceId: string;
  displayName: string;
  email: string;
  preferredLang: string;
  deviceType: string;
  deviceModel: string;
  appVersion: string;
  firstSeenAt: string;
  lastSeenAt: string;
  analyticsLogs: unknown[];
  bookmarks: BookmarkDto[];
  packageDownloads: unknown[];
  tickets: unknown[];
  transactions: unknown[];
  visitedExhibits: VisitedExhibitDto[];
}

export interface BookmarkDto {
  id: number;
  visitorId: number;
  exhibitId: number;
  createdAt: string;
}

export interface VisitedExhibitDto {
  id: number;
  visitorId: number;
  exhibitId: number;
  visitedAt: string;
  timeSpentSeconds: number | null;
}

export interface SyncCheckDto {
  id: number;
  museumId: number;
  versionId?: number;
  packageUrl?: string;
  checksum?: string;
  status?: string;
  arassetCount?: number;
  createdAt?: string;
  /** Client-only helper flags (optional) */
  hasUpdates?: boolean;
}

// --- TICKETING ---
export interface TicketTypeDto {
  id: number;
  name: string;
  description?: string;
  /** Giá vé (VND) */
  price: number;
  museumId?: number;
  exhibitionId?: number | null;
  /** e.g. Approved / Pending / Rejected */
  status?: string;
  /** Legacy / UI helper */
  currency?: string;
  isActive?: boolean;
}

export interface CreateOrderRequest {
  /** Spec: POST /Ticketing/create-order body { ticketTypeId, quantity } */
  ticketTypeId: number;
  quantity: number;
  /**
   * Optional deep links for PayOS redirect back into the app.
   * Requires BE to forward these into CreatePaymentLink (ignored if BE DTO lacks fields).
   */
  returnUrl?: string;
  cancelUrl?: string;
}

/**
 * POST /Ticketing/create-order → PayOS payment payload
 * (PaymentService anonymous object: CheckoutUrl, QrCode, OrderCode, Amount).
 */
export interface CreateOrderResponse {
  checkoutUrl?: string;
  qrCode?: string;
  orderCode?: string;
  amount?: number;
  /** Legacy aliases */
  paymentUrl?: string;
  totalAmount?: number;
  orderId?: number;
  status?: string;
}

export interface MyTicketDto {
  id: number;
  ticketCode?: string;
  ticketTypeName?: string;
  purchaseDate?: string;
  validDate?: string | null;
  status?: string;
  orderCode?: string;
  checkoutUrl?: string;
  canResumePayment?: boolean;
  /** Optional / legacy aliases used in older UI */
  orderId?: number;
  ticketTypeId?: number;
  museumId?: number;
  museumName?: string;
  price?: number;
  visitDate?: string;
  qrCodeUrl?: string;
  purchasedAt?: string;
}

export interface PaymentCheckDto {
  valid?: boolean;
  status?: string;
  orderCode?: string;
  checkoutUrl?: string | null;
}

// --- CONTENT ---
export interface CategoryTranslationDto {
  id?: number;
  categoryId?: number;
  languageCode?: string;
  categoryName?: string;
  description?: string;
}

/** GET /Content/categories — tên nằm trong categoryTranslations[].categoryName */
export interface CategoryDto {
  id: number;
  museumId?: number;
  parentId?: number | null;
  sortOrder?: number;
  iconUrl?: string;
  status?: string;
  categoryTranslations?: CategoryTranslationDto[];
  /** Tên đã chuẩn hoá phía client (sau khi pick translation). */
  name?: string;
  slug?: string;
  description?: string;
  /** 'category' | 'theme' | 'tag' */
  type?: 'category' | 'theme' | 'tag' | string;
  exhibitCount?: number;
}

/** GET /Content/themes */
export interface ThemeDto {
  id: number;
  museumId?: number;
  themeName?: string;
  name?: string;
  description?: string;
}

/** GET /Content/tags */
export interface TagDto {
  id: number;
  museumId?: number;
  tagName?: string;
  name?: string;
  description?: string;
}

export type TaxonomyKind = 'category' | 'theme' | 'tag';

/** Chip lọc Explore (category / theme / tag). */
export interface TaxonomyChip {
  key: string;
  id: number;
  name: string;
  kind: TaxonomyKind;
}

/**
 * Matches WebBE ExhibitArassetDto.
 * Backend fields: assetUrl, assetType (OverlayImage | Model3D | MarkerImage | Audio).
 * `url` is a client-normalized alias of assetUrl.
 */
export interface ArAssetDto {
  id: number;
  exhibitId: number;
  /** Backend: OverlayImage | Model3D | MarkerImage | Audio | … */
  assetType?: string;
  /** Backend field */
  assetUrl?: string;
  /** Normalized from assetUrl (or url if already present) */
  url: string;
  /** 'glb' | 'gltf' | 'png' | 'mp3' … (inferred when BE omits it) */
  format?: string;
  description?: string;
  fileSizeBytes?: number;
  scale?: number;
  markerUrl?: string;
  previewImageUrl?: string;
  createdAt?: string;
}

/** Normalize BE AR asset payload → mobile shape. */
export function normalizeArAsset(
  raw: Partial<ArAssetDto> & { assetUrl?: string | null },
): ArAssetDto {
  const url = String(raw.url ?? raw.assetUrl ?? '').trim();
  const formatFromUrl = (() => {
    const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return m?.[1]?.toLowerCase();
  })();

  return {
    id: Number(raw.id) || 0,
    exhibitId: Number(raw.exhibitId) || 0,
    assetType: raw.assetType,
    assetUrl: (raw.assetUrl ?? url) || undefined,
    url,
    format: raw.format ?? formatFromUrl,
    description: raw.description,
    fileSizeBytes: raw.fileSizeBytes,
    scale: raw.scale,
    markerUrl: raw.markerUrl,
    previewImageUrl: raw.previewImageUrl,
    createdAt: raw.createdAt,
  };
}

/** Matches BE OfflinePackageDto (+ optional richer fields if BE expands later). */
export interface ContentPackageDto {
  id: number;
  museumId?: number;
  versionId?: number;
  packageUrl?: string;
  checksum?: string;
  status?: string;
  arassetCount?: number;
  createdAt?: string;
  /** Optional / future fields */
  name?: string;
  description?: string;
  sizeBytes?: number;
  exhibitCount?: number;
  category?: string;
  downloadUrl?: string;
  version?: string;
  thumbnailUrl?: string;
}

/**
 * GET /Content/maps → BE MuseumMapDto returns only:
 * { id, museumId, mapImageUrl, mapType }  (mapType = entity MapName ?? "floor").
 * Other entity columns (floorNumber, width, height, isDefault) are not exposed.
 */
export interface MuseumMapDto {
  id: number;
  museumId?: number;
  /** BE field */
  mapImageUrl?: string;
  /** Normalized alias of mapImageUrl for UI */
  imageUrl?: string;
  /** BE field — carries the map/floor name */
  mapType?: string;
  /** Display label derived from mapType */
  label?: string;
  /** Parsed from the label when it contains a number (e.g. "Tầng 2" → 2) */
  floorNumber?: number;
}

/** Pull a leading/embedded floor number out of a label such as "Tầng 2" / "Floor 3". */
function parseFloorNumber(label: string): number | undefined {
  const match = label.match(/\d+/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : undefined;
}

/** Normalize BE museum map payload → mobile shape. */
export function normalizeMuseumMap(
  raw: Partial<MuseumMapDto> & { mapImageUrl?: string | null },
): MuseumMapDto {
  const imageUrl = String(raw.imageUrl ?? raw.mapImageUrl ?? '').trim();
  const mapType = String(raw.mapType ?? '').trim();
  const id = Number(raw.id) || 0;
  const label = mapType && mapType.toLowerCase() !== 'floor' ? mapType : '';

  return {
    id,
    museumId: raw.museumId != null ? Number(raw.museumId) : undefined,
    mapImageUrl: (raw.mapImageUrl ?? imageUrl) || undefined,
    imageUrl: imageUrl || undefined,
    mapType: mapType || undefined,
    label: label || `Bản đồ ${id}`,
    floorNumber: label ? parseFloorNumber(label) : undefined,
  };
}

export interface RoutePointDto {
  id?: number;
  exhibitId?: number;
  order?: number;
  title?: string;
  x?: number;
  y?: number;
}

export interface TourRouteDto {
  id: number;
  museumId?: number;
  /** BE thường null vì tên nằm ở TourRouteTranslations — client tự fallback. */
  name?: string | null;
  description?: string;
  /** BE field thật */
  estimatedDurationMinutes?: number | null;
  /** Alias cũ dùng trong UI */
  durationMinutes?: number;
  distanceMeters?: number;
  difficulty?: string;
  stopCount?: number;
  thumbnailUrl?: string;
  points?: RoutePointDto[];
}

// --- ADMIN ---
export interface MuseumProfileDto {
  id: number;
  name: string;
  description?: string;
  address?: string;
  city?: string;
  province?: string;
  country?: string;
  /** BE field */
  contactPhone?: string;
  /** Alias used by older clients */
  phone?: string;
  contactEmail?: string;
  email?: string;
  /** BE field */
  openingHours?: string;
  /** Alias used by older clients */
  openHours?: string;
  closedDay?: string;
  /** Giá vé cơ bản (VND) — not on BE MuseumDto; filled from ticket types when possible */
  ticketPrice?: number;
  foundedYear?: string | number;
  exhibitCount?: number;
  thumbnailUrl?: string;
  logoUrl?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
}

/** Normalize BE MuseumDto → mobile MuseumProfileDto. */
export function normalizeMuseumProfile(
  raw: Partial<MuseumProfileDto> | null | undefined,
): MuseumProfileDto | null {
  if (!raw || typeof raw !== 'object') return null;
  const id = Number(raw.id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const openingHours = String(raw.openingHours ?? raw.openHours ?? '').trim();
  const contactPhone = String(raw.contactPhone ?? raw.phone ?? '').trim();
  const contactEmail = String(raw.contactEmail ?? raw.email ?? '').trim();
  const thumbnailUrl = String(raw.thumbnailUrl ?? raw.logoUrl ?? '').trim();

  return {
    id,
    name: String(raw.name ?? '').trim(),
    description: String(raw.description ?? '').trim() || undefined,
    address: String(raw.address ?? '').trim() || undefined,
    city: String(raw.city ?? '').trim() || undefined,
    province: String(raw.province ?? '').trim() || undefined,
    country: String(raw.country ?? '').trim() || undefined,
    contactPhone: contactPhone || undefined,
    phone: contactPhone || undefined,
    contactEmail: contactEmail || undefined,
    email: contactEmail || undefined,
    openingHours: openingHours || undefined,
    openHours: openingHours || undefined,
    closedDay: String(raw.closedDay ?? '').trim() || undefined,
    ticketPrice:
      raw.ticketPrice != null && Number.isFinite(Number(raw.ticketPrice))
        ? Number(raw.ticketPrice)
        : undefined,
    foundedYear: raw.foundedYear,
    exhibitCount:
      raw.exhibitCount != null && Number.isFinite(Number(raw.exhibitCount))
        ? Number(raw.exhibitCount)
        : undefined,
    thumbnailUrl: thumbnailUrl || undefined,
    logoUrl: thumbnailUrl || undefined,
    status: String(raw.status ?? '').trim() || undefined,
    latitude: raw.latitude != null ? Number(raw.latitude) : undefined,
    longitude: raw.longitude != null ? Number(raw.longitude) : undefined,
    website: String(raw.website ?? '').trim() || undefined,
  };
}

export class ApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
  }
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.statusCode >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return fallback;
}

export function getLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.statusCode === 401 || error.statusCode === 400) {
      return 'Email hoặc mật khẩu không đúng. Vui lòng kiểm tra và thử lại.';
    }
    if (error.statusCode >= 500) {
      return 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.';
    }
    return error.message;
  }
  if (error instanceof TypeError) {
    return 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Đăng nhập thất bại. Vui lòng thử lại.';
}

// Xây query string từ object (bỏ qua giá trị null/undefined)
function buildQuery(params?: Record<string, string | number | boolean | null | undefined>): string {
  if (!params) return '';
  const parts = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

// Gọi refresh token; trả về accessToken mới hoặc null nếu thất bại.
// Dùng biến module để tránh gọi refresh song song nhiều lần.
let refreshPromise: Promise<string | null> | null = null;

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) return null;

  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/Auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as ApiResponse<LoginResponse>;
        const newAccess = json.data?.accessToken;
        if (!newAccess) return null;
        await saveTokens(newAccess, json.data?.refreshToken ?? refreshToken);
        return newAccess;
      } catch {
        return null;
      } finally {
        // Reset sau một nhịp để các request đồng thời cùng dùng chung kết quả
        setTimeout(() => {
          refreshPromise = null;
        }, 0);
      }
    })();
  }

  return refreshPromise;
}

// Hàm fetch API dùng chung hỗ trợ tự động đính kèm token JWT + auto-refresh khi 401
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  allowRefresh = true,
): Promise<ApiResponse<T>> {
  const token = await getToken();

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    throw new TypeError('Network request failed');
  }

  // Access token hết hạn: thử refresh 1 lần rồi gọi lại request gốc.
  if (response.status === 401 && allowRefresh && token) {
    const newToken = await tryRefreshToken();
    if (newToken) {
      return apiFetch<T>(endpoint, options, false);
    }
  }

  const text = await response.text();
  let json: ApiResponse<T> & { message?: string };

  if (!text.trim()) {
    if (!response.ok) {
      throw new ApiError(`Lỗi API (Mã: ${response.status})`, response.status);
    }
    json = {
      statusCode: response.status,
      status: 'Success',
      message: '',
      data: null as T,
    };
  } else {
    try {
      json = JSON.parse(text) as ApiResponse<T> & { message?: string };
    } catch {
      throw new ApiError('Phản hồi từ máy chủ không hợp lệ.', response.status);
    }
  }

  if (!response.ok) {
    throw new ApiError(json.message || `Lỗi API (Mã: ${response.status})`, response.status);
  }
  return json as ApiResponse<T>;
}

// Các hàm dịch vụ chính gọi API
export const apiService = {
  // --- AUTHENTICATION ---
  async login(email: string, password: string): Promise<ApiResponse<LoginResponse>> {
    return apiFetch<LoginResponse>('Auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async register(fullName: string, email: string, password: string, phoneNumber?: string): Promise<ApiResponse<number>> {
    return apiFetch<number>('Auth/register', {
      method: 'POST',
      body: JSON.stringify({ fullName, email, password, phoneNumber }),
    });
  },

  async googleLogin(idToken: string): Promise<ApiResponse<LoginResponse>> {
    return apiFetch<LoginResponse>('Auth/google-login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
  },

  async refresh(refreshToken: string): Promise<ApiResponse<LoginResponse>> {
    // allowRefresh = false: tránh vòng lặp refresh vô hạn
    return apiFetch<LoginResponse>(
      'Auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken }),
      },
      false,
    );
  },

  async logout(): Promise<ApiResponse<null>> {
    return apiFetch<null>('Auth/logout', { method: 'POST' });
  },

  async forgotPassword(email: string): Promise<ApiResponse<null>> {
    return apiFetch<null>('Auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async resetPassword(token: string, newPassword: string): Promise<ApiResponse<null>> {
    return apiFetch<null>('Auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    });
  },

  async changePassword(oldPassword: string, newPassword: string): Promise<ApiResponse<null>> {
    return apiFetch<null>('Auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    });
  },

  // --- CONTENT ---
  /**
   * @deprecated BE no longer has Admin/museums list.
   * Use getMuseumProfile() (GET /Admin/museum-profile) instead.
   */
  async getMuseums(): Promise<ApiResponse<MuseumDto[]>> {
    const profile = await apiService.getMuseumProfile();
    const m = profile.data;
    if (!m) return { ...profile, data: [] };
    return {
      ...profile,
      data: [
        {
          id: m.id,
          name: m.name,
          description: m.description,
          address: m.address,
          city: m.city,
          status: m.status ?? 'Active',
          thumbnailUrl: m.thumbnailUrl,
        },
      ],
    };
  },

  /**
   * List exhibits for a museum — filters client-side from GET /Content/exhibits
   * (BE list endpoint has no museumId path param).
   */
  async getExhibits(museumId: number): Promise<ApiResponse<ExhibitDto[]>> {
    const response = await apiService.getContentExhibits();
    const filtered = (response.data ?? []).filter((e) => e.museumId === museumId);
    return { ...response, data: filtered };
  },

  async getExhibitDetail(id: number): Promise<ApiResponse<ExhibitDto>> {
    return apiFetch<ExhibitDto>(`Content/exhibits/${id}`);
  },

  /**
   * BE GetExhibit sometimes returns empty translations.
   * Prefer this when title/description/audio are needed.
   */
  async getExhibitTranslations(exhibitId: number): Promise<ApiResponse<ExhibitTranslationDto[]>> {
    return apiFetch<ExhibitTranslationDto[]>(`Content/exhibits/${exhibitId}/translations`);
  },

  /**
   * Ghép translations vào ExhibitDto (list/detail).
   * Nếu DTO đã có translations thì giữ nguyên; nếu rỗng thì gọi API translations.
   */
  async enrichExhibit(dto: ExhibitDto): Promise<ExhibitDto> {
    if (dto.translations && dto.translations.length > 0) return dto;
    try {
      const res = await apiService.getExhibitTranslations(dto.id);
      return { ...dto, translations: res.data ?? [] };
    } catch {
      return { ...dto, translations: dto.translations ?? [] };
    }
  },

  /** Danh sách hiện vật — Public. Filter phía client nếu cần. */
  async getContentExhibits(): Promise<ApiResponse<ExhibitDto[]>> {
    return apiFetch<ExhibitDto[]>('Content/exhibits');
  },

  /** Các asset AR 3D của một hiện vật. */
  async getExhibitArAssets(exhibitId: number): Promise<ApiResponse<ArAssetDto[]>> {
    const response = await apiFetch<ArAssetDto[]>(`Content/exhibits/${exhibitId}/ar-assets`);
    return {
      ...response,
      data: (response.data ?? []).map((item) => normalizeArAsset(item)),
    };
  },

  /** Gói nội dung offline / AR packs. */
  async getPackages(): Promise<ApiResponse<ContentPackageDto[]>> {
    return apiFetch<ContentPackageDto[]>('Content/packages');
  },

  /** Bản đồ bảo tàng. */
  async getMaps(): Promise<ApiResponse<MuseumMapDto[]>> {
    const response = await apiFetch<MuseumMapDto[]>('Content/maps');
    return {
      ...response,
      data: (response.data ?? []).map((item) => normalizeMuseumMap(item)),
    };
  },

  /** Tour / lộ trình tham quan. */
  async getRoutes(): Promise<ApiResponse<TourRouteDto[]>> {
    return apiFetch<TourRouteDto[]>('Content/routes');
  },

  /** Danh mục hiện vật. */
  async getCategories(): Promise<ApiResponse<CategoryDto[]>> {
    return apiFetch<CategoryDto[]>('Content/categories');
  },

  /** Chủ đề trưng bày. */
  async getThemes(): Promise<ApiResponse<ThemeDto[]>> {
    return apiFetch<ThemeDto[]>('Content/themes');
  },

  /** Tag hiện vật. */
  async getTags(): Promise<ApiResponse<TagDto[]>> {
    return apiFetch<TagDto[]>('Content/tags');
  },

  // --- TICKETING ---
  async getTicketTypes(): Promise<ApiResponse<TicketTypeDto[]>> {
    return apiFetch<TicketTypeDto[]>('Ticketing/types');
  },

  async createOrder(payload: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> {
    const response = await apiFetch<CreateOrderResponse & Record<string, unknown>>(
      'Ticketing/create-order',
      {
        method: 'POST',
        body: JSON.stringify({
          ticketTypeId: payload.ticketTypeId,
          quantity: payload.quantity,
          ...(payload.returnUrl ? { returnUrl: payload.returnUrl } : {}),
          ...(payload.cancelUrl ? { cancelUrl: payload.cancelUrl } : {}),
        }),
      },
    );
    const raw = response.data;
    if (!raw) return { ...response, data: undefined };

    // Normalize PascalCase / camelCase from PayOS create-order response.
    const checkoutUrl = String(
      raw.checkoutUrl ?? raw.CheckoutUrl ?? raw.paymentUrl ?? '',
    ).trim();
    const qrCode = String(raw.qrCode ?? raw.QrCode ?? '').trim() || undefined;
    const orderCode = String(raw.orderCode ?? raw.OrderCode ?? '').trim() || undefined;
    const amountRaw = raw.amount ?? raw.Amount ?? raw.totalAmount;
    const amount =
      amountRaw != null && Number.isFinite(Number(amountRaw))
        ? Number(amountRaw)
        : undefined;

    return {
      ...response,
      data: {
        checkoutUrl: checkoutUrl || undefined,
        paymentUrl: checkoutUrl || undefined,
        qrCode,
        orderCode,
        amount,
        totalAmount: amount,
      },
    };
  },

  async getMyTickets(): Promise<ApiResponse<MyTicketDto[]>> {
    return apiFetch<MyTicketDto[]>('Ticketing/my-tickets');
  },

  /**
   * POST /Ticketing/cancel-order?orderCode= — JWT.
   * Marks Pending tickets Cancelled when user cancels PayOS.
   */
  async cancelOrder(orderCode: string): Promise<ApiResponse<unknown>> {
    return apiFetch<unknown>(
      `Ticketing/cancel-order${buildQuery({ orderCode })}`,
      { method: 'POST' },
    );
  },

  /** GET /Ticketing/check-payment?orderCode= — sync PayOS status; may expire → Cancelled. */
  async checkPayment(orderCode: string): Promise<ApiResponse<PaymentCheckDto>> {
    const response = await apiFetch<PaymentCheckDto & Record<string, unknown>>(
      `Ticketing/check-payment${buildQuery({ orderCode })}`,
    );
    const raw = response.data;
    if (!raw) return { ...response, data: undefined };
    return {
      ...response,
      data: {
        valid: Boolean(raw.valid ?? raw.Valid),
        status: String(raw.status ?? raw.Status ?? ''),
        orderCode: String(raw.orderCode ?? raw.OrderCode ?? orderCode),
        checkoutUrl:
          String(raw.checkoutUrl ?? raw.CheckoutUrl ?? '').trim() || null,
      },
    };
  },

  // --- ADMIN ---
  /** Hồ sơ bảo tàng (single museum) — Public. */
  async getMuseumProfile(): Promise<ApiResponse<MuseumProfileDto>> {
    const response = await apiFetch<MuseumProfileDto>('Admin/museum-profile');
    const normalized = normalizeMuseumProfile(response.data);
    return {
      ...response,
      data: normalized as MuseumProfileDto,
    };
  },

  // --- VISITOR ---
  /**
   * POST /Visitor/sync — Public (optional JWT).
   * Upsert visitor by deviceId; when JWT is present, links userId.
   * Call after login/register before bookmarks / visits / tickets.
   */
  async syncVisitor(payload: VisitorSyncRequest): Promise<ApiResponse<VisitorProfileDto>> {
    return apiFetch<VisitorProfileDto>('Visitor/sync', {
      method: 'POST',
      body: JSON.stringify({
        deviceId: payload.deviceId,
        displayName: payload.displayName ?? null,
        email: payload.email ?? null,
        preferredLang: payload.preferredLang ?? 'vi',
        deviceType: payload.deviceType ?? Platform.OS,
        deviceModel: payload.deviceModel ?? null,
        appVersion: payload.appVersion ?? null,
      }),
    });
  },

  async trackAction(payload: TrackActionRequest): Promise<ApiResponse<null>> {
    // BE CreateAnalyticsLogDto.MuseumId is required (FK). Skip invalid ids.
    const museumId = payload.museumId;
    if (museumId == null || museumId <= 0) {
      throw new ApiError('museumId is required for track-action', 400);
    }
    const actionType = (payload.actionType ?? 'Unknown').slice(0, 30);
    return apiFetch<null>('Visitor/track-action', {
      method: 'POST',
      body: JSON.stringify({
        museumId,
        exhibitId: payload.exhibitId ?? null,
        actionType,
        languageUsed: payload.languageUsed ?? null,
        deviceType: payload.deviceType ?? Platform.OS,
        searchQuery: payload.searchQuery ?? null,
      }),
    });
  },

  async getVisitorProfile(): Promise<ApiResponse<VisitorProfileDto>> {
    return apiFetch<VisitorProfileDto>('Visitor/profile');
  },

  async getBookmarks(): Promise<ApiResponse<BookmarkDto[]>> {
    return apiFetch<BookmarkDto[]>('Visitor/bookmarks');
  },

  async addBookmark(exhibitId: number): Promise<ApiResponse<null>> {
    return apiFetch<null>('Visitor/bookmarks', {
      method: 'POST',
      body: JSON.stringify({ exhibitId }),
    });
  },

  async removeBookmark(exhibitId: number): Promise<ApiResponse<null>> {
    return apiFetch<null>(`Visitor/bookmarks/${exhibitId}`, {
      method: 'DELETE',
    });
  },

  async getVisitedExhibits(): Promise<ApiResponse<VisitedExhibitDto[]>> {
    return apiFetch<VisitedExhibitDto[]>('Visitor/visited-exhibits');
  },

  async recordVisitedExhibit(
    exhibitId: number,
    timeSpentSeconds?: number,
  ): Promise<ApiResponse<null>> {
    return apiFetch<null>('Visitor/visited-exhibits', {
      method: 'POST',
      body: JSON.stringify({
        exhibitId,
        ...(timeSpentSeconds != null ? { timeSpentSeconds } : {}),
      }),
    });
  },

  /**
   * GET /Visitor/sync-check — Public.
   * Latest available offline package (no museumId path).
   * 404 = chưa có offline package (bình thường).
   */
  async syncCheck(): Promise<ApiResponse<SyncCheckDto>> {
    return apiFetch<SyncCheckDto>('Visitor/sync-check');
  },
};
