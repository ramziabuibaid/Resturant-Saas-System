"use client";

import * as React from "react";
import { Switch as SwitchBase } from "@base-ui/react/switch";
import { cn } from "@/lib/utils";

const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchBase.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchBase.Root>
>(({ className, ...props }, ref) => (
  <SwitchBase.Root
    ref={ref}
    data-slot="switch"
    className={cn(
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--bg-surface)]",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[checked]:bg-[var(--brand)] data-[unchecked]:bg-[var(--border)]",
      "data-[checked]:hover:bg-[var(--brand-dark)] data-[unchecked]:hover:bg-[var(--border-strong)]",
      className
    )}
    {...props}
  >
    <SwitchBase.Thumb
      data-slot="switch-thumb"
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-[var(--shadow-sm)] ring-0 transition-transform",
        "data-[checked]:translate-x-5 data-[unchecked]:translate-x-0"
      )}
    />
  </SwitchBase.Root>
));
Switch.displayName = "Switch";

export { Switch };
