import type { Scene, SceneSettings } from "./types";

export const updateSceneSettings = (
  scene: Scene,
  settings: Partial<SceneSettings>,
): Scene => ({
  ...scene,
  settings: {
    ...scene.settings,
    ...settings,
  },
});
