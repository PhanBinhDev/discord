import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  "cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none",
  {
    variants: {
      variant: {
        default:
          'bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] shadow-sm',
        destructive:
          'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
        danger: 'text-red-600 hover:bg-red-600/10 active:bg-red-600/20',
        outline:
          'border border-input bg-muted/50 shadow-xs hover:bg-muted hover:text-foreground',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-[var(--accent-color)] underline-offset-4 hover:underline hover:text-[var(--accent-hover)]',
        board:
          'hover:bg-[var(--accent-color)]/5 hover:text-[var(--accent-color)] hover:shadow-sm transition-all duration-200 border border-transparent hover:border-[var(--accent-color)]/20',
        boardActive:
          'bg-[var(--accent-color)]/10 text-[var(--accent-color)] border border-[var(--accent-color)]/20',
        gradient:
          'bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white shadow-md hover:shadow-lg transition-all',
      },
      size: {
        default: 'h-9 px-4 py-2 has-[>svg]:px-3',
        sm: 'h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-6 has-[>svg]:px-4',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  children,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  }) {
  const Comp = asChild ? Slot : 'button';

  if (asChild) {
    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </Comp>
    );
  }

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      disabled={loading || props.disabled}
    >
      {loading && <Loader className="animate-spin mr-1" />}
      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
