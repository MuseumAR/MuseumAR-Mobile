/**
 * ============================================================
 *  MUSEUM DARK THEME — central color palette for the entire app
 * ============================================================
 * To change colors: edit here only. All screens update automatically.
 */

export const C = {
  // ── Backgrounds ──────────────────────────────
  bgPrimary:  '#080A14',   // main screen background
  bgSurface:  '#131726',   // cards / surfaces
  bgElevated: '#1C2030',   // inputs, modals, elevated
  bgOverlay:  'rgba(0,0,0,0.65)',

  // ── Borders & dividers ───────────────────────
  border:     '#252A3D',
  divider:    '#1A1E2E',

  // ── Text ─────────────────────────────────────
  textPrimary:     '#FFFFFF',
  textSecondary:   '#9CA3AF',
  textMuted:       '#4B5568',
  textPlaceholder: '#374151',

  // ── Gold accent ──────────────────────────────
  accent:      '#D4A94D',   // gold — primary buttons, highlights
  accentLight: '#E8C97A',   // lighter gold for text on dark
  accentDark:  '#2A2010',   // dark gold background (muted)
  accentMuted: '#1E1A0E',

  // ── Bronze accent ────────────────────────────
  bronze:      '#A97142',
  bronzeDark:  '#1E1208',

  // ── Status ───────────────────────────────────
  success:     '#22C55E',
  warning:     '#F59E0B',
  danger:      '#EF4444',
  dangerMuted: '#3B1515',

  // ── Tab bar ──────────────────────────────────
  tabBg:       '#080A14',
  tabActive:   '#D4A94D',
  tabInactive: '#3D4663',
  tabBorder:   '#1A1E2E',
} as const;

export type ColorKey = keyof typeof C;
