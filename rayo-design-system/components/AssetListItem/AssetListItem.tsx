// ==========================================================================
// RAYO DESIGN SYSTEM - Asset List Item Component
//
// For displaying crypto/stock rows with icon, name, price, and change
// ==========================================================================

import React from 'react';
import styles from './AssetListItem.module.css';

export interface AssetListItemProps {
  /** Asset icon (image URL or React node) */
  icon: string | React.ReactNode;
  /** Asset symbol (e.g., "BTC") */
  symbol: string;
  /** Full name (e.g., "Bitcoin") */
  name?: string;
  /** Current price */
  price: string | number;
  /** Price change percentage */
  change: number;
  /** Leverage badge (e.g., "40x") */
  leverage?: string;
  /** Optional sparkline chart component */
  sparkline?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Additional class name */
  className?: string;
}

export const AssetListItem: React.FC<AssetListItemProps> = ({
  icon,
  symbol,
  name,
  price,
  change,
  leverage,
  sparkline,
  onClick,
  className = '',
}) => {
  const isPositive = change >= 0;
  const formattedChange = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
  const formattedPrice = typeof price === 'number' 
    ? price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
    : price;

  return (
    <div
      className={`${styles.item} ${onClick ? styles.interactive : ''} ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {/* Left section - Icon and name */}
      <div className={styles.left}>
        <div className={styles.iconWrapper}>
          {typeof icon === 'string' ? (
            <img src={icon} alt={symbol} className={styles.icon} />
          ) : (
            icon
          )}
        </div>
        <div className={styles.info}>
          <div className={styles.symbolRow}>
            <span className={styles.symbol}>{symbol}</span>
            {leverage && (
              <span className={styles.leverage}>{leverage}</span>
            )}
          </div>
          {name && <span className={styles.name}>{name}</span>}
        </div>
      </div>

      {/* Middle section - Sparkline (optional) */}
      {sparkline && (
        <div className={styles.middle}>
          {sparkline}
        </div>
      )}

      {/* Right section - Price and change */}
      <div className={styles.right}>
        <span className={styles.price}>{formattedPrice}</span>
        <span className={`${styles.change} ${isPositive ? styles.positive : styles.negative}`}>
          {formattedChange}
        </span>
      </div>
    </div>
  );
};

export default AssetListItem;
