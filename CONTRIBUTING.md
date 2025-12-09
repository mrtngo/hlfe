# Contributing to Rayo

Thank you for your interest in contributing to Rayo! This guide will help you get started.

## 🚀 Getting Started

1. **Fork and clone** the repository
2. **Install dependencies**: `npm install`
3. **Create a branch**: `git checkout -b feature/your-feature-name`
4. **Make your changes**
5. **Test**: Run `npm run build` to ensure no TypeScript errors
6. **Submit a PR**

## 📁 Project Organization

### Where to Put Things

| Type | Location | Example |
|------|----------|---------|
| React components | `components/` | `OrderPanel.tsx` |
| Custom hooks | `hooks/` | `useUserData.ts` |
| Type definitions | `types/` | `hyperliquid.ts` |
| Constants | `lib/constants/` | `tokens.ts` |
| Utilities | `lib/` | `api-cache.ts` |
| Translations | `lib/i18n/` | `es.json`, `en.json` |

### Naming Conventions

- **Components**: PascalCase (`OrderPanel.tsx`)
- **Hooks**: camelCase with `use` prefix (`useUserData.ts`)
- **Types**: PascalCase for interfaces (`Position`, `Order`)
- **Constants**: SCREAMING_SNAKE_CASE (`MIN_NOTIONAL_VALUE`)
- **Files**: kebab-case for utilities (`api-cache.ts`)

## 🧩 Adding New Features

### New Component

```tsx
// components/MyComponent.tsx
'use client';

import { useLanguage } from '@/hooks/useLanguage';
import { useHyperliquid } from '@/hooks/useHyperliquid';

interface MyComponentProps {
    // Define props with TypeScript
}

export default function MyComponent({ ...props }: MyComponentProps) {
    const { t } = useLanguage();
    // Component logic
    return (/* JSX */);
}
```

### New Hook

```tsx
// hooks/useMyHook.ts
'use client';

import { useState, useCallback } from 'react';

export interface MyHookResult {
    // Define return type
}

export function useMyHook(): MyHookResult {
    // Hook logic
    return { /* state and actions */ };
}
```

### New Type

```typescript
// types/hyperliquid.ts (add to existing file)

/**
 * JSDoc comment explaining the type
 */
export interface MyNewType {
    id: string;
    // ...
}
```

Then export from `types/index.ts`:

```typescript
export type { MyNewType } from './hyperliquid';
```

### New Constant

```typescript
// lib/constants/trading.ts (add to existing file)

/**
 * Description of what this constant represents
 */
export const MY_NEW_CONSTANT = 'value';
```

Then export from `lib/constants/index.ts`:

```typescript
export { MY_NEW_CONSTANT } from './trading';
```

## 🌐 Translations

When adding user-facing text:

1. Add the key to both `lib/i18n/es.json` and `lib/i18n/en.json`
2. Use the translation hook:

```tsx
const { t } = useLanguage();
return <span>{t.mySection.myKey}</span>;
```

## 🎨 Styling Guidelines

### CSS Classes

Use Tailwind utilities. For custom styles, use CSS variables from `globals.css`:

```tsx
// Good
<div className="bg-bg-primary text-primary rounded-xl p-4">

// Also good (for complex styles)
<div className="glass-card">
```

### Colors

Use semantic color names from `tailwind.config.js`:

- `bg-primary`, `bg-secondary`, `bg-tertiary` - Backgrounds
- `text-primary`, `text-secondary`, `text-muted` - Text
- `bullish`, `bearish` - Trading colors
- `primary` - Accent (neon yellow)

## ✅ Before Submitting

- [ ] `npm run build` passes without errors
- [ ] `npm run lint` shows no issues
- [ ] New types are in `types/` directory
- [ ] New constants are in `lib/constants/`
- [ ] Translations added for user-facing strings
- [ ] Component has proper TypeScript types

## 🐛 Reporting Issues

When reporting bugs, please include:

1. Steps to reproduce
2. Expected behavior
3. Actual behavior
4. Browser/device info
5. Console errors (if any)

## 💡 Feature Requests

For new features:

1. Open an issue describing the feature
2. Explain the use case
3. Wait for discussion before implementing

## 📝 Commit Messages

Use conventional commits:

```
feat: add new order type selector
fix: correct position PnL calculation
docs: update README with new structure
refactor: extract useUserData hook
```

## 🙏 Thank You!

Your contributions help make Rayo better for the entire LATAM trading community!
