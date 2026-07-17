// ==========================================================================
// RAYO DESIGN SYSTEM - TypeScript Tokens
//
// Use these constants in your components for type safety
// ==========================================================================

export const colors = {
  // Background hierarchy
  bg: {
    primary: '#0A0C0E',
    secondary: '#0F1215',
    tertiary: '#14181C',
    elevated: '#1A1F24',
    hover: '#222831',
  },

  // Brand - Apollonian gold
  brand: {
    primary: '#E3B34C',
    primaryHover: '#F2D389',
    primaryMuted: 'rgba(227, 179, 76, 0.2)',
    primaryBorder: 'rgba(227, 179, 76, 0.4)',
  },

  // Semantic - Status
  positive: '#22C55E',
  positiveMuted: 'rgba(34, 197, 94, 0.2)',
  negative: '#EF4444',
  negativeMuted: 'rgba(239, 68, 68, 0.2)',
  warning: '#F59E0B',
  info: '#3B82F6',

  // Text hierarchy
  text: {
    primary: '#FFFFFF',
    secondary: '#A1A1AA',
    tertiary: '#71717A',
    muted: '#52525B',
    onBrand: '#1C1608',
  },

  // Borders
  border: {
    default: '#27272A',
    subtle: '#1C1C1E',
    emphasis: '#3F3F46',
  },
} as const;

export const typography = {
  fontFamily: {
    sans: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    mono: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
  },

  fontSize: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
  },

  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },

  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
  },

  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0',
    wide: '0.025em',
  },
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',
  2: '0.5rem',
  3: '0.75rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  8: '2rem',
  10: '2.5rem',
  12: '3rem',
  16: '4rem',
} as const;

export const borderRadius = {
  none: '0',
  sm: '0.25rem',
  md: '0.5rem',
  lg: '0.75rem',
  xl: '1rem',
  '2xl': '1.5rem',
  full: '9999px',
} as const;

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.5)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.5), 0 2px 4px -2px rgb(0 0 0 / 0.5)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.5), 0 4px 6px -4px rgb(0 0 0 / 0.5)',
  glowBrand: '0 0 20px rgba(227, 179, 76, 0.2)',
  glowPositive: '0 0 20px rgba(34, 197, 94, 0.2)',
  glowNegative: '0 0 20px rgba(239, 68, 68, 0.2)',
} as const;

export const transitions = {
  fast: '150ms ease',
  base: '200ms ease',
  slow: '300ms ease',
  slower: '500ms ease',
} as const;

export const zIndex = {
  dropdown: 100,
  sticky: 200,
  modalBackdrop: 300,
  modal: 400,
  popover: 500,
  tooltip: 600,
  toast: 700,
} as const;

// Type exports for strict typing
export type ColorToken = typeof colors;
export type TypographyToken = typeof typography;
export type SpacingToken = typeof spacing;
export type BorderRadiusToken = typeof borderRadius;
