import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:pointer-events-none disabled:opacity-50 active:scale-[.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] !text-white shadow-[0_8px_24px_-8px_var(--accent)] hover:brightness-110 hover:-translate-y-px",
        glass:
          "bg-[var(--surface)] !text-[var(--ink)] shadow-[var(--glass-sh)] backdrop-blur-xl hover:-translate-y-px",
        ghost: "text-[var(--ink)] hover:bg-[var(--accent-soft)]",
      },
      size: {
        default: "min-h-11 px-5 py-2.5 text-sm",
        lg: "min-h-12 px-6 py-3 text-[15px]",
        sm: "min-h-9 px-3 text-xs",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
export { buttonVariants };
