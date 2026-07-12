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

export interface ExhibitDto {
  id: number;
  museumId: number;
  categoryId?: number;
  exhibitCode?: string;
  qrCodeData?: string;
  qrCodeImageUrl?: string;
  thumbnailUrl?: string;
  arOverlayUrl?: string;
  arMarkerUrl?: string;
  status: string;
  publishedAt?: string;
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
  museumId?: number;
  hasUpdates?: boolean;
  lastSyncedAt?: string;
  exhibitCount?: number;
  arPackCount?: number;
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

export interface CreateOrderItem {
  ticketTypeId: number;
  quantity: number;
}

export interface CreateOrderRequest {
  museumId?: number | null;
  /** Ngày tham quan dạng ISO (YYYY-MM-DD) */
  visitDate?: string | null;
  items: CreateOrderItem[];
  fullName?: string;
  email?: string;
  phoneNumber?: string;
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
export interface CategoryDto {
  id: number;
  name: string;
  slug?: string;
  description?: string;
  parentId?: number | null;
  /** 'category' | 'theme' | 'tag' ... */
  type?: string;
  exhibitCount?: number;
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

export interface ContentPackageDto {
  id: number;
  museumId?: number;
  name: string;
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
  name: string;
  description?: string;
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
  phone?: string;
  email?: string;
  openHours?: string;
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

  /** Danh sách hiện vật của bảo tàng (thay cho dữ liệu mock). */
  async getContentExhibits(params?: {
    categoryId?: number;
    search?: string;
  }): Promise<ApiResponse<ExhibitDto[]>> {
    return apiFetch<ExhibitDto[]>(`Content/exhibits${buildQuery(params)}`);
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

  /** Danh mục / chủ đề / tag để lọc Explore. */
  async getCategories(): Promise<ApiResponse<CategoryDto[]>> {
    return apiFetch<CategoryDto[]>('Content/categories');
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

  // --- ADMIN ---
  /** Hồ sơ bảo tàng (single museum). */
  async getMuseumProfile(): Promise<ApiResponse<MuseumProfileDto>> {
    return apiFetch<MuseumProfileDto>('Admin/museum-profile');
  },

  // --- VISITOR ---
  async trackAction(payload: TrackActionRequest): Promise<ApiResponse<null>> {
    return apiFetch<null>('Visitor/track-action', {
      method: 'POST',
      body: JSON.stringify({
        museumId: payload.museumId ?? null,
        exhibitId: payload.exhibitId ?? null,
        actionType: payload.actionType,
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
    timeSpentSeconds: number,
  ): Promise<ApiResponse<null>> {
    return apiFetch<null>('Visitor/visited-exhibits', {
      method: 'POST',
      body: JSON.stringify({ exhibitId, timeSpentSeconds }),
    });
  },

  async syncCheck(museumId: number): Promise<ApiResponse<SyncCheckDto>> {
    return apiFetch<SyncCheckDto>(`Visitor/museums/${museumId}/sync-check`);
  },
};
