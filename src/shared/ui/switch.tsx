"use client";

import * as React from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={"drawo-switch" + (className ? " " + className : "")}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="drawo-switch-thumb"
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
