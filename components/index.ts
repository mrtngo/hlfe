/**
 * Rayo Design System Components
 *
 * Barrel export file that makes design system components available
 * from the main components directory.
 *
 * Usage:
 *   import { Button, Card, Badge } from '@/components'
 */

// Re-export all design system components
export {
  Button,
  type ButtonProps,
} from '../rayo-design-system/components/Button/Button';

export {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  type CardProps,
} from '../rayo-design-system/components/Card/Card';

export {
  Badge,
  type BadgeProps,
} from '../rayo-design-system/components/Badge/Badge';

export {
  AssetListItem,
  type AssetListItemProps,
} from '../rayo-design-system/components/AssetListItem/AssetListItem';

export {
  BottomNav,
  type BottomNavProps,
  type NavItem,
} from '../rayo-design-system/components/BottomNav/BottomNav';

export {
  SegmentedControl,
  type SegmentedControlProps,
  type SegmentOption,
} from '../rayo-design-system/components/SegmentedControl/SegmentedControl';

// Re-export design tokens for convenience
export { colors, spacing, typography, borderRadius, shadows, transitions, zIndex } from '../rayo-design-system/styles/tokens';
