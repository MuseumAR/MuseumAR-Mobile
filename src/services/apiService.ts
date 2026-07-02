import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/apiConfig';
import { getToken } from './tokenStorage';

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

// Hàm fetch API dùng chung hỗ trợ tự động đính kèm token JWT
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
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
