/**
 * Laser points are discarded after this lifetime.
 *
 * A short window keeps the effect responsive and avoids accumulating stale
 * points in memory during long sessions.
 */
export const LASER_LIFETIME_MS = 600;

/**
 * Maximum visual width of a fresh laser segment in screen pixels.
 */
export const LASER_BASE_WIDTH_PX = 11;

/**
 * Minimum visible width for the oldest still-alive segments.
 */
export const LASER_MIN_WIDTH_PX = 0.3;

/**
 * Laser stroke color used consistently across the feature.
 */
export const LASER_COLOR = "#ff1424";
