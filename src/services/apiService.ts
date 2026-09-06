import { Platform } from 'react-native';
import { API_BASE_URL } from '../config/apiConfig';
import { getRefreshToken, getToken, saveTokens } from './tokenStorage';
import { getCachedMuseumId } from './museumContext';
import {
  isCacheableEndpoint,
  readCachedResponseFlexible,
  readPackIndex,
  saveCachedResponse,
} from './offlineCache';
import { canUseOfflineContent, isTicketingEndpoint } from './offlineMode';
import { pickDisplayImageUrl, rewriteRemoteImageUrl } from '../utils/mobileImageUrl';
import { routeFromGraph } from '../utils/offlineNavigation';

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
  eraEn?: string;
  historicalEvent?: string;
  historicalEventEn?: string;
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
  mapId?: number | null;
  floorNumber?: number | null;
  roomId?: number | null;
  roomCode?: string | null;
  roomName?: string | null;
  exhibitMetadata?: ExhibitMetadataDto | null;
  translations: ExhibitTranslationDto[];
}

/** Room / map fields from BE ExhibitDto (PascalCase-safe). */
export function attachExhibitRoomFields(
  raw: Partial<ExhibitDto> & Record<string, unknown>,
  exhibit: ExhibitDto,
): ExhibitDto {
  const roomIdRaw = raw.roomId ?? raw.RoomId;
  const floorRaw = raw.floorNumber ?? raw.FloorNumber;
  const mapRaw = raw.mapId ?? raw.MapId;
  return {
    ...exhibit,
    mapId: mapRaw != null ? Number(mapRaw) || null : exhibit.mapId ?? null,
    floorNumber:
      floorRaw != null ? Number(floorRaw) || null : exhibit.floorNumber ?? null,
    roomId: roomIdRaw != null ? Number(roomIdRaw) || null : exhibit.roomId ?? null,
    roomCode:
      (raw.roomCode ?? raw.RoomCode ?? exhibit.roomCode ?? null) as string | null,
    roomName:
      (raw.roomName ?? raw.RoomName ?? exhibit.roomName ?? null) as string | null,
  };
}

/** GET /Content/exhibits/scan-qr result (newest WebBE). */
export interface ExhibitScanArAssetDto {
  assetId?: number;
  AssetId?: number;
  assetType?: string;
  AssetType?: string;
  assetUrl?: string;
  AssetUrl?: string;
  fileSizeBytes?: number | null;
  description?: string | null;
}

export interface ExhibitScanResultDto {
  exhibitId: number;
  exhibitCode: string;
  qrcodeData: string;
  title: string;
  description: string;
  audioUrl?: string | null;
  languageCode: string;
  categoryName?: string | null;
  roomId?: number | null;
  roomCode?: string | null;
  roomName?: string | null;
  floorNumber?: number | null;
  thumbnailUrl?: string | null;
  aroverlayUrl?: string | null;
  armarkerUrl?: string | null;
  images: string[];
  arAssets: ExhibitScanArAssetDto[];
}

export interface TrackActionRequest {
  museumId?: number | null;
  exhibitId?: number | null;
  actionType: string;
  languageUsed?: string | null;
  deviceType?: string | null;
  searchQuery?: string | null;
  listeningDuration?: number | null;
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
  nameEn?: string | null;
  description?: string;
  descriptionEn?: string | null;
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
  /** POST /Ticketing/create-order body { ticketTypeId, quantity } */
  ticketTypeId: number;
  quantity: number;
}

/**
 * POST /Ticketing/create-order → PayOS payment payload
 * (PaymentService: CheckoutUrl, QrCode, OrderCode, Amount).
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

/** GET /Ticketing/my-tickets — Paid tickets only (current BE). */
export interface MyTicketDto {
  id: number;
  ticketCode?: string;
  ticketTypeName?: string;
  purchaseDate?: string;
  validDate?: string | null;
  status?: string;
  /** Optional / legacy aliases used in older UI */
  orderId?: number;
  ticketTypeId?: number;
  museumId?: number;
  museumName?: string;
  price?: number;
  visitDate?: string;
  qrCodeUrl?: string;
  purchasedAt?: string;
  orderCode?: string;
}

/** GET /Ticketing/pending-order — active unpaid order (&lt; 15 min). */
export interface PendingOrderDto {
  orderCode: string;
  ticketTypeId?: number;
  ticketTypeName?: string;
  quantity?: number;
  totalAmount?: number;
  checkoutUrl?: string | null;
  qrCode?: string | null;
  createdAt?: string;
  expiresAt?: string;
  remainingSeconds?: number;
}

/** GET /Ticketing/my-tickets/{id} */
export interface TicketDetailDto {
  id: number;
  ticketCode: string;
  /** Unit price snapshot from BE (same as ticketType.price). */
  price?: number;
  status: string;
  purchaseDate: string;
  validDate?: string | null;
  ticketType: {
    id: number;
    name: string;
    price: number;
    description?: string | null;
  };
  museum: {
    id: number;
    name: string;
    address?: string | null;
  };
  exhibition?: {
    id: number;
    name: string;
  } | null;
  order: {
    orderCode: string;
    totalAmount: number;
    currency: string;
    paymentStatus: string;
    paymentMethod?: string | null;
    paidAt?: string | null;
  };
  qrCodeData?: string | null;
  qrCodeImageUrl?: string | null;
}

/**
 * Resolve payment method label from BE (string or nested Name/DisplayName).
 * App checkout is PayOS only — map legacy VNPay labels and empty values to PayOS.
 */
export function normalizePaymentMethodName(raw?: unknown): string {
  let name = '';
  if (typeof raw === 'string') {
    name = raw.trim();
  } else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    const nested = o.name ?? o.Name ?? o.displayName ?? o.DisplayName;
    if (typeof nested === 'string') name = nested.trim();
  }
  if (!name || /vnpay/i.test(name)) return 'PayOS';
  return name;
}

/**
 * GET /Payment/check-status/{orderCode}
 * BE: { isPaid, isCancelled, status }
 * `valid` = still pending (can resume PayOS).
 */
export interface PaymentCheckDto {
  isPaid?: boolean;
  isCancelled?: boolean;
  status?: string;
  orderCode?: string;
  /** true when payment is still pending (not paid, not cancelled) */
  valid?: boolean;
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
export interface ThemeTranslationDto {
  themeId?: number;
  languageCode: string;
  themeName: string;
  description?: string | null;
}

export interface ThemeDto {
  id: number;
  museumId?: number;
  themeName?: string;
  name?: string;
  description?: string;
  translations?: ThemeTranslationDto[];
}

/** GET /Content/exhibitions/{id}/translations */
export interface ExhibitionTranslationDto {
  exhibitionId?: number;
  languageCode: string;
  name: string;
  description?: string | null;
}

/** GET /Content/exhibitions?lang= */
export interface ExhibitionDto {
  id: number;
  museumId: number;
  themeId?: number | null;
  name?: string | null;
  nameEn?: string | null;
  description?: string | null;
  descriptionEn?: string | null;
  thumbnailUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  status?: string;
  translations?: ExhibitionTranslationDto[];
}

export function normalizeExhibitionDto(
  raw: Partial<ExhibitionDto> & Record<string, unknown>,
): ExhibitionDto {
  const translationsRaw = Array.isArray(raw.translations)
    ? raw.translations
    : Array.isArray(raw.Translations)
      ? (raw.Translations as unknown[])
      : [];
  const exhibitionId = Number(raw.id ?? raw.Id) || 0;
  const remoteThumb = String(raw.thumbnailUrl ?? raw.ThumbnailUrl ?? '').trim();
  return {
    id: exhibitionId,
    museumId: Number(raw.museumId ?? raw.MuseumId) || 0,
    themeId:
      raw.themeId != null || raw.ThemeId != null
        ? Number(raw.themeId ?? raw.ThemeId)
        : null,
    name: String(raw.name ?? raw.Name ?? '').trim() || null,
    nameEn: String(raw.nameEn ?? raw.NameEn ?? '').trim() || null,
    description: String(raw.description ?? raw.Description ?? '').trim() || null,
    descriptionEn:
      String(raw.descriptionEn ?? raw.DescriptionEn ?? '').trim() || null,
    thumbnailUrl:
      pickDisplayImageUrl(remoteThumb, `exhibition:${exhibitionId}`) ??
      null,
    startDate: (raw.startDate ?? raw.StartDate) as string | null | undefined ?? null,
    endDate: (raw.endDate ?? raw.EndDate) as string | null | undefined ?? null,
    status: String(raw.status ?? raw.Status ?? 'Active'),
    translations: translationsRaw.map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        exhibitionId: Number(o.exhibitionId ?? o.ExhibitionId) || undefined,
        languageCode: String(o.languageCode ?? o.LanguageCode ?? '').trim(),
        name: String(o.name ?? o.Name ?? '').trim(),
        description:
          String(o.description ?? o.Description ?? '').trim() || null,
      };
    }),
  };
}

/** GET /Content/tags */
export interface TagTranslationDto {
  tagId?: number;
  languageCode: string;
  tagName: string;
}

export interface TagDto {
  id: number;
  museumId?: number;
  tagGroupId?: number;
  tagName?: string;
  name?: string;
  description?: string;
  translations?: TagTranslationDto[];
}

/** GET /Content/tag-groups */
export interface TagGroupDto {
  id: number;
  groupName?: string;
  name?: string;
  sortOrder?: number;
}

export type TaxonomyKind = 'category' | 'theme' | 'tagGroup' | 'tag';

/** Chip lọc Explore (category / theme / tag group / tag). */
export interface TaxonomyChip {
  key: string;
  id: number;
  name: string;
  kind: TaxonomyKind;
  /** Present on tag chips: parent group for drill-down filter. */
  tagGroupId?: number;
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
  const url =
    rewriteRemoteImageUrl(String(raw.url ?? raw.assetUrl ?? '').trim(), {
      preserveAlpha: true,
    }) ?? '';
  const formatFromUrl = (() => {
    const m = url.match(/\.([a-z0-9]+)(?:\?|$)/i);
    return m?.[1]?.toLowerCase();
  })();

  return {
    id: Number(raw.id) || 0,
    exhibitId: Number(raw.exhibitId) || 0,
    assetType: raw.assetType,
    assetUrl: url || undefined,
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
  packageSizeBytes?: number;
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

function normalizePackageDto(
  raw: Partial<ContentPackageDto> & Record<string, unknown>,
): ContentPackageDto {
  const sizeBytes =
    Number(
      raw.sizeBytes ??
        raw.SizeBytes ??
        raw.packageSizeBytes ??
        raw.PackageSizeBytes,
    ) || undefined;
  return {
    id: Number(raw.id ?? raw.Id),
    museumId: Number(raw.museumId ?? raw.MuseumId) || undefined,
    versionId: Number(raw.versionId ?? raw.VersionId) || undefined,
    packageUrl:
      String(raw.packageUrl ?? raw.PackageUrl ?? raw.downloadUrl ?? '').trim() ||
      undefined,
    checksum: String(raw.checksum ?? raw.Checksum ?? '').trim() || undefined,
    status: String(raw.status ?? raw.Status ?? '').trim() || undefined,
    arassetCount:
      Number(raw.arassetCount ?? raw.ArAssetCount ?? raw.ARAssetCount) ||
      undefined,
    createdAt: String(raw.createdAt ?? raw.CreatedAt ?? '') || undefined,
    packageSizeBytes: sizeBytes,
    sizeBytes,
    exhibitCount: Number(raw.exhibitCount ?? raw.ExhibitCount) || undefined,
    name: String(raw.name ?? raw.Name ?? '').trim() || undefined,
    description:
      String(raw.description ?? raw.Description ?? '').trim() || undefined,
    category: String(raw.category ?? raw.Category ?? '').trim() || undefined,
    downloadUrl:
      String(
        raw.downloadUrl ?? raw.DownloadUrl ?? raw.packageUrl ?? raw.PackageUrl ?? '',
      ).trim() || undefined,
    version: String(raw.version ?? raw.Version ?? '').trim() || undefined,
    thumbnailUrl:
      String(raw.thumbnailUrl ?? raw.ThumbnailUrl ?? '').trim() || undefined,
  };
}

/**
 * GET /Content/maps → BE MuseumMapDto:
 * { id, museumId, floorNumber, mapName, mapImageUrl, mapType }
 */
export interface MuseumMapDto {
  id: number;
  museumId?: number;
  /** BE field */
  mapImageUrl?: string;
  /** Normalized alias of mapImageUrl for UI */
  imageUrl?: string;
  /** BE field — Indoor / Outdoor / … */
  mapType?: string;
  /** BE MuseumMap.MapName */
  mapName?: string;
  /** Display label: mapName, else "Tầng {n}" */
  label?: string;
  /** BE MuseumMap.FloorNumber */
  floorNumber?: number;
}

/** Pull a leading/embedded floor number out of a label such as "Tầng 2" / "Floor 3". */
function parseFloorNumber(label: string): number | undefined {
  const match = label.match(/\d+/);
  if (!match) return undefined;
  const n = Number(match[0]);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Normalize BE museum map payload → mobile shape. */
export function normalizeMuseumMap(
  raw: Partial<MuseumMapDto> & Record<string, unknown>,
): MuseumMapDto {
  const id = Number(raw.id ?? raw.Id) || 0;
  const remoteImage = String(
    raw.imageUrl ?? raw.mapImageUrl ?? raw.MapImageUrl ?? '',
  ).trim();
  const mapType = String(raw.mapType ?? raw.MapType ?? '').trim();
  const mapName = String(raw.mapName ?? raw.MapName ?? '').trim();
  const floorRaw = Number(raw.floorNumber ?? raw.FloorNumber);
  const floorNumber =
    Number.isFinite(floorRaw) && floorRaw > 0
      ? floorRaw
      : parseFloorNumber(mapName) ?? parseFloorNumber(mapType);
  const imageUrl =
    pickDisplayImageUrl(remoteImage, `map:${id}`) ?? remoteImage;
  const label =
    mapName ||
    (floorNumber != null ? `Tầng ${floorNumber}` : mapType && mapType.toLowerCase() !== 'floor'
      ? mapType
      : `Bản đồ ${id}`);

  return {
    id,
    museumId: Number(raw.museumId ?? raw.MuseumId) || undefined,
    mapImageUrl: imageUrl || undefined,
    imageUrl: imageUrl || undefined,
    mapType: mapType || undefined,
    mapName: mapName || undefined,
    label,
    floorNumber,
  };
}

/** BE TourRouteStopDto — ordered exhibit stop with room/floor. */
export interface TourRouteStopDto {
  exhibitId: number;
  exhibitName?: string | null;
  exhibitCode?: string | null;
  stopOrder: number;
  estimatedMinutes?: number | null;
  mapId?: number | null;
  floorNumber?: number | null;
  roomId?: number | null;
  roomCode?: string | null;
  roomName?: string | null;
}

/** @deprecated Prefer TourRouteStopDto / stops from BE. */
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
  status?: string;
  translations?: TourRouteTranslationDto[];
  /** Ordered stops from BE TourRouteExhibits */
  stops?: TourRouteStopDto[];
  /** @deprecated legacy alias — prefer stops */
  points?: RoutePointDto[];
}

export interface TourRouteTranslationDto {
  languageCode: string;
  routeName: string;
  description?: string | null;
}

/** BE RoomDto — room on a floor map (no X/Y; layout is client-side). */
export interface RoomDto {
  id: number;
  museumId: number;
  mapId?: number | null;
  roomCode: string;
  roomName: string;
  floorNumber: number;
  description?: string | null;
}

/** BE NavigationRouteResponseDto — GET Navigation/route */
export interface NavigationInstructionDto {
  stepIndex: number;
  instruction: string;
  action: string;
  distance: number;
  floorNumber: number;
  waypointId: string;
}

export interface NavigationWaypointDto {
  id: string;
  museumId: number;
  mapId: number;
  floorNumber: number;
  locationX: number;
  locationY: number;
  waypointType: string;
  roomId: number | null;
  code: string | null;
  name: string | null;
}

export interface NavigationEdgeDto {
  id: number;
  museumId: number;
  fromWaypointId: string;
  toWaypointId: string;
  distance: number;
  edgeType: string;
  isBidirectional: boolean;
}

/** BE NavigationGraphDto — GET Navigation/museum/{id}/graph */
export interface NavigationGraphDto {
  museumId: number;
  waypoints: NavigationWaypointDto[];
  edges: NavigationEdgeDto[];
}

export function normalizeNavigationWaypoint(
  raw: Partial<NavigationWaypointDto> & Record<string, unknown>,
): NavigationWaypointDto {
  return {
    id: String(raw.id ?? raw.Id ?? ''),
    museumId: Number(raw.museumId ?? raw.MuseumId) || 0,
    mapId: Number(raw.mapId ?? raw.MapId) || 0,
    floorNumber: Number(raw.floorNumber ?? raw.FloorNumber) || 1,
    locationX: Number(raw.locationX ?? raw.LocationX ?? raw.x ?? raw.X) || 0,
    locationY: Number(raw.locationY ?? raw.LocationY ?? raw.y ?? raw.Y) || 0,
    waypointType: String(
      raw.waypointType ?? raw.WaypointType ?? raw.type ?? raw.Type ?? 'HALLWAY',
    ),
    roomId:
      raw.roomId != null || raw.RoomId != null
        ? Number(raw.roomId ?? raw.RoomId) || null
        : null,
    code: (raw.code ?? raw.Code ?? null) as string | null,
    name: (raw.name ?? raw.Name ?? raw.label ?? raw.Label ?? null) as
      | string
      | null,
  };
}

export function normalizeNavigationEdge(
  raw: Partial<NavigationEdgeDto> & Record<string, unknown>,
): NavigationEdgeDto {
  return {
    id: Number(raw.id ?? raw.Id) || 0,
    museumId: Number(raw.museumId ?? raw.MuseumId) || 0,
    fromWaypointId: String(raw.fromWaypointId ?? raw.FromWaypointId ?? ''),
    toWaypointId: String(raw.toWaypointId ?? raw.ToWaypointId ?? ''),
    distance: Number(raw.distance ?? raw.Distance) || 0,
    edgeType: String(raw.edgeType ?? raw.EdgeType ?? 'WALK'),
    isBidirectional: Boolean(
      raw.isBidirectional ?? raw.IsBidirectional ?? true,
    ),
  };
}

export function normalizeNavigationGraph(
  raw: Partial<NavigationGraphDto> & Record<string, unknown>,
): NavigationGraphDto {
  const waypointsRaw = Array.isArray(raw.waypoints)
    ? raw.waypoints
    : Array.isArray(raw.Waypoints)
      ? (raw.Waypoints as unknown[])
      : [];
  const edgesRaw = Array.isArray(raw.edges)
    ? raw.edges
    : Array.isArray(raw.Edges)
      ? (raw.Edges as unknown[])
      : [];
  return {
    museumId: Number(raw.museumId ?? raw.MuseumId) || 0,
    waypoints: waypointsRaw.map((item) =>
      normalizeNavigationWaypoint(
        (item ?? {}) as Partial<NavigationWaypointDto> & Record<string, unknown>,
      ),
    ),
    edges: edgesRaw.map((item) =>
      normalizeNavigationEdge(
        (item ?? {}) as Partial<NavigationEdgeDto> & Record<string, unknown>,
      ),
    ),
  };
}

export interface NavigationRouteResponseDto {
  fromRoomId: number;
  fromRoomName: string;
  toRoomId: number;
  toRoomName: string;
  totalDistance: number;
  pathWaypoints: NavigationWaypointDto[];
  instructions: NavigationInstructionDto[];
}

export function normalizeNavigationRoute(
  raw: Partial<NavigationRouteResponseDto> & Record<string, unknown>,
): NavigationRouteResponseDto {
  const instructionsRaw = Array.isArray(raw.instructions)
    ? raw.instructions
    : Array.isArray(raw.Instructions)
      ? (raw.Instructions as unknown[])
      : [];
  const pathRaw = Array.isArray(raw.pathWaypoints)
    ? raw.pathWaypoints
    : Array.isArray(raw.PathWaypoints)
      ? (raw.PathWaypoints as unknown[])
      : [];
  return {
    fromRoomId: Number(raw.fromRoomId ?? raw.FromRoomId) || 0,
    fromRoomName: String(raw.fromRoomName ?? raw.FromRoomName ?? ''),
    toRoomId: Number(raw.toRoomId ?? raw.ToRoomId) || 0,
    toRoomName: String(raw.toRoomName ?? raw.ToRoomName ?? ''),
    totalDistance: Number(raw.totalDistance ?? raw.TotalDistance) || 0,
    pathWaypoints: pathRaw.map((item) =>
      normalizeNavigationWaypoint(
        (item ?? {}) as Partial<NavigationWaypointDto> & Record<string, unknown>,
      ),
    ),
    instructions: instructionsRaw.map((item, i) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        stepIndex: Number(o.stepIndex ?? o.StepIndex ?? i) || i,
        instruction: String(o.instruction ?? o.Instruction ?? ''),
        action: String(o.action ?? o.Action ?? 'STRAIGHT'),
        distance: Number(o.distance ?? o.Distance) || 0,
        floorNumber: Number(o.floorNumber ?? o.FloorNumber) || 1,
        waypointId: String(o.waypointId ?? o.WaypointId ?? ''),
      };
    }),
  };
}

export function normalizeTourRouteStop(
  raw: Partial<TourRouteStopDto> & Record<string, unknown>,
): TourRouteStopDto {
  const exhibitId = Number(raw.exhibitId ?? raw.ExhibitId) || 0;
  const mapIdRaw = raw.mapId ?? raw.MapId;
  const floorRaw = raw.floorNumber ?? raw.FloorNumber;
  const roomIdRaw = raw.roomId ?? raw.RoomId;
  const minutesRaw = raw.estimatedMinutes ?? raw.EstimatedMinutes;
  return {
    exhibitId,
    exhibitName:
      (raw.exhibitName ?? raw.ExhibitName ?? null) as string | null,
    exhibitCode:
      (raw.exhibitCode ?? raw.ExhibitCode ?? null) as string | null,
    stopOrder: Number(raw.stopOrder ?? raw.StopOrder ?? raw.order) || 0,
    estimatedMinutes: minutesRaw != null ? Number(minutesRaw) : null,
    mapId: mapIdRaw != null ? Number(mapIdRaw) : null,
    floorNumber: floorRaw != null ? Number(floorRaw) : null,
    roomId: roomIdRaw != null ? Number(roomIdRaw) : null,
    roomCode: (raw.roomCode ?? raw.RoomCode ?? null) as string | null,
    roomName: (raw.roomName ?? raw.RoomName ?? null) as string | null,
  };
}

export function normalizeRoomDto(
  raw: Partial<RoomDto> & Record<string, unknown>,
): RoomDto {
  return {
    id: Number(raw.id) || 0,
    museumId: Number(raw.museumId) || 0,
    mapId: raw.mapId != null ? Number(raw.mapId) : null,
    roomCode: String(raw.roomCode ?? '').trim() || `R${raw.id ?? 0}`,
    roomName: String(raw.roomName ?? '').trim() || String(raw.roomCode ?? 'Phòng'),
    floorNumber: Number(raw.floorNumber ?? raw.FloorNumber) || 1,
    description: (raw.description as string | null | undefined) ?? null,
  };
}

// --- ADMIN ---
export interface MuseumProfileDto {
  id: number;
  name: string;
  description?: string;
  address?: string;
  addressEn?: string;
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
  openingHoursEn?: string;
  /** Alias used by older clients */
  openHours?: string;
  closedDay?: string;
  translations?: Array<{
    languageCode?: string;
    name?: string;
    description?: string;
    address?: string;
    openingHours?: string;
  }>;
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
  const row = raw as Partial<MuseumProfileDto> & Record<string, unknown>;
  const id = Number(row.id ?? row.Id);
  if (!Number.isFinite(id) || id <= 0) return null;

  const openingHours = String(
    row.openingHours ?? row.OpeningHours ?? row.openHours ?? row.OpenHours ?? '',
  ).trim();
  const openingHoursEn = String(
    row.openingHoursEn ?? row.OpeningHoursEn ?? '',
  ).trim();
  const translationsRaw = Array.isArray(row.translations)
    ? row.translations
    : Array.isArray(row.Translations)
      ? (row.Translations as unknown[])
      : [];
  const contactPhone = String(row.contactPhone ?? row.ContactPhone ?? row.phone ?? row.Phone ?? '').trim();
  const contactEmail = String(row.contactEmail ?? row.ContactEmail ?? row.email ?? row.Email ?? '').trim();
  const remoteThumb = String(row.thumbnailUrl ?? row.ThumbnailUrl ?? row.logoUrl ?? '').trim();
  const thumbnailUrl =
    pickDisplayImageUrl(remoteThumb, `museum:${id}`) ?? remoteThumb;

  return {
    id,
    name: String(row.name ?? row.Name ?? '').trim(),
    description: String(row.description ?? row.Description ?? '').trim() || undefined,
    address: String(row.address ?? row.Address ?? '').trim() || undefined,
    addressEn: String(row.addressEn ?? row.AddressEn ?? '').trim() || undefined,
    city: String(row.city ?? row.City ?? '').trim() || undefined,
    province: String(row.province ?? row.Province ?? '').trim() || undefined,
    country: String(row.country ?? row.Country ?? '').trim() || undefined,
    contactPhone: contactPhone || undefined,
    phone: contactPhone || undefined,
    contactEmail: contactEmail || undefined,
    email: contactEmail || undefined,
    openingHours: openingHours || undefined,
    openingHoursEn: openingHoursEn || undefined,
    openHours: openingHours || openingHoursEn || undefined,
    translations: translationsRaw.map((item) => {
      const o = (item ?? {}) as Record<string, unknown>;
      return {
        languageCode: String(o.languageCode ?? o.LanguageCode ?? '').trim(),
        name: String(o.name ?? o.Name ?? '').trim() || undefined,
        description: String(o.description ?? o.Description ?? '').trim() || undefined,
        address: String(o.address ?? o.Address ?? '').trim() || undefined,
        openingHours: String(o.openingHours ?? o.OpeningHours ?? '').trim() || undefined,
      };
    }),
    closedDay: String(row.closedDay ?? row.ClosedDay ?? '').trim() || undefined,
    ticketPrice:
      row.ticketPrice != null && Number.isFinite(Number(row.ticketPrice))
        ? Number(row.ticketPrice)
        : undefined,
    foundedYear: row.foundedYear ?? row.FoundedYear,
    exhibitCount:
      row.exhibitCount != null && Number.isFinite(Number(row.exhibitCount))
        ? Number(row.exhibitCount)
        : undefined,
    thumbnailUrl: thumbnailUrl || undefined,
    logoUrl: thumbnailUrl || undefined,
    status: String(row.status ?? row.Status ?? '').trim() || undefined,
    latitude: (() => {
      const n = Number(row.latitude ?? row.Latitude);
      return Number.isFinite(n) ? n : undefined;
    })(),
    longitude: (() => {
      const n = Number(row.longitude ?? row.Longitude);
      return Number.isFinite(n) ? n : undefined;
    })(),
    website: String(row.website ?? row.Website ?? '').trim() || undefined,
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
    if (isTicketingEndpoint(endpoint)) {
      throw new TypeError('Network request failed');
    }
    if (
      isCacheableEndpoint(endpoint, options.method as string | undefined) &&
      (await canUseOfflineContent())
    ) {
      const cached = await readCachedResponseFlexible<ApiResponse<T>>(endpoint);
      if (cached) return cached;
    }
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

  if (isCacheableEndpoint(endpoint, options.method as string | undefined)) {
    void saveCachedResponse(endpoint, json);
  }
  return json as ApiResponse<T>;
}

async function resolveOfflineMuseumId(): Promise<number | null> {
  const cached = getCachedMuseumId();
  if (cached != null && cached > 0) return cached;
  const packs = await readPackIndex();
  for (const rec of Object.values(packs)) {
    if (rec.museumId != null && rec.museumId > 0) return rec.museumId;
  }
  const profile = await readCachedResponseFlexible<ApiResponse<MuseumProfileDto>>(
    'Admin/museum-profile',
  );
  const id = Number(profile?.data?.id);
  return Number.isFinite(id) && id > 0 ? id : null;
}

async function tryOfflineNavigationRoute(
  fromRoomId: number,
  toRoomId: number,
  lang?: string,
): Promise<ApiResponse<NavigationRouteResponseDto> | null> {
  if (!(await canUseOfflineContent())) return null;
  const museumId = await resolveOfflineMuseumId();
  if (museumId == null) return null;

  const graphRes = await readCachedResponseFlexible<
    ApiResponse<NavigationGraphDto & Record<string, unknown>>
  >(`Navigation/museum/${museumId}/graph`);
  if (!graphRes?.data) return null;
  const graph = normalizeNavigationGraph(graphRes.data);

  const roomsRes =
    (await readCachedResponseFlexible<
      ApiResponse<Array<Partial<RoomDto> & Record<string, unknown>>>
    >(
      `Content/rooms/museum/${museumId}${lang ? `?lang=${lang}` : ''}`,
    )) ??
    (await readCachedResponseFlexible<
      ApiResponse<Array<Partial<RoomDto> & Record<string, unknown>>>
    >(`Content/rooms/museum/${museumId}`));
  const rooms = (roomsRes?.data ?? []).map((item) =>
    normalizeRoomDto(item as Partial<RoomDto> & Record<string, unknown>),
  );

  return {
    statusCode: 200,
    status: 'Success',
    message: '',
    data: routeFromGraph(graph, rooms, fromRoomId, toRoomId, lang),
  };
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
  async getMuseums(lang?: string): Promise<ApiResponse<MuseumDto[]>> {
    const profile = await apiService.getMuseumProfile(lang);
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
  async getExhibits(museumId: number, lang?: string): Promise<ApiResponse<ExhibitDto[]>> {
    const response = await apiService.getContentExhibits(lang);
    const filtered = (response.data ?? []).filter((e) => e.museumId === museumId);
    return { ...response, data: filtered };
  },

  async getExhibitDetail(id: number, lang?: string): Promise<ApiResponse<ExhibitDto>> {
    const response = await apiFetch<ExhibitDto & Record<string, unknown>>(
      `Content/exhibits/${id}${buildQuery(lang ? { lang } : undefined)}`,
    );
    if (!response.data) return response as ApiResponse<ExhibitDto>;
    return {
      ...response,
      data: attachExhibitRoomFields(response.data, response.data),
    };
  },

  /**
   * Resolve exhibit from printed QR payload.
   * GET /Content/exhibits/scan-qr?qrData=&lang=&visitorId=
   * BE matches: exact QrcodeData | ExhibitCode | numeric Id.
   */
  async scanExhibitQr(options: {
    qrData: string;
    lang?: string;
    visitorId?: number | null;
  }): Promise<ApiResponse<ExhibitScanResultDto>> {
    const response = await apiFetch<ExhibitScanResultDto & Record<string, unknown>>(
      `Content/exhibits/scan-qr${buildQuery({
        qrData: options.qrData.trim(),
        lang: options.lang ?? 'vi',
        visitorId:
          options.visitorId != null && options.visitorId > 0
            ? options.visitorId
            : undefined,
      })}`,
    );
    const raw = response.data;
    if (!raw) return { ...response, data: undefined };

    const exhibitId = Number(raw.exhibitId ?? raw.ExhibitId ?? 0);
    if (!Number.isFinite(exhibitId) || exhibitId <= 0) {
      return { ...response, data: undefined };
    }

    return {
      ...response,
      data: {
        exhibitId,
        exhibitCode: String(raw.exhibitCode ?? raw.ExhibitCode ?? ''),
        qrcodeData: String(raw.qrcodeData ?? raw.QrcodeData ?? options.qrData),
        title: String(raw.title ?? raw.Title ?? ''),
        description: String(raw.description ?? raw.Description ?? ''),
        audioUrl: (raw.audioUrl ?? raw.AudioUrl ?? null) as string | null,
        languageCode: String(raw.languageCode ?? raw.LanguageCode ?? 'vi'),
        categoryName: (raw.categoryName ?? raw.CategoryName ?? null) as string | null,
        roomId: (() => {
          const n = Number(raw.roomId ?? raw.RoomId);
          return Number.isFinite(n) && n > 0 ? n : null;
        })(),
        roomCode: (raw.roomCode ?? raw.RoomCode ?? null) as string | null,
        roomName: (raw.roomName ?? raw.RoomName ?? null) as string | null,
        floorNumber: (() => {
          const n = Number(raw.floorNumber ?? raw.FloorNumber);
          return Number.isFinite(n) && n > 0 ? n : null;
        })(),
        thumbnailUrl: pickDisplayImageUrl(
          String(raw.thumbnailUrl ?? raw.ThumbnailUrl ?? ''),
          `thumb:${exhibitId}`,
        ) ?? null,
        aroverlayUrl: rewriteRemoteImageUrl(
          String(raw.aroverlayUrl ?? raw.AroverlayUrl ?? ''),
          { preserveAlpha: true },
        ) ?? null,
        armarkerUrl: rewriteRemoteImageUrl(
          String(raw.armarkerUrl ?? raw.ArmarkerUrl ?? ''),
        ) ?? null,
        images: Array.isArray(raw.images ?? raw.Images)
          ? ((raw.images ?? raw.Images) as string[])
              .map((item) => rewriteRemoteImageUrl(item))
              .filter((item): item is string => Boolean(item))
          : [],
        arAssets: Array.isArray(raw.arAssets ?? raw.ArAssets)
          ? ((raw.arAssets ?? raw.ArAssets) as ExhibitScanResultDto['arAssets'])
          : [],
      },
    };
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
  async getContentExhibits(lang?: string): Promise<ApiResponse<ExhibitDto[]>> {
    return apiFetch<ExhibitDto[]>(
      `Content/exhibits${buildQuery(lang ? { lang } : undefined)}`,
    );
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
    const response = await apiFetch<ContentPackageDto[]>('Content/packages');
    return {
      ...response,
      data: (response.data ?? []).map((item) =>
        normalizePackageDto(item as Partial<ContentPackageDto> & Record<string, unknown>),
      ),
    };
  },

  /** Bản đồ bảo tàng. */
  async getMaps(): Promise<ApiResponse<MuseumMapDto[]>> {
    const response = await apiFetch<MuseumMapDto[]>('Content/maps');
    return {
      ...response,
      data: (response.data ?? []).map((item) => normalizeMuseumMap(item)),
    };
  },

  /** Tour / lộ trình tham quan (kèm stops nếu BE include). */
  async getRoutes(): Promise<ApiResponse<TourRouteDto[]>> {
    return apiFetch<TourRouteDto[]>('Content/routes');
  },

  /** Chi tiết một lộ trình + stops có thứ tự. */
  async getRouteById(id: number): Promise<ApiResponse<TourRouteDto>> {
    return apiFetch<TourRouteDto>(`Content/routes/${id}`);
  },

  /** Phòng theo museum — GET Content/rooms/museum/{museumId}?lang=. */
  async getRoomsByMuseum(
    museumId: number,
    lang?: string,
  ): Promise<ApiResponse<RoomDto[]>> {
    const response = await apiFetch<RoomDto[]>(
      `Content/rooms/museum/${museumId}${buildQuery(lang ? { lang } : undefined)}`,
    );
    return {
      ...response,
      data: (response.data ?? []).map((item) =>
        normalizeRoomDto(item as Partial<RoomDto> & Record<string, unknown>),
      ),
    };
  },

  /**
   * Room-to-room path + spoken instructions —
   * GET Navigation/route?fromRoomId=&toRoomId=&lang=
   * Offline guests: Dijkstra on the cached museum graph (pairs are not snapshotted).
   */
  async getNavigationRoute(
    fromRoomId: number,
    toRoomId: number,
    lang?: string,
  ): Promise<ApiResponse<NavigationRouteResponseDto>> {
    try {
      const response = await apiFetch<
        NavigationRouteResponseDto & Record<string, unknown>
      >(
        `Navigation/route${buildQuery({
          fromRoomId,
          toRoomId,
          lang: lang || undefined,
        })}`,
      );
      return {
        ...response,
        data: response.data
          ? normalizeNavigationRoute(response.data)
          : (null as unknown as NavigationRouteResponseDto),
      };
    } catch (error) {
      const offline = await tryOfflineNavigationRoute(fromRoomId, toRoomId, lang);
      if (offline) return offline;
      throw error;
    }
  },

  /**
   * Indoor waypoint graph — GET Navigation/museum/{museumId}/graph
   */
  async getNavigationGraph(
    museumId: number,
  ): Promise<ApiResponse<NavigationGraphDto>> {
    const response = await apiFetch<
      NavigationGraphDto & Record<string, unknown>
    >(`Navigation/museum/${museumId}/graph`);
    return {
      ...response,
      data: response.data
        ? normalizeNavigationGraph(response.data)
        : (null as unknown as NavigationGraphDto),
    };
  },

  /** Danh mục hiện vật. */
  async getCategories(): Promise<ApiResponse<CategoryDto[]>> {
    return apiFetch<CategoryDto[]>('Content/categories');
  },

  /** Chủ đề trưng bày. */
  async getThemes(lang?: string): Promise<ApiResponse<ThemeDto[]>> {
    return apiFetch<ThemeDto[]>(
      `Content/themes${buildQuery(lang ? { lang } : undefined)}`,
    );
  },

  /** Triển lãm — GET Content/exhibitions?lang= */
  async getExhibitions(lang?: string): Promise<ApiResponse<ExhibitionDto[]>> {
    const response = await apiFetch<ExhibitionDto[]>(
      `Content/exhibitions${buildQuery(lang ? { lang } : undefined)}`,
    );
    return {
      ...response,
      data: (response.data ?? []).map((item) =>
        normalizeExhibitionDto(
          item as Partial<ExhibitionDto> & Record<string, unknown>,
        ),
      ),
    };
  },

  /** Bản dịch triển lãm — GET Content/exhibitions/{id}/translations */
  async getExhibitionTranslations(
    exhibitionId: number,
  ): Promise<ApiResponse<ExhibitionTranslationDto[]>> {
    return apiFetch<ExhibitionTranslationDto[]>(
      `Content/exhibitions/${exhibitionId}/translations`,
    );
  },

  /** Hiện vật thuộc triển lãm — GET Content/exhibitions/{id}/exhibits */
  async getExhibitsByExhibition(
    exhibitionId: number,
    lang?: string,
  ): Promise<ApiResponse<ExhibitDto[]>> {
    return apiFetch<ExhibitDto[]>(
      `Content/exhibitions/${exhibitionId}/exhibits${buildQuery(lang ? { lang } : undefined)}`,
    );
  },

  /** Tag hiện vật. */
  async getTags(lang?: string): Promise<ApiResponse<TagDto[]>> {
    return apiFetch<TagDto[]>(
      `Content/tags${buildQuery(lang ? { lang } : undefined)}`,
    );
  },

  /** Nhóm tag — GET Content/tag-groups */
  async getTagGroups(): Promise<ApiResponse<TagGroupDto[]>> {
    return apiFetch<TagGroupDto[]>('Content/tag-groups');
  },

  /** Tag thuộc một nhóm — GET Content/tag-groups/{id}/tags */
  async getTagsByGroup(
    tagGroupId: number,
    lang?: string,
  ): Promise<ApiResponse<TagDto[]>> {
    return apiFetch<TagDto[]>(
      `Content/tag-groups/${tagGroupId}/tags${buildQuery(lang ? { lang } : undefined)}`,
    );
  },

  /** Tag gắn với hiện vật — GET Content/exhibits/{id}/tags */
  async getExhibitTags(
    exhibitId: number,
    lang?: string,
  ): Promise<ApiResponse<TagDto[]>> {
    return apiFetch<TagDto[]>(
      `Content/exhibits/${exhibitId}/tags${buildQuery(lang ? { lang } : undefined)}`,
    );
  },

  // --- TICKETING / PAYMENT (aligned with current WebBE) ---
  async getTicketTypes(lang?: string): Promise<ApiResponse<TicketTypeDto[]>> {
    return apiFetch<TicketTypeDto[]>(
      `Ticketing/types${buildQuery(lang ? { lang } : undefined)}`,
    );
  },

  async createOrder(payload: CreateOrderRequest): Promise<ApiResponse<CreateOrderResponse>> {
    const response = await apiFetch<CreateOrderResponse & Record<string, unknown>>(
      'Ticketing/create-order',
      {
        method: 'POST',
        body: JSON.stringify({
          ticketTypeId: payload.ticketTypeId,
          quantity: payload.quantity,
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

  /** Paid tickets only. */
  async getMyTickets(lang?: string): Promise<ApiResponse<MyTicketDto[]>> {
    return apiFetch<MyTicketDto[]>(
      `Ticketing/my-tickets${buildQuery(lang ? { lang } : undefined)}`,
    );
  },

  /** GET /Ticketing/my-tickets/{id} — paid ticket detail + check-in QR payload. */
  async getTicketDetail(
    ticketId: number,
    lang?: string,
  ): Promise<ApiResponse<TicketDetailDto>> {
    const response = await apiFetch<TicketDetailDto & Record<string, unknown>>(
      `Ticketing/my-tickets/${ticketId}${buildQuery(lang ? { lang } : undefined)}`,
    );
    const raw = response.data;
    if (!raw) return { ...response, data: undefined };

    const asRecord = (v: unknown) =>
      v && typeof v === 'object' ? (v as Record<string, unknown>) : {};

    const ticketType = asRecord(raw.ticketType ?? raw.TicketType);
    const museum = asRecord(raw.museum ?? raw.Museum);
    const exhibition = asRecord(raw.exhibition ?? raw.Exhibition);
    const order = asRecord(raw.order ?? raw.Order);
    const hasExhibition = Object.keys(exhibition).length > 0;

    const unitPrice = Number(
      raw.price ?? raw.Price ?? ticketType.price ?? ticketType.Price ?? 0,
    );

    return {
      ...response,
      data: {
        id: Number(raw.id ?? raw.Id ?? ticketId),
        ticketCode: String(raw.ticketCode ?? raw.TicketCode ?? ''),
        price: unitPrice,
        status: String(raw.status ?? raw.Status ?? ''),
        purchaseDate: String(raw.purchaseDate ?? raw.PurchaseDate ?? ''),
        validDate: (raw.validDate ?? raw.ValidDate ?? null) as string | null,
        ticketType: {
          id: Number(ticketType.id ?? ticketType.Id ?? 0),
          name: String(ticketType.name ?? ticketType.Name ?? ''),
          price: Number(ticketType.price ?? ticketType.Price ?? unitPrice),
          description: (ticketType.description ?? ticketType.Description ?? null) as
            | string
            | null,
        },
        museum: {
          id: Number(museum.id ?? museum.Id ?? 0),
          name: String(museum.name ?? museum.Name ?? ''),
          address: (museum.address ?? museum.Address ?? null) as string | null,
        },
        exhibition: hasExhibition
          ? {
              id: Number(exhibition.id ?? exhibition.Id ?? 0),
              name: String(exhibition.name ?? exhibition.Name ?? ''),
            }
          : null,
        order: {
          orderCode: String(order.orderCode ?? order.OrderCode ?? ''),
          totalAmount: Number(order.totalAmount ?? order.TotalAmount ?? 0),
          currency: String(order.currency ?? order.Currency ?? 'VND'),
          paymentStatus: String(order.paymentStatus ?? order.PaymentStatus ?? ''),
          paymentMethod: normalizePaymentMethodName(
            order.paymentMethod ?? order.PaymentMethod,
          ),
          paidAt: (order.paidAt ?? order.PaidAt ?? null) as string | null,
        },
        qrCodeData: (raw.qrCodeData ?? raw.QrCodeData ?? null) as string | null,
        qrCodeImageUrl: (raw.qrCodeImageUrl ?? raw.QrCodeImageUrl ?? null) as
          | string
          | null,
      },
    };
  },

  /**
   * Active unpaid order (&lt; 15 min). Data is null when none.
   * Also regenerates / returns PayOS CheckoutUrl.
   */
  async getPendingOrder(lang?: string): Promise<ApiResponse<PendingOrderDto | null>> {
    const response = await apiFetch<PendingOrderDto & Record<string, unknown>>(
      `Ticketing/pending-order${buildQuery(lang ? { lang } : undefined)}`,
    );
    const raw = response.data;
    if (!raw || typeof raw !== 'object') {
      return { ...response, data: null };
    }
    const orderCode = String(raw.orderCode ?? raw.OrderCode ?? '').trim();
    if (!orderCode) {
      return { ...response, data: null };
    }
    const checkoutUrl =
      String(raw.checkoutUrl ?? raw.CheckoutUrl ?? '').trim() || null;
    const amountRaw = raw.totalAmount ?? raw.TotalAmount ?? raw.amount;
    return {
      ...response,
      data: {
        orderCode,
        ticketTypeId: Number(raw.ticketTypeId ?? raw.TicketTypeId ?? 0) || undefined,
        ticketTypeName: String(
          raw.ticketTypeName ?? raw.TicketTypeName ?? '',
        ).trim() || undefined,
        quantity: Number(raw.quantity ?? raw.Quantity ?? 0) || undefined,
        totalAmount:
          amountRaw != null && Number.isFinite(Number(amountRaw))
            ? Number(amountRaw)
            : undefined,
        checkoutUrl,
        qrCode: String(raw.qrCode ?? raw.QrCode ?? '').trim() || null,
        createdAt: String(raw.createdAt ?? raw.CreatedAt ?? '') || undefined,
        expiresAt: String(raw.expiresAt ?? raw.ExpiresAt ?? '') || undefined,
        remainingSeconds: Number(
          raw.remainingSeconds ?? raw.RemainingSeconds ?? 0,
        ),
      },
    };
  },

  /** POST /Payment/cancel/{orderCode} */
  async cancelOrder(orderCode: string): Promise<ApiResponse<unknown>> {
    return apiFetch<unknown>(`Payment/cancel/${encodeURIComponent(orderCode)}`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /** GET /Payment/check-status/{orderCode} → { isPaid, isCancelled, status } */
  async checkPayment(orderCode: string): Promise<ApiResponse<PaymentCheckDto>> {
    const response = await apiFetch<PaymentCheckDto & Record<string, unknown>>(
      `Payment/check-status/${encodeURIComponent(orderCode)}`,
    );
    const raw = response.data;
    if (!raw) return { ...response, data: undefined };

    const isPaid = Boolean(raw.isPaid ?? raw.IsPaid);
    const isCancelled = Boolean(raw.isCancelled ?? raw.IsCancelled);
    const status = String(raw.status ?? raw.Status ?? '').trim();
    const statusLower = status.toLowerCase();
    const paid =
      isPaid ||
      statusLower === 'completed' ||
      statusLower === 'paid';
    const cancelled =
      isCancelled ||
      statusLower === 'cancelled' ||
      statusLower === 'canceled' ||
      statusLower === 'expired';

    return {
      ...response,
      data: {
        isPaid: paid,
        isCancelled: cancelled,
        status,
        orderCode,
        // Still pending → can resume PayOS
        valid: !paid && !cancelled,
      },
    };
  },

  // --- ADMIN ---
  /** Hồ sơ bảo tàng (single museum) — Public. GET Admin/museum-profile?lang= */
  async getMuseumProfile(lang?: string): Promise<ApiResponse<MuseumProfileDto>> {
    const response = await apiFetch<MuseumProfileDto>(
      `Admin/museum-profile${buildQuery(lang ? { lang } : undefined)}`,
    );
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
    const exhibitId =
      payload.exhibitId != null && payload.exhibitId > 0
        ? payload.exhibitId
        : null;
    const searchQuery = payload.searchQuery?.trim().slice(0, 200) || null;
    const listeningDuration =
      payload.listeningDuration != null && payload.listeningDuration > 0
        ? Math.round(payload.listeningDuration)
        : null;
    return apiFetch<null>('Visitor/track-action', {
      method: 'POST',
      body: JSON.stringify({
        museumId,
        exhibitId,
        actionType,
        languageUsed: payload.languageUsed ?? null,
        deviceType: payload.deviceType ?? Platform.OS,
        searchQuery,
        listeningDuration,
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
