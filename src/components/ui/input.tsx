import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-[var(--foreground,#fff)]/70"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            id={inputId}
            type={type}
            className={cn(
              'flex h-12 w-full rounded-xl px-4 py-3 text-sm',
              'bg-[var(--fp-card,#12121A)] border border-[var(--fp-border,rgba(255,255,255,0.06))]',
              'text-[var(--foreground,#fff)] placeholder:text-[#6B7280]',
              'backdrop-blur-sm',
              'transition-all duration-[250ms]',
              'focus:outline-none focus:ring-2 focus:ring-[#6C5CE7]/50 focus:border-[#6C5CE7]/60',
              'disabled:cursor-not-allowed disabled:opacity-50',
              leftIcon  && 'pl-10',
              rightIcon && 'pr-10',
              error && 'border-[#FF6B6B]/50 focus:ring-[#FF6B6B]/30 focus:border-[#FF6B6B]/50',
              className
            )}
            ref={ref}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]">
              {rightIcon}
            </div>
          )}
        </div>
        {error && (
          <p className="text-xs text-[#FF6B6B] flex items-center gap-1">
            <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-xs text-[#6B7280]">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

export { Input };
