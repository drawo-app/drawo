import type { Scene, SceneSettings } from "./types";

export const updateSceneSettings = (
  scene: Scene,
  settings: Partial<SceneSettings>,
): Scene => {
  const nextSettings: SceneSettings = {
    ...scene.settings,
    ...settings,
  };

  if (settings.zenMode === true) {
    nextSettings.presentationMode = false;
  }

  if (settings.presentationMode === true) {
    nextSettings.zenMode = false;
  }

  if (nextSettings.zenMode && nextSettings.presentationMode) {
    nextSettings.presentationMode = false;
  }

  return {
    ...scene,
    settings: nextSettings,
  };
};
