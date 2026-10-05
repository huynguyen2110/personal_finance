'use client';

import { cn } from '@/modules/mindmap/lib/utils';
import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2 text-sm',
        variant === 'primary' &&
          'bg-gradient-to-b from-violet-500 to-violet-600 text-white shadow-sm shadow-violet-600/30 hover:from-violet-600 hover:to-violet-700 hover:shadow-md hover:shadow-violet-600/30',
        variant === 'secondary' &&
          'border border-gray-200 bg-white text-gray-700 shadow-sm hover:border-gray-300 hover:bg-gray-50',
        variant === 'ghost' && 'text-gray-600 hover:bg-gray-100',
        variant === 'danger' &&
          'bg-gradient-to-b from-red-500 to-red-600 text-white shadow-sm shadow-red-600/30 hover:from-red-600 hover:to-red-700',
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';
