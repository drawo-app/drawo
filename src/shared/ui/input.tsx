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
  value: number;
  onValueChange: (value: number) => void;
}) {
  const [v, setV] = React.useState<number>(value);
  const [timer, setTimer] = React.useState(null);
    
  React.useEffect(() => {
    setV(value);
  }, [value]);

  React.useEffect(() => {
    clearTimeout(timer);
    setTimer(
      setTimeout(() => {
        onValueChange(v);
      }, 100),
    );
  }, [v]);
  return (
    <div className="drawo-numberinput-container">
      <button
        onClick={() => {
          setV((current) => current - 1);
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
          const newValue = parseInt(e.target.value);
          setV(newValue);
        }}
      />
      <button
        onClick={() => {
          setV((current) => current + 1);
        }}
      >
        <Plus />
      </button>
    </div>
  );
}

export { Input, NumberInput };
