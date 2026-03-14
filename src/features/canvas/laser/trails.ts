import { LASER_LIFETIME_MS } from "./constants";
import type { LaserTrail, LaserTrailPoint } from "./types";

/**
 * Removes expired points and drops empty trails.
 *
 * This function is called both while drawing and during the animation frame
 * loop so cleanup stays incremental and cheap.
 */
export const pruneLaserTrails = (
  trails: LaserTrail[],
  now: number,
): LaserTrail[] => {
  return trails
    .map((trail) => ({
      ...trail,
      points: trail.points.filter((point) => now - point.t <= LASER_LIFETIME_MS),
    }))
    .filter((trail) => trail.points.length > 0);
};

/**
 * Appends a sampled point to the currently active trail when movement is
 * meaningful, and always returns a pruned trail list.
 *
 * The distance threshold scales with zoom so behavior feels consistent whether
 * the user is zoomed in or out.
 */
export const appendPointToLaserTrail = (
  trails: LaserTrail[],
  activeTrailId: string | null,
  point: LaserTrailPoint,
  zoom: number,
): LaserTrail[] => {
  if (!activeTrailId) {
    return pruneLaserTrails(trails, point.t);
  }

  return pruneLaserTrails(
    trails.map((trail) => {
      if (trail.id !== activeTrailId) {
        return trail;
      }

      const previousPoint = trail.points[trail.points.length - 1];
      const minimumDistance = 0.3 / zoom;

      if (
        previousPoint &&
        Math.hypot(point.x - previousPoint.x, point.y - previousPoint.y) <
          minimumDistance
      ) {
        return trail;
      }

      return {
        ...trail,
        points: [...trail.points, point],
      };
    }),
    point.t,
  );
};
