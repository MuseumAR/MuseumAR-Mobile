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
  currency?: string;
  museumId?: number;
  isActive?: boolean;
}

export interface CreateOrderRequest {
  /** Spec: POST /Ticketing/create-order body { ticketTypeId, quantity } */
  ticketTypeId: number;
  quantity: number;
}

export interface OrderTicketDto {
  id: number;
  ticketCode?: string;
  ticketTypeId?: number;
  ticketTypeName?: string;
  qrCodeUrl?: string;
  status?: string;
}

export interface CreateOrderResponse {
  orderId: number;
  orderCode?: string;
  totalAmount: number;
  status: string;
  /** URL cổng thanh toán (nếu backend trả về) */
  paymentUrl?: string;
  tickets?: OrderTicketDto[];
}

export interface MyTicketDto {
  id: number;
  orderId?: number;
  ticketCode?: string;
  ticketTypeId?: number;
  ticketTypeName?: string;
  museumId?: number;
  museumName?: string;
  price?: number;
  /** Trạng thái vé: Valid / Used / Expired / Cancelled ... */
  status?: string;
  visitDate?: string;
  qrCodeUrl?: string;
  purchasedAt?: string;
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

export interface ArAssetDto {
  id: number;
  exhibitId: number;
  /** 'model' | 'texture' | 'audio' | 'video' ... */
  assetType?: string;
  /** 'glb' | 'gltf' | 'usdz' ... */
  format?: string;
  url: string;
  fileSizeBytes?: number;
  scale?: number;
  markerUrl?: string;
  previewImageUrl?: string;
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

export interface MuseumMapDto {
  id: number;
  museumId?: number;
  name?: string;
  floor?: string;
  level?: number;
  imageUrl?: string;
  width?: number;
  height?: number;
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
  /** BE GET MuseumDto hiện chỉ trả các field cơ bản; các field dưới có thể null. */
  phone?: string;
  contactPhone?: string;
  email?: string;
  contactEmail?: string;
  openHours?: string;
  openingHours?: string;
  closedDay?: string;
  /** Giá vé cơ bản (VND) */
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
  async getMuseums(): Promise<ApiResponse<MuseumDto[]>> {
    return apiFetch<MuseumDto[]>('Admin/museums');
  },

  async getExhibits(museumId: number): Promise<ApiResponse<ExhibitDto[]>> {
    return apiFetch<ExhibitDto[]>(`Content/museums/${museumId}/exhibits`);
  },

  async getExhibitDetail(id: number): Promise<ApiResponse<ExhibitDto>> {
    return apiFetch<ExhibitDto>(`Content/exhibits/${id}`);
  },

  /**
   * BE GetExhibit không map ExhibitTranslations → Translations (AutoMapper gap).
   * Luôn lấy bản dịch qua endpoint này khi cần title/description/audio.
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

  /** Danh sách hiện vật — BE không nhận query filter; filter phía client. */
  async getContentExhibits(): Promise<ApiResponse<ExhibitDto[]>> {
    return apiFetch<ExhibitDto[]>('Content/exhibits');
  },

  /** Các asset AR 3D của một hiện vật. */
  async getExhibitArAssets(exhibitId: number): Promise<ApiResponse<ArAssetDto[]>> {
    return apiFetch<ArAssetDto[]>(`Content/exhibits/${exhibitId}/ar-assets`);
  },

  /** Gói nội dung offline / AR packs. */
  async getPackages(): Promise<ApiResponse<ContentPackageDto[]>> {
    return apiFetch<ContentPackageDto[]>('Content/packages');
  },

  /** Bản đồ bảo tàng. */
  async getMaps(): Promise<ApiResponse<MuseumMapDto[]>> {
    return apiFetch<MuseumMapDto[]>('Content/maps');
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
    return apiFetch<CreateOrderResponse>('Ticketing/create-order', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getMyTickets(): Promise<ApiResponse<MyTicketDto[]>> {
    return apiFetch<MyTicketDto[]>('Ticketing/my-tickets');
  },

  /** Dev/mock: xác nhận thanh toán (GET /Ticketing/mock-confirm?orderCode=). */
  async mockConfirmPayment(orderCode: string): Promise<ApiResponse<null>> {
    return apiFetch<null>(`Ticketing/mock-confirm${buildQuery({ orderCode })}`);
  },

  // --- ADMIN ---
  /** Hồ sơ bảo tàng (single museum). */
  async getMuseumProfile(): Promise<ApiResponse<MuseumProfileDto>> {
    return apiFetch<MuseumProfileDto>('Admin/museum-profile');
  },

  // --- VISITOR ---
  async trackAction(payload: TrackActionRequest): Promise<ApiResponse<null>> {
    // BE CreateAnalyticsLogDto.MuseumId là int bắt buộc (FK). Gửi 0/null → 500.
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
   * Không nhận query; museum lấy từ MuseumResolver trên BE.
   * 404 = chưa có offline package (bình thường).
   */
  async syncCheck(): Promise<ApiResponse<SyncCheckDto>> {
    return apiFetch<SyncCheckDto>('Visitor/sync-check');
  },
};
