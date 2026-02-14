import * as React from "react";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border border-border bg-white/70 px-2.5 py-1 text-xs font-semibold text-muted-foreground shadow-soft",
  {
    variants: {
      variant: {
        default: "",
        primary: "border-transparent bg-primary text-primary-foreground",
        destructive: "border-destructive/25 bg-destructive/10 text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({ className, variant, ...props }) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
