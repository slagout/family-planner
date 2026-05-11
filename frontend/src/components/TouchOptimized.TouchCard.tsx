/**
 * Touch-Optimized Card Component
 * Features: Accessible container, touch targets, keyboard support, ARIA attributes
 */

import React, { forwardRef } from 'react';

interface TouchCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  hoverable?: boolean;
  clickable?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

/**
 * TouchCard component for touch-optimized containers
 * Provides accessible, semantically correct card layout
 * Supports both visual and keyboard interaction
 */
export const TouchCard = forwardRef<HTMLDivElement, TouchCardProps>(
  (
    {
      children,
      hoverable = true,
      clickable = false,
      onKeyDown,
      className = '',
      onClick,
      role,
      tabIndex,
      ...props
    },
    ref
  ) => {
    const baseClasses =
      'p-4 rounded-lg border border-gray-200 bg-white shadow transition-all duration-200';

    const interactiveClasses = clickable
      ? 'active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
      : '';

    const hoverClasses = hoverable && clickable ? 'hover:shadow-lg cursor-pointer' : '';

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (clickable && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        onClick?.(e as any);
      }
      onKeyDown?.(e);
    };

    return (
      <div
        ref={ref}
        onClick={onClick}
        onKeyDown={handleKeyDown}
        role={clickable ? role || 'button' : role}
        tabIndex={clickable ? tabIndex ?? 0 : tabIndex}
        className={`${baseClasses} ${interactiveClasses} ${hoverClasses} ${className}`}
        aria-pressed={clickable ? false : undefined}
        {...props}
      >
        {children}
      </div>
    );
  }
);

TouchCard.displayName = 'TouchCard';
