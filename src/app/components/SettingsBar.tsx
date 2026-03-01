import type { Dispatch, SetStateAction } from "react";
import type { LocaleCode, LocaleMessages } from "../../i18n";
import { isLocaleCode } from "../../i18n";
import { type Scene, updateSceneSettings } from "../../core/scene";
import { MenuIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/dropdown-menu";
import { Moon, PaperBin, Sun } from "@solar-icons/react";
import { Check, LayoutCells, SquareDashedCircle } from "@gravity-ui/icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/select";

interface SettingsBarProps {
  scene: Scene;
  isDarkMode: boolean;
  locale: LocaleCode;
  messages: LocaleMessages;
  setLocale: Dispatch<SetStateAction<LocaleCode>>;
  setScene: Dispatch<SetStateAction<Scene>>;
}

export const SettingsBar = ({
  scene,
  isDarkMode,
  locale,
  messages,
  setLocale,
  setScene,
}: SettingsBarProps) => {
  return (
    <div className="settings-bar">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={`tool-item`} onClick={() => {}}>
            <MenuIcon />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onClick={() => {}}>
            <PaperBin /> Vaciar canvas
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuCheckboxItem
            checked={scene.settings.showGrid}
            onClick={() => {
              setScene((currentScene) =>
                updateSceneSettings(currentScene, {
                  showGrid: !currentScene.settings.showGrid,
                }),
              );
            }}
          >
            <LayoutCells /> {messages.settings.showGrid}{" "}
          </DropdownMenuCheckboxItem>
          <DropdownMenuCheckboxItem
            checked={scene.settings.snapToGrid}
            onClick={() => {
              setScene((currentScene) =>
                updateSceneSettings(currentScene, {
                  snapToGrid: !currentScene.settings.snapToGrid,
                }),
              );
            }}
          >
            <SquareDashedCircle /> {messages.settings.snapToGrid}
          </DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <div className="custom-element">
            <span>{messages.settings.theme}</span>
            <div className="theme-selector">
              <div
                className={
                  "theme-option " +
                  (scene.settings.theme === "light" ? "active" : "")
                }
                onClick={() => {
                  setScene((currentScene) =>
                    updateSceneSettings(currentScene, {
                      theme: "light",
                    }),
                  );
                }}
              >
                <Sun size={16} weight="Bold" />
              </div>
              <div
                className={
                  "theme-option " +
                  (scene.settings.theme === "dark" ? "active" : "")
                }
                onClick={() => {
                  setScene((currentScene) =>
                    updateSceneSettings(currentScene, {
                      theme: "dark",
                    }),
                  );
                }}
              >
                <Moon size={16} weight="Bold" />
              </div>
            </div>
          </div>
          <div className="custom-element">
            <Select
              value={locale}
              onValueChange={(value) => {
                if (isLocaleCode(value)) {
                  setLocale(value);
                }
              }}
            >
              <SelectTrigger className="custom-select-trigger">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en_US">English</SelectItem>
                <SelectItem value="es_ES">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

{
  /*   <label className="switch-row">
  <input
    type="checkbox"
    checked={scene.settings.showGrid}
    onChange={(event) =>
      setScene((currentScene) =>
        updateSceneSettings(currentScene, {
          showGrid: event.target.checked,
        }),
      )
    }
  />
  <span>{messages.settings.showGrid}</span>
</label>

<label className="switch-row">
  <input
    type="checkbox"
    checked={scene.settings.snapToGrid}
    onChange={(event) =>
      setScene((currentScene) =>
        updateSceneSettings(currentScene, {
          snapToGrid: event.target.checked,
        }),
      )
    }
  />
  <span>{messages.settings.snapToGrid}</span>
</label>

<label className="switch-row">
  <input
    type="checkbox"
    checked={isDarkMode}
    onChange={(event) =>
      setScene((currentScene) =>
        updateSceneSettings(currentScene, {
          theme: event.target.checked ? "dark" : "light",
        }),
      )
    }
  />
  <span>{messages.settings.darkMode}</span>
</label>

<label className="switch-row">
  <span>{messages.settings.language}</span>
  <select
    value={locale}
    onChange={(event) => {
      const next = event.target.value;
      if (isLocaleCode(next)) {
        setLocale(next);
      }
    }}
  >
    <option value="en_US">{messages.localeNames.en_US}</option>
    <option value="es_ES">{messages.localeNames.es_ES}</option>
  </select>
</label> */
}
