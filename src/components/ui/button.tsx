import * as React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-400 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-accent-500 text-ink-950 shadow-[0_8px_24px_-10px_rgba(18,201,155,0.7)] hover:bg-accent-400 active:bg-accent-600",
        secondary:
          "border border-ink-600 bg-ink-800/70 text-fg hover:border-accent-700 hover:bg-ink-750",
        ghost: "text-fg-muted hover:bg-ink-800/70 hover:text-fg",
        outline:
          "border border-accent-700/70 text-accent-300 hover:bg-accent-900/30 hover:text-accent-200",
        gold: "bg-gold-400 text-ink-950 hover:bg-gold-300",
        danger: "bg-status-rejected/90 text-white hover:bg-status-rejected",
        link: "text-accent-300 underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px] [&_svg]:size-4",
        md: "h-11 px-5 text-sm [&_svg]:size-4",
        lg: "h-13 px-7 text-[15px] [&_svg]:size-5",
        icon: "h-10 w-10 [&_svg]:size-4",
      },
      block: {
        true: "w-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & {
  className?: string;
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    ButtonBaseProps {}

export function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, block }), className)} {...props} />
  );
}

export interface ButtonLinkProps
  extends React.ComponentPropsWithoutRef<typeof Link>,
    ButtonBaseProps {}

export function ButtonLink({ className, variant, size, block, ...props }: ButtonLinkProps) {
  return <Link className={cn(buttonVariants({ variant, size, block }), className)} {...props} />;
}
