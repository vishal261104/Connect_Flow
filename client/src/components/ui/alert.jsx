import * as React from "react";

import { cn } from "../../lib/utils";

const Alert = React.forwardRef(({ className, variant = "default", ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "relative w-full rounded-lg border p-4 text-sm shadow-soft",
      variant === "destructive"
        ? "border-destructive/25 bg-destructive/10 text-foreground"
        : "border-border bg-white/70 text-foreground",
      className
    )}
    {...props}
  />
));
Alert.displayName = "Alert";

export { Alert };
