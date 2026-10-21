import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "field !rounded-xl transition-shadow focus-visible:!shadow-[0_0_0_3px_var(--accent-soft)]",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
