import { createElementId } from "@core/elements";

/**
 * Generates a unique id for a laser trail.
 *
 * We prefix with `laser-` to make debugging easier in DevTools/state snapshots
 * and to avoid collisions with persisted draw element ids.
 */
export const createLaserTrailId = () => `laser-${createElementId("draw")}`;
