import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { MultiColorGradient, isDark, parseColor } from "../canvas/color";

interface RenderColorSwatchItemArgs {
  color: string;
  isCurrent: boolean;
  isMulti: boolean;
  swatch: ReactNode;
}

interface ColorSwatchPickerProps {
  colors: readonly string[];
  currentColor: string;
  uniColor: (color: string) => string;
  renderItem: (args: RenderColorSwatchItemArgs) => ReactNode;
}

export const ColorSwatchPicker = ({
  colors,
  currentColor,
  uniColor,
  renderItem,
}: ColorSwatchPickerProps) => {
  const normalizedCurrentColor = currentColor.toLowerCase();
  const isPresetCurrentColor = colors.some(
    (color) =>
      color !== "multi" && color.toLowerCase() === normalizedCurrentColor,
  );

  return (
    <>
      {colors.map((color) => {
        const isMulti = color === "multi";
        const isCurrent =
          color.toLowerCase() === normalizedCurrentColor ||
          (isMulti && !isPresetCurrentColor);
        const resolvedColor = uniColor(isMulti ? currentColor : color);
        const parsedColor = parseColor(resolvedColor ?? "#000000");

        return renderItem({
          color,
          isCurrent,
          isMulti,
          swatch: (
            <div
              className="drawo-colorselect-item-container"
              data-multi={isMulti ? "true" : "false"}
              data-current={isCurrent ? "true" : "false"}
              style={{ borderColor: resolvedColor }}
            >
              <div
                className="drawo-colorselect-item-child"
                data-multi={isMulti ? "true" : "false"}
                data-current={isCurrent ? "true" : "false"}
                data-dark={
                  parsedColor && isDark(parsedColor) ? "true" : "false"
                }
                style={{
                  background: isMulti ? MultiColorGradient : resolvedColor,
                }}
              >
                <Check />
              </div>
            </div>
          ),
        });
      })}
    </>
  );
};
