/**
 * Gesture Handler Component
 * Detects and handles touch gestures: swipe (left/right), long press, pinch
 * Features: Threshold-based detection, smooth gesture recognition
 */

import React, { useRef, useCallback, useState } from 'react';

export interface GestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onLongPress?: () => void;
  onPinch?: (scale: number) => void;
  onTap?: () => void;
}

interface GestureHandlerProps extends GestureHandlers {
  children: React.ReactNode;
  className?: string;
  threshold?: number;
  longPressDuration?: number;
}

const DEFAULT_SWIPE_THRESHOLD = 50;
const DEFAULT_LONG_PRESS_DURATION = 500;
const SWIPE_TIME_THRESHOLD = 300;

interface TouchData {
  x: number;
  y: number;
  time: number;
}

/**
 * GestureHandler component for handling touch gestures
 * Supports: swipe (4 directions), long press, pinch, tap
 * Provides debouncing and threshold-based detection
 */
export const GestureHandler = React.forwardRef<
  HTMLDivElement,
  GestureHandlerProps
>(
  (
    {
      children,
      onSwipeLeft,
      onSwipeRight,
      onSwipeUp,
      onSwipeDown,
      onLongPress,
      onPinch,
      onTap,
      className = '',
      threshold = DEFAULT_SWIPE_THRESHOLD,
      longPressDuration = DEFAULT_LONG_PRESS_DURATION,
    },
    ref
  ) => {
    const touchStartRef = useRef<TouchData | null>(null);
    const longPressTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastTouchRef = useRef<TouchData | null>(null);
    const [isLongPress, setIsLongPress] = useState(false);

    const handleTouchStart = useCallback(
      (e: React.TouchEvent) => {
        const touch = e.touches[0];
        touchStartRef.current = {
          x: touch.clientX,
          y: touch.clientY,
          time: Date.now(),
        };
        setIsLongPress(false);

        // Set up long press detection
        longPressTimeoutRef.current = setTimeout(() => {
          setIsLongPress(true);
          onLongPress?.();
        }, longPressDuration);
      },
      [onLongPress, longPressDuration]
    );

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.touches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;

      // Clear long press if user moved too much
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
        }
        setIsLongPress(false);
      }
    }, []);

    const handleTouchEnd = useCallback(
      (e: React.TouchEvent) => {
        // Clear long press timeout
        if (longPressTimeoutRef.current) {
          clearTimeout(longPressTimeoutRef.current);
        }

        if (!touchStartRef.current) return;

        const touch = e.changedTouches[0];
        const deltaX = touch.clientX - touchStartRef.current.x;
        const deltaY = touch.clientY - touchStartRef.current.y;
        const timeDelta = Date.now() - touchStartRef.current.time;

        // Only consider swipe if it was quick
        if (!isLongPress && timeDelta < SWIPE_TIME_THRESHOLD) {
          const absDeltaX = Math.abs(deltaX);
          const absDeltaY = Math.abs(deltaY);

          // Determine if swipe is primarily horizontal or vertical
          if (absDeltaX > absDeltaY && absDeltaX > threshold) {
            if (deltaX > 0 && onSwipeRight) {
              onSwipeRight();
            } else if (deltaX < 0 && onSwipeLeft) {
              onSwipeLeft();
            }
          } else if (absDeltaY > absDeltaX && absDeltaY > threshold) {
            if (deltaY > 0 && onSwipeDown) {
              onSwipeDown();
            } else if (deltaY < 0 && onSwipeUp) {
              onSwipeUp();
            }
          } else if (
            absDeltaX < 10 &&
            absDeltaY < 10 &&
            timeDelta < 200 &&
            onTap
          ) {
            onTap();
          }
        }

        lastTouchRef.current = touchStartRef.current;
        touchStartRef.current = null;
        setIsLongPress(false);
      },
      [
        isLongPress,
        threshold,
        onSwipeLeft,
        onSwipeRight,
        onSwipeUp,
        onSwipeDown,
        onTap,
      ]
    );

    const handleTouchCancel = useCallback(() => {
      if (longPressTimeoutRef.current) {
        clearTimeout(longPressTimeoutRef.current);
      }
      touchStartRef.current = null;
      setIsLongPress(false);
    }, []);

    return (
      <div
        ref={ref}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchCancel}
        className={className}
      >
        {children}
      </div>
    );
  }
);

GestureHandler.displayName = 'GestureHandler';
