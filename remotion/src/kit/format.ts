/** Spanish-locale money and percent formatting, matching the app's output. */

export const usd = (n: number, decimals = 2) =>
    `$${n.toLocaleString('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}`;

export const pct = (n: number, decimals = 2) =>
    `${n >= 0 ? '+' : ''}${n.toLocaleString('es-ES', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    })}%`;

/** Implied probability → payout multiplier, as the prediction screen shows it. */
export const odds = (mid: number) => `${parseFloat((1 / mid).toFixed(2))}x`;
