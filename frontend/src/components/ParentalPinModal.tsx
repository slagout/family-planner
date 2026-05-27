import React, { useState, useEffect, useCallback } from 'react';
import client from '../api/client';

interface ParentalPinModalProps {
  onUnlocked: (token: string) => void;
  onCancel?: () => void;
}

const TOKEN_STORAGE_KEY = 'pin_session_token';
const EXPIRY_STORAGE_KEY = 'pin_session_expiry';
const SESSION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

/** Returns the stored token if it's still valid, otherwise null. */
export function getStoredPinToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = sessionStorage.getItem(EXPIRY_STORAGE_KEY);
    if (!token || !expiry) return null;
    if (Date.now() > parseInt(expiry, 10)) {
      clearPinSession();
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function clearPinSession(): void {
  sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  sessionStorage.removeItem(EXPIRY_STORAGE_KEY);
}

function storePinSession(token: string): void {
  sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
  sessionStorage.setItem(EXPIRY_STORAGE_KEY, String(Date.now() + SESSION_DURATION_MS));
}

/**
 * Full-screen parental PIN overlay with a touch-optimised 4-digit keypad.
 * Automatically dismisses if a valid token exists in sessionStorage.
 */
export function ParentalPinModal({ onUnlocked, onCancel }: ParentalPinModalProps) {
  const [digits, setDigits] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if already unlocked on mount
  useEffect(() => {
    const stored = getStoredPinToken();
    if (stored) onUnlocked(stored);
  }, [onUnlocked]);

  // Auto-submit when 4 digits entered
  useEffect(() => {
    if (digits.length === 4) {
      submitPin(digits.join(''));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [digits]);

  const submitPin = useCallback(async (pin: string) => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await client.post('/pin/verify', { pin });
      storePinSession(data.token);
      onUnlocked(data.token);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Incorrect PIN. Please try again.');
      setDigits([]);
    } finally {
      setLoading(false);
    }
  }, [onUnlocked]);

  const handleKey = (key: string) => {
    if (loading) return;
    if (key === 'DEL') {
      setDigits((d) => d.slice(0, -1));
      setError(null);
    } else if (digits.length < 4) {
      setDigits((d) => [...d, key]);
    }
  };

  const keys = ['1','2','3','4','5','6','7','8','9','DEL','0','OK'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-sm mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🔐</div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Parent PIN Required</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Enter your 4-digit parental PIN to continue
          </p>
        </div>

        {/* PIN dot indicators */}
        <div className="flex justify-center gap-4 mb-6">
          {[0,1,2,3].map((i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-colors ${
                i < digits.length
                  ? 'bg-primary-500 border-primary-500'
                  : 'bg-transparent border-gray-300 dark:border-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 px-4 py-2 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded-lg text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3">
          {keys.map((key) => {
            if (key === 'OK') return <div key="ok" />;
            const isDel = key === 'DEL';
            return (
              <button
                key={key}
                onClick={() => handleKey(key)}
                disabled={loading}
                aria-label={isDel ? 'Delete' : key}
                className={`h-14 rounded-xl font-semibold text-lg transition-all select-none
                  ${isDel
                    ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                  disabled:opacity-50 active:scale-95`}
              >
                {isDel ? '⌫' : key}
              </button>
            );
          })}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-4 text-center text-gray-500 text-sm animate-pulse">
            Verifying…
          </div>
        )}

        {/* Cancel button */}
        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-5 w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

/** Higher-order hook: returns the PIN token, showing the modal if needed. */
export function usePinGate() {
  const [token, setToken] = useState<string | null>(getStoredPinToken);
  const [showModal, setShowModal] = useState(false);

  const requirePin = useCallback(() => {
    const stored = getStoredPinToken();
    if (stored) {
      setToken(stored);
      return true;
    }
    setShowModal(true);
    return false;
  }, []);

  const handleUnlocked = useCallback((t: string) => {
    setToken(t);
    setShowModal(false);
  }, []);

  const lock = useCallback(() => {
    clearPinSession();
    setToken(null);
    // Optionally call DELETE /api/pin/session in background
    client.delete('/pin/session').catch(() => {});
  }, []);

  return { token, showModal, requirePin, handleUnlocked, lock };
}
