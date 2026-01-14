// ==========================================================================
// RAYO DESIGN SYSTEM - Bottom Navigation Component
// ==========================================================================

import React from 'react';
import styles from './BottomNav.module.css';

export interface NavItem {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Icon component */
  icon: React.ReactNode;
  /** Navigation href */
  href?: string;
  /** Click handler */
  onClick?: () => void;
}

export interface BottomNavProps {
  /** Navigation items */
  items: NavItem[];
  /** Currently active item ID */
  activeId: string;
  /** Change handler */
  onChange?: (id: string) => void;
  /** Additional class name */
  className?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  items,
  activeId,
  onChange,
  className = '',
}) => {
  return (
    <nav className={`${styles.nav} ${className}`}>
      {items.map((item) => {
        const isActive = item.id === activeId;
        
        return (
          <button
            key={item.id}
            className={`${styles.item} ${isActive ? styles.active : ''}`}
            onClick={() => {
              item.onClick?.();
              onChange?.(item.id);
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNav;
