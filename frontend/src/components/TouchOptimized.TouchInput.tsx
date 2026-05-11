/**
 * Touch-Optimized Input Component
 * Features: 48px minimum height, accessible labels, keyboard support, ARIA attributes
 */

import React, { forwardRef } from 'react';

interface TouchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  label?: string;
  onChange: (value: string) => void;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  required?: boolean;
}

/**
 * TouchInput component with accessibility features
 * Minimum 48px height for touch targets
 * Includes label, error state, and helper text support
 */
export const TouchInput = forwardRef<HTMLInputElement, TouchInputProps>(
  (
    {
      label,
      onChange,
      error,
      helperText,
      icon,
      required,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = props.id || `input-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            {label}
            {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            required={required}
            className={`w-full px-4 py-3 rounded-lg border-2 transition-colors text-base min-h-[48px] focus:outline-none ${
              icon ? 'pl-10' : ''
            } ${
              error
                ? 'border-red-500 focus:border-red-500 focus:ring-red-200'
                : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
            } ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'} ${className}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-red-600 text-sm mt-1" role="alert">
            {error}
          </p>
        )}

        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-gray-500 text-sm mt-1">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

TouchInput.displayName = 'TouchInput';
