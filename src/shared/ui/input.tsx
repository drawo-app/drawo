import { Minus, Plus } from "lucide-react";
import * as React from "react";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={"drawo-input" + (className ? " " + className : "")}
      {...props}
    />
  );
}
function NumberInput({
  className,
  type,
  value,
  onValueChange,
  ...props
}: React.ComponentProps<"input"> & {
  value: number | undefined;
  onValueChange: (value: number) => void;
}) {
  const [v, setV] = React.useState<number>(
    typeof value === "number" && Number.isFinite(value) ? value : 10,
  );

  React.useEffect(() => {
    if (typeof value === "number" && Number.isFinite(value)) {
      setV(value);
    }
  }, [value]);

  const applyValue = (next: number) => {
    if (!Number.isFinite(next)) {
      return;
    }

    setV(next);
    onValueChange(next);
  };

  return (
    <div className="drawo-numberinput-container">
      <button
        onClick={() => {
          applyValue((Number.isFinite(v) ? v : 10) - 1);
        }}
      >
        <Minus />
      </button>
      <input
        type={type}
        data-slot="input"
        className={"drawo-numberinput" + (className ? " " + className : "")}
        {...props}
        value={v}
        onChange={(e) => {
          const newValue = Number.parseInt(e.target.value, 10);

          if (Number.isFinite(newValue)) {
            applyValue(newValue);
          }
        }}
      />
      <button
        onClick={() => {
          applyValue((Number.isFinite(v) ? v : 10) + 1);
        }}
      >
        <Plus />
      </button>
    </div>
  );
}

export { Input, NumberInput };
