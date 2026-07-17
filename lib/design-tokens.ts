/**
 * Design System Token Utility
 *
 * Use these functions to access design system CSS variables in JavaScript/TypeScript
 * This is useful for inline styles, chart libraries, and third-party components
 * that require color strings.
 */

// Import TypeScript tokens for static usage
export { colors, spacing, typography, borderRadius, shadows, transitions, zIndex } from '../rayo-design-system/styles/tokens';

/**
 * Get a CSS variable value at runtime
 * Useful when you need to pass colors to libraries like Chart.js, Recharts, etc.
 *
 * @example
 * const brandColor = getCSSVar('--color-brand-primary'); // Returns '#E3B34C'
 */
export function getCSSVar(varName: string): string {
  if (typeof window === 'undefined') return '';
  return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

/**
 * Quick access to common design system colors as CSS variable strings
 * Use these in inline styles: style={{ color: tokens.brand }}
 */
export const tokens = {
  // Brand colors
  brand: 'var(--color-brand-primary)',
  brandHover: 'var(--color-brand-primary-hover)',
  brandMuted: 'var(--color-brand-primary-muted)',
  brandBorder: 'var(--color-brand-primary-border)',

  // Semantic colors
  positive: 'var(--color-positive)',
  positiveMuted: 'var(--color-positive-muted)',
  negative: 'var(--color-negative)',
  negativeMuted: 'var(--color-negative-muted)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',

  // Backgrounds
  bgPrimary: 'var(--color-bg-primary)',
  bgSecondary: 'var(--color-bg-secondary)',
  bgTertiary: 'var(--color-bg-tertiary)',
  bgElevated: 'var(--color-bg-elevated)',
  bgHover: 'var(--color-bg-hover)',

  // Text
  textPrimary: 'var(--color-text-primary)',
  textSecondary: 'var(--color-text-secondary)',
  textTertiary: 'var(--color-text-tertiary)',
  textMuted: 'var(--color-text-muted)',
  textOnBrand: 'var(--color-text-on-brand)',

  // Borders
  border: 'var(--color-border-default)',
  borderSubtle: 'var(--color-border-subtle)',
  borderEmphasis: 'var(--color-border-emphasis)',

  // Spacing
  space1: 'var(--space-1)',
  space2: 'var(--space-2)',
  space3: 'var(--space-3)',
  space4: 'var(--space-4)',
  space6: 'var(--space-6)',
  space8: 'var(--space-8)',

  // Border radius
  radiusSm: 'var(--radius-sm)',
  radiusMd: 'var(--radius-md)',
  radiusLg: 'var(--radius-lg)',
  radiusXl: 'var(--radius-xl)',
  radius2xl: 'var(--radius-2xl)',
  radiusFull: 'var(--radius-full)',

  // Transitions
  transitionFast: 'var(--transition-fast)',
  transitionBase: 'var(--transition-base)',
  transitionSlow: 'var(--transition-slow)',
} as const;

/**
 * Legacy color constants for gradual migration
 * @deprecated Use tokens.brand instead
 */
export const LEGACY_COLORS = {
  RAYO_YELLOW: tokens.brand,
  TRADE_GREEN: tokens.positive,
  TRADE_RED: tokens.negative,
} as const;
