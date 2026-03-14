/**
 * Represents one sampled pointer point for the laser trail.
 *
 * The `t` timestamp is required because the laser effect is time-based:
 * points fade and shrink as they age.
 */
export interface LaserTrailPoint {
  x: number;
  y: number;
  t: number;
}

/**
 * One logical laser stroke made of many sampled points.
 *
 * Each stroke has a stable id so we can update only the active trail while
 * preserving previous trails that are still fading out.
 */
export interface LaserTrail {
  id: string;
  points: LaserTrailPoint[];
}
