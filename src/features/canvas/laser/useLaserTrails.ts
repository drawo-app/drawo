import { useCallback, useEffect, useRef, useState } from "react";
import { createLaserTrailId } from "./id";
import { appendPointToLaserTrail, pruneLaserTrails } from "./trails";
import type { LaserTrail } from "./types";

/**
 * Centralized state manager for the laser drawing mode.
 *
 * Responsibilities:
 * - start/end active trails
 * - append sampled points while drawing
 * - maintain an animation loop that keeps fading old points
 *
 * Keeping this in a dedicated hook removes feature-specific state and timing
 * concerns from `CanvasView`, which makes the main canvas component easier
 * to reason about.
 */
export const useLaserTrails = () => {
  const [laserTrails, setLaserTrails] = useState<LaserTrail[]>([]);
  const [laserNow, setLaserNow] = useState(() => performance.now());
  const activeLaserTrailIdRef = useRef<string | null>(null);

  const startLaserTrail = useCallback((point: { x: number; y: number }) => {
    const now = performance.now();
    const trailId = createLaserTrailId();

    setLaserNow(now);
    setLaserTrails((current) => [
      ...pruneLaserTrails(current, now),
      {
        id: trailId,
        points: [{ x: point.x, y: point.y, t: now }],
      },
    ]);

    activeLaserTrailIdRef.current = trailId;
  }, []);

  const appendLaserPoint = useCallback(
    (point: { x: number; y: number }, zoom: number) => {
      const now = performance.now();

      setLaserNow(now);
      setLaserTrails((current) =>
        appendPointToLaserTrail(
          current,
          activeLaserTrailIdRef.current,
          { x: point.x, y: point.y, t: now },
          zoom,
        ),
      );
    },
    [],
  );

  /**
   * Ends the active laser trail. Existing points are still rendered until they
   * naturally expire via the pruning animation loop.
   */
  const clearActiveLaserTrail = useCallback(() => {
    activeLaserTrailIdRef.current = null;
  }, []);

  useEffect(() => {
    if (laserTrails.length === 0) {
      return;
    }

    let animationFrame = 0;

    const animate = () => {
      const now = performance.now();
      setLaserNow(now);
      setLaserTrails((current) => pruneLaserTrails(current, now));
      animationFrame = window.requestAnimationFrame(animate);
    };

    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [laserTrails.length]);

  return {
    laserTrails,
    laserNow,
    startLaserTrail,
    appendLaserPoint,
    clearActiveLaserTrail,
  };
};
