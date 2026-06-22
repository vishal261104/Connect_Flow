import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";

import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-semibold text-foreground no-underline transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-b from-indigo-500 to-indigo-600 text-primary-foreground shadow-3d hover:brightness-110 active:shadow-3d-pressed border border-indigo-400/50",
        secondary:
          "bg-gradient-to-b from-white to-slate-50 text-slate-700 border border-slate-200 shadow-3d hover:brightness-105 active:shadow-3d-pressed",
        outline:
          "border border-slate-200 bg-gradient-to-b from-white to-slate-50 shadow-3d hover:bg-slate-50 text-slate-700 active:shadow-3d-pressed",
        destructive:
          "bg-gradient-to-b from-rose-500 to-rose-600 text-white border border-rose-400/50 shadow-3d hover:brightness-110 active:shadow-3d-pressed",
        ghost: "hover:bg-slate-100 text-slate-700 active:bg-slate-200 active:shadow-inner transition-all",
        link: "text-indigo-600 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        sm: "h-9 px-3",
        lg: "h-11 px-5",
        icon: "h-10 w-10 p-0",
      },
    },
    defaultVariants: {
      variant: "outline",
      size: "default",
    },
  }
);

const Button = React.forwardRef(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
