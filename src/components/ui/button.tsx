import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "nc-touch inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-[background-color,box-shadow,transform,border-color] duration-150 select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground shadow-[0_1px_2px_rgb(32_43_80/0.25)] hover:bg-[color-mix(in_oklab,var(--primary)_86%,white)]",
        accent: "bg-accent text-accent-foreground shadow-[0_1px_2px_rgb(120_30_30/0.3)] hover:bg-[color-mix(in_oklab,var(--accent)_88%,black)]",
        secondary: "bg-muted text-foreground border border-border-soft hover:bg-[color-mix(in_oklab,var(--muted),var(--foreground)_8%)]",
        outline: "border border-border bg-card hover:border-[color-mix(in_oklab,var(--gold)_75%,var(--border))] hover:bg-muted",
        ghost: "bg-transparent hover:bg-muted",
        danger: "bg-danger text-white hover:opacity-90",
        link: "bg-transparent text-primary underline-offset-4 hover:underline px-0",
      },
      size: {
        sm: "h-8 px-3",
        md: "h-10 px-4",
        lg: "h-12 px-7 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});

export function ButtonLink({
  className,
  variant,
  size,
  href,
  ...props
}: Omit<React.ComponentProps<typeof Link>, "href"> & VariantProps<typeof buttonVariants> & { href: string }) {
  return <Link href={href} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
