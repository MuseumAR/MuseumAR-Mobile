/**
 * ============================================================
 *  MUSEUM THEME — synced with MuseumAR-Frontend
 * ============================================================
 * Source of truth (FE):
 *   lib/dashboard-theme.ts  — app shell / dashboard
 *   lib/auth-theme.ts       — auth / marketing gold
 *   app/globals.css         — --background / --foreground
 *
 * Edit here only; screens that import `C` update automatically.
 */

export const C = {
  // ── Backgrounds ──────────────────────────────
  bgPrimary:  '#F7F2E9',   // page bg (dashboard / globals)
  bgSurface:  '#FFFDF8',   // cards / panels
  bgElevated: '#FFF8E7',   // inputs, elevated surfaces (auth card)
  bgOverlay:  'rgba(43,29,14,0.45)',

  // ── Borders & dividers ───────────────────────
  border:     '#E6D7B8',
  divider:    '#E6D7B8',

  // ── Text ─────────────────────────────────────
  textPrimary:     '#2B1D0E',
  textSecondary:   '#6D5A45',
  textMuted:       '#A08060',
  textPlaceholder: '#A08060',

  // ── Gold accent (brand) ──────────────────────
  accent:      '#C89B3C',   // primary gold (auth / marketing)
  accentLight: '#D4B06A',
  accentDark:  '#F5E6C8',   // soft gold wash background
  accentMuted: '#FDF8EF',   // sidebar-like tint
  onAccent:    '#FFFDF8',   // text/icons on gold CTAs

  // ── Bronze / gradient end ────────────────────
  bronze:      '#A67C2D',   // auth secondary
  bronzeDark:  '#9A6F1F',   // dashboard primaryDark

  // ── Status ───────────────────────────────────
  success:     '#4F7D4A',
  warning:     '#B45309',
  danger:      '#8B2E2E',
  dangerMuted: '#F5E6C8',

  // ── Tab bar ──────────────────────────────────
  tabBg:       '#FFFDF8',
  tabActive:   '#C89B3C',
  tabInactive: '#A08060',
  tabBorder:   '#E6D7B8',
} as const;

export type ColorKey = keyof typeof C;
