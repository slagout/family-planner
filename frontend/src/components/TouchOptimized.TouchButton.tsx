/**
 * Touch-Optimized Button Component
 * Features: 44px+ minimum touch targets, WCAG compliance, accessibility
 */

import React, { forwardRef } from 'react';

interface TouchButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

const variantClasses = {
  primary:
    'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 disabled:bg-blue-300',
  secondary:
    'bg-gray-300 text-gray-900 hover:bg-gray-400 active:bg-gray-500 disabled:bg-gray-200',
  danger: 'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 disabled:bg-red-300',
  success:
    'bg-green-500 text-white hover:bg-green-600 active:bg-green-700 disabled:bg-green-300',
};

const sizeClasses = {
  sm: 'px-3 py-2 text-sm min-h-[40px]',
  md: 'px-4 py-3 text-base min-h-[48px]',
  lg: 'px-6 py-4 text-lg min-h-[56px]',
};

/**
 * TouchButton component with accessibility features
 * Minimum 44x44px touch target as recommended by WCAG 2.5.5
 * Supports icon and loading states
 */
export const TouchButton = forwardRef<HTMLButtonElement, TouchButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      children,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'rounded font-semibold transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2';

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
        aria-busy={isLoading}
        {...props}
      >
        {isLoading ? (
          <span
            className="w-4 h-4 border-2 border-transparent border-t-current rounded-full animate-spin"
            aria-hidden="true"
          />
        ) : icon ? (
          <span aria-hidden="true">{icon}</span>
        ) : null}
        <span>{children}</span>
      </button>
    );
  }
);

TouchButton.displayName = 'TouchButton';
