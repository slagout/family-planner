import React, { useEffect, useState } from 'react';
import client from '../api/client';

type Status = 'loading' | 'linked' | 'unlinked' | 'error';

export function KrogerConnect() {
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Handle redirect back from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get('linked') === 'true') {
      setStatus('linked');
      window.history.replaceState({}, '', '/kroger');
      return;
    }
    if (params.get('error')) {
      setMessage(params.get('error') || 'Authorization failed');
      setStatus('error');
      window.history.replaceState({}, '', '/kroger');
      return;
    }

    // Check current link status via axios (JWT sent automatically)
    client
      .get<{ linked: boolean }>('/kroger/status')
      .then(({ data }) => setStatus(data.linked ? 'linked' : 'unlinked'))
      .catch(() => setStatus('unlinked'));
  }, []);

  /**
   * Fetch the Kroger OAuth URL via axios (which attaches the JWT header),
   * then redirect the browser to Kroger for the user to authorise.
   *
   * We must NOT use window.location.href directly on /api/kroger/authorize
   * because browsers do not send Authorization headers on href navigations,
   * which would cause requireAuth to return 401.
   */
  const handleConnect = async () => {
    setStatus('loading');
    try {
      const { data } = await client.get<{ url: string }>('/kroger/authorize-url');
      window.location.href = data.url;
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'Failed to start Kroger authorization. Make sure KROGER_CLIENT_ID and KROGER_REDIRECT_URI are set on the server.');
      setStatus('error');
    }
  };

  const handleDisconnect = async () => {
    setStatus('loading');
    try {
      await client.delete('/kroger/disconnect');
      setStatus('unlinked');
    } catch {
      setMessage('Failed to disconnect. Please try again.');
      setStatus('error');
    }
  };

  return (
    <div className="max-w-lg mx-auto px-4 py-10">
      <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2 flex items-center gap-3">
        <span className="text-3xl">🛒</span> Kroger Account
      </h1>
      <p className="text-neutral-500 dark:text-neutral-400 mb-8">
        Link your Kroger account to look up product nutrition, check prices,
        and add items directly to your Kroger cart.
      </p>

      {status === 'loading' && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {status === 'linked' && (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center text-green-600 dark:text-green-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">Kroger account linked</p>
              <p className="text-sm text-green-600 dark:text-green-400">Product lookup and cart features are active</p>
            </div>
          </div>
          <button
            onClick={handleDisconnect}
            className="w-full py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-lg text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            Disconnect Kroger Account
          </button>
        </div>
      )}

      {status === 'unlinked' && (
        <div className="bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-2xl shadow p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-full bg-neutral-100 dark:bg-neutral-700 flex items-center justify-center text-neutral-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-neutral-900 dark:text-neutral-100">Not connected</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Sign in with Kroger to enable grocery features</p>
            </div>
          </div>
          <button onClick={handleConnect}
            className="w-full py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium">
            Connect Kroger Account
          </button>
        </div>
      )}

      {status === 'error' && (
        <div className="bg-white dark:bg-neutral-800 border border-red-200 dark:border-red-800 rounded-2xl shadow p-6">
          <p className="text-red-600 dark:text-red-400 font-medium mb-4">⚠️ {message || 'Something went wrong'}</p>
          <button onClick={() => setStatus('unlinked')}
            className="px-4 py-2 border border-neutral-300 dark:border-neutral-600 rounded-lg text-sm text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-700">
            Try Again
          </button>
        </div>
      )}

      {/* Feature overview */}
      <div className="mt-8 grid gap-3">
        {[
          { icon: '🔍', title: 'Barcode Lookup', desc: 'Scan any UPC to auto-fill nutrition and pricing' },
          { icon: '🛒', title: 'Cart Integration', desc: 'Add ingredients directly to your Kroger cart' },
          { icon: '💰', title: 'Price Tracking', desc: 'See current store prices on inventory items' },
        ].map(({ icon, title, desc }) => (
          <div key={title} className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 border border-neutral-100 dark:border-neutral-700">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-medium text-neutral-800 dark:text-neutral-100">{title}</p>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
