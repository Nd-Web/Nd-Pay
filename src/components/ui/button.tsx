import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  // Base — rounded-xl = 12px per spec; press-down scale; 250ms ease
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-semibold',
    'ring-offset-background transition-all duration-[250ms] ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6C5CE7]/60 focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.96]',   // press-down effect
    'select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        // Primary — FlowPay gradient (#6C5CE7 → #A29BFE)
        default:
          'bg-gradient-to-r from-[#6C5CE7] to-[#A29BFE] text-white hover:brightness-110 shadow-[0_4px_14px_rgba(108,92,231,0.40)]',
        // Destructive — FlowPay error red
        destructive:
          'bg-[#FF6B6B] text-white hover:bg-[#FF5252] shadow-[0_4px_14px_rgba(255,107,107,0.35)]',
        // Outline — glass-style
        outline:
          'border border-[var(--fp-border-mid,rgba(255,255,255,0.10))] bg-white/5 hover:bg-white/10 text-white backdrop-blur-sm',
        // Secondary — subtle surface
        secondary:
          'bg-white/8 text-white hover:bg-white/14',
        // Ghost
        ghost:
          'hover:bg-white/10 text-white',
        // Link
        link:
          'text-[#A29BFE] underline-offset-4 hover:underline hover:text-[#6C5CE7]',
        // Success — FlowPay green
        success:
          'bg-[#00D68F] text-white hover:bg-[#00C07D] shadow-[0_4px_14px_rgba(0,214,143,0.35)]',
      },
      size: {
        default: 'h-12 px-6 py-2',
        sm:      'h-9 rounded-xl px-4 text-xs',
        lg:      'h-14 rounded-2xl px-8 text-base',
        icon:    'h-10 w-10',
        'icon-sm': 'h-8 w-8 rounded-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, loading, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            {children}
          </>
        ) : children}
      </Comp>
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
