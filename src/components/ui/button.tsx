import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--color-primary)] text-white shadow-lg hover:-translate-y-0.5 hover:bg-[var(--color-primary-hover)]",
        secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
        ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900",
        outline:
          "border border-[var(--color-border)] bg-[var(--color-surface)] text-slate-700 hover:border-[var(--color-border-accent)] hover:bg-[var(--color-accent-soft)]",
      },
      size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", icon: "h-10 w-10" },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
