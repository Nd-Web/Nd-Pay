import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        // Primary — FlowPay purple
        default:
          'bg-[#6C5CE7]/20 text-[#A29BFE] border border-[#6C5CE7]/30',
        // Success — FlowPay green
        success:
          'bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/25',
        // Warning
        warning:
          'bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25',
        // Destructive — FlowPay red
        destructive:
          'bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/25',
        // Secondary — muted
        secondary:
          'bg-white/8 text-[#6B7280] border border-white/8',
        // Transaction credit
        credit:
          'bg-[#00D68F]/15 text-[#00D68F] border border-[#00D68F]/25',
        // Transaction debit
        debit:
          'bg-[#FF6B6B]/15 text-[#FF6B6B] border border-[#FF6B6B]/25',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
