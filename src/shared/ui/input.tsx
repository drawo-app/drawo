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
    typeof value === "number" && Number.isFinite(value) ? value : 0,
  );
  const timerRef = React.useRef<number | null>(null);
  const didMountRef = React.useRef(false);

  React.useEffect(() => {
    if (typeof value === "number" && Number.isFinite(value)) {
      setV(value);
    }
  }, [value]);

  React.useEffect(() => {
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (!Number.isFinite(v)) {
      return;
    }

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = window.setTimeout(() => {
      onValueChange(v);
    }, 100);

    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, [onValueChange, v]);

  return (
    <div className="drawo-numberinput-container">
      <button
        onClick={() => {
          setV((current) => (Number.isFinite(current) ? current : 0) - 1);
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
            setV(newValue);
          }
        }}
      />
      <button
        onClick={() => {
          setV((current) => (Number.isFinite(current) ? current : 0) + 1);
        }}
      >
        <Plus />
      </button>
    </div>
  );
}

export { Input, NumberInput };
