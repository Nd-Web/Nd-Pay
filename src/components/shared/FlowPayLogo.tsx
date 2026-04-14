import { cn } from '@/lib/utils';

interface FlowPayLogoProps {
  /** Visual size of the wordmark */
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Show the Zap icon beside the wordmark */
  showIcon?: boolean;
  className?: string;
}

const textSizes = {
  sm: 'text-xl',
  md: 'text-2xl',
  lg: 'text-3xl',
  xl: 'text-4xl',
};

const iconSizes = {
  sm: 'w-7 h-7',
  md: 'w-9 h-9',
  lg: 'w-11 h-11',
  xl: 'w-14 h-14',
};

/**
 * FlowPay wordmark.
 * "Flow" renders in the brand gradient (#6C5CE7 → #A29BFE).
 * "Pay" renders in the current foreground colour (adapts light/dark).
 */
export function FlowPayLogo({ size = 'md', showIcon = false, className }: FlowPayLogoProps) {
  return (
    <span className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      {showIcon && (
        <span
          className={cn(
            'rounded-2xl flex items-center justify-center shadow-[0_4px_14px_rgba(108,92,231,0.45)]',
            iconSizes[size]
          )}
          style={{ background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)' }}
          aria-hidden="true"
        >
          {/* Lightning bolt — inline SVG so no external import needed */}
          <svg
            viewBox="0 0 24 24"
            fill="white"
            className={size === 'sm' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-4.5 h-4.5' : 'w-6 h-6'}
            aria-hidden="true"
          >
            <path d="M13 2L4.09 12.96A1 1 0 005 14.5h5.5l-1 7.5 8.91-10.96A1 1 0 0018 9.5h-5.5l.5-7.5z" />
          </svg>
        </span>
      )}

      <span className={cn('font-bold tracking-tight leading-none', textSizes[size])}>
        {/* "Flow" — brand gradient */}
        <span
          style={{
            background: 'linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Flow
        </span>
        {/* "Pay" — foreground colour (adapts to theme) */}
        <span className="text-[var(--foreground,#fff)]">Pay</span>
      </span>
    </span>
  );
}
