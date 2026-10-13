import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva("inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:pointer-events-none disabled:opacity-50", { variants: { variant: { default: "bg-violet-600 text-white shadow-lg shadow-violet-500/25 hover:-translate-y-0.5 hover:bg-violet-700", secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200", ghost: "text-slate-500 hover:bg-slate-100 hover:text-slate-900", outline: "border border-slate-200 bg-white text-slate-700 hover:border-violet-200 hover:bg-violet-50" }, size: { default: "h-10 px-4", sm: "h-8 px-3 text-xs", icon: "h-10 w-10" } }, defaultVariants: { variant: "default", size: "default" } });

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}
export function Button({ className, variant, size, ...props }: ButtonProps) { return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />; }
