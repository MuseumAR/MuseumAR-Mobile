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

// Hàm fetch API dùng chung hỗ trợ tự động đính kèm token JWT
async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
  const token = await getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}/${endpoint}`, {
    ...options,
    headers,
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.message || `Lỗi API (Mã: ${response.status})`);
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
};
