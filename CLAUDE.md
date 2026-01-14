# RAYO Design System - Claude Code Instructions

## Overview

This is the design system for **Rayo**, a crypto/stocks trading app. The visual identity is **black background with yellow accents** — a high-contrast, data-dense trading aesthetic.

**IMPORTANT**: When building ANY new UI for this project, you MUST use these design tokens and component patterns. Do NOT invent new colors, spacing, or component styles.

---

## Brand Identity

- **Primary Background**: Pure black (`#000000`)
- **Primary Accent**: Bright yellow (`#FACC15`)
- **Positive/Gains**: Green (`#22C55E`)
- **Negative/Losses**: Red (`#EF4444`)
- **Text**: White primary, zinc grays for secondary

---

## Design Tokens

All styling must use CSS variables from `styles/tokens.css`. Import this file in your global styles.

### Colors - ALWAYS use these variables:

```css
/* Backgrounds */
var(--color-bg-primary)      /* #000000 - main background */
var(--color-bg-secondary)    /* #0A0A0A - cards, sections */
var(--color-bg-tertiary)     /* #111111 - inputs, elevated */
var(--color-bg-elevated)     /* #1A1A1A - modals, dropdowns */
var(--color-bg-hover)        /* #222222 - hover states */

/* Brand Yellow */
var(--color-brand-primary)        /* #FACC15 - buttons, accents */
var(--color-brand-primary-hover)  /* #FDE047 - hover state */
var(--color-brand-primary-muted)  /* 20% opacity - backgrounds */

/* Status Colors */
var(--color-positive)        /* #22C55E - gains, success */
var(--color-negative)        /* #EF4444 - losses, errors */

/* Text */
var(--color-text-primary)    /* #FFFFFF */
var(--color-text-secondary)  /* #A1A1AA */
var(--color-text-tertiary)   /* #71717A */
var(--color-text-on-brand)   /* #000000 - text on yellow */

/* Borders */
var(--color-border-default)  /* #27272A */
var(--color-border-subtle)   /* #1C1C1E */
```

### Typography

```css
/* Font families */
var(--font-sans)   /* Inter - UI text */
var(--font-mono)   /* JetBrains Mono - prices, numbers */

/* Sizes */
var(--text-xs)     /* 12px */
var(--text-sm)     /* 14px */
var(--text-base)   /* 16px */
var(--text-lg)     /* 18px */
var(--text-xl)     /* 20px */
var(--text-2xl)    /* 24px */
```

### Spacing

```css
var(--space-1)   /* 4px */
var(--space-2)   /* 8px */
var(--space-3)   /* 12px */
var(--space-4)   /* 16px */
var(--space-6)   /* 24px */
var(--space-8)   /* 32px */
```

### Border Radius

```css
var(--radius-sm)    /* 4px - badges */
var(--radius-md)    /* 8px - buttons, inputs */
var(--radius-lg)    /* 12px - cards */
var(--radius-xl)    /* 16px - large cards */
var(--radius-full)  /* 9999px - pills, avatars */
```

---

## Component Usage

### Buttons

Use the `<Button>` component. Available variants:

```tsx
// Primary - Yellow filled (main CTAs)
<Button variant="primary">Trade</Button>

// Secondary - Yellow outline
<Button variant="secondary">Cancel</Button>

// Ghost - Minimal
<Button variant="ghost">Settings</Button>

// Danger - Red (destructive actions)
<Button variant="danger">Close Position</Button>

// Sizes: sm, md, lg
<Button size="lg" fullWidth>Deposit</Button>
```

### Cards

```tsx
// Default card
<Card>Content</Card>

// With yellow border (for emphasis)
<Card variant="brand">Important content</Card>

// Interactive (clickable)
<Card variant="outlined" interactive>Click me</Card>
```

### Asset List Items

For crypto/stock rows:

```tsx
<AssetListItem
  icon="/icons/btc.svg"
  symbol="BTC"
  name="Bitcoin"
  price={96946.00}
  change={3.93}
  leverage="40x"
  sparkline={<Sparkline data={priceData} />}
  onClick={() => navigate('/trade/btc')}
/>
```

### Badges

For leverage tags, status indicators:

```tsx
<Badge variant="info">40x</Badge>
<Badge variant="positive">Active</Badge>
<Badge variant="negative">Liquidated</Badge>
<Badge variant="brand">NEW</Badge>
```

### Segmented Control

For tabs like Crypto/Stocks:

```tsx
<SegmentedControl
  options={[
    { value: 'crypto', label: 'Crypto' },
    { value: 'stocks', label: 'Stocks' },
  ]}
  value={activeTab}
  onChange={setActiveTab}
/>
```

### Bottom Navigation

```tsx
<BottomNav
  items={[
    { id: 'home', label: 'Inicio', icon: <HomeIcon /> },
    { id: 'trade', label: 'Tradear', icon: <ChartIcon /> },
    { id: 'spot', label: 'Spot', icon: <WalletIcon /> },
    { id: 'history', label: 'Historial', icon: <ClockIcon /> },
    { id: 'profile', label: 'Perfil', icon: <UserIcon /> },
  ]}
  activeId={currentPage}
  onChange={setCurrentPage}
/>
```

---

## Strict Rules

1. **NEVER use hardcoded colors** - Always use CSS variables
2. **NEVER use hardcoded spacing** - Use spacing variables
3. **ALWAYS use `font-mono` for prices and numbers**
4. **ALWAYS show positive values in green, negative in red**
5. **NEVER add new components without matching these patterns**
6. **Yellow is ONLY for:**
   - Primary action buttons
   - Active nav items
   - Important highlights/borders
   - Brand emphasis

---

## File Structure

```
/styles
  tokens.css        # CSS variables (import in globals)
  tokens.ts         # TypeScript constants

/components
  Button/
  Card/
  AssetListItem/
  Badge/
  BottomNav/
  SegmentedControl/
  index.ts          # Barrel exports
```

---

## Adding New Components

When creating new components:

1. Create a folder: `/components/ComponentName/`
2. Add `ComponentName.tsx` with TypeScript props interface
3. Add `ComponentName.module.css` using ONLY design tokens
4. Export from `/components/index.ts`
5. Follow existing patterns exactly

---

## Example: Creating a New List Item

```tsx
// ❌ WRONG - hardcoded values
<div style={{ 
  padding: '12px', 
  background: '#1a1a1a',
  color: 'white'
}}>

// ✅ CORRECT - using tokens
<div className={styles.item}>
  {/* In CSS: */}
  {/* padding: var(--space-3); */}
  {/* background: var(--color-bg-elevated); */}
  {/* color: var(--color-text-primary); */}
```

---

## Quick Reference

| Element | Color Variable |
|---------|---------------|
| Page background | `--color-bg-primary` |
| Card background | `--color-bg-secondary` |
| Primary button | `--color-brand-primary` |
| Gains/positive % | `--color-positive` |
| Losses/negative % | `--color-negative` |
| Primary text | `--color-text-primary` |
| Secondary text | `--color-text-secondary` |
| Prices/numbers | Use `font-mono` class |

---

Remember: **Consistency is key**. Every screen should feel like it belongs to the same app.
