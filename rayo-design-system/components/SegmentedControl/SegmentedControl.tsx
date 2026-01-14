// ==========================================================================
// RAYO DESIGN SYSTEM - Segmented Control Component
//
// For tabs like Crypto/Stocks, Perps/Spot, etc.
// ==========================================================================

import React from 'react';
import styles from './SegmentedControl.module.css';

export interface SegmentOption {
  /** Unique value */
  value: string;
  /** Display label */
  label: string;
}

export interface SegmentedControlProps {
  /** Available options */
  options: SegmentOption[];
  /** Currently selected value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Full width */
  fullWidth?: boolean;
  /** Additional class name */
  className?: string;
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
  options,
  value,
  onChange,
  size = 'md',
  fullWidth = false,
  className = '',
}) => {
  return (
    <div
      className={`${styles.container} ${styles[size]} ${fullWidth ? styles.fullWidth : ''} ${className}`}
      role="tablist"
    >
      {options.map((option) => {
        const isActive = option.value === value;
        
        return (
          <button
            key={option.value}
            className={`${styles.segment} ${isActive ? styles.active : ''}`}
            onClick={() => onChange(option.value)}
            role="tab"
            aria-selected={isActive}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
};

export default SegmentedControl;
